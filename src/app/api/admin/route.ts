import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { isAdminEmail } from '@/lib/admin';
import { createAdminClient as createSbAdmin } from '@/lib/server/supabase-admin';
import { checkSeatAvailable } from '@/lib/server/seats';

const ALLOWED_ROLES = ['rep', 'manager', 'admin'];

// Admin actions are allowed only for emails listed in the ADMIN_EMAILS env var.
// profiles.role is not trusted here, because the profiles RLS policy lets a user
// update their own row.

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    const sbAdmin = createSbAdmin();

    // Get team names separately (no FK relationship in DB)
    const { data: allTeams } = await sbAdmin.from('teams').select('id, name');
    const teamMap: Record<string, string> = {};
    (allTeams || []).forEach(t => { teamMap[t.id] = t.name; });

    const { data: allProfiles } = await sbAdmin
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    const profilesWithTeams = (allProfiles || []).map((p: any) => ({
      ...p,
      teams: p.team_id ? { name: teamMap[p.team_id] || p.team_id } : null,
    }));

    return NextResponse.json({ profiles: profilesWithTeams });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await getSessionUser();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminEmail(adminUser.email)) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    const sbAdmin = createSbAdmin();

    const body = await req.json();
    const { action, email, password, role, teamName, managerId, teamCategory } = body;

    // ─── CREATE MANAGER ───────────────────────────────────────────────
    if (action === 'create-manager') {
      if (!email || !password || !teamName) {
        return NextResponse.json({ error: 'email, password, teamName required' }, { status: 400 });
      }
      const { data: authUser, error: authErr } = await sbAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

      const { data: team, error: teamErr } = await sbAdmin
        .from('teams')
        .insert({ name: teamName, category: teamCategory || 'beer-distribution' })
        .select()
        .single();
      if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 500 });

      // Use upsert to handle both new profile creation and updates
      const { data: profile, error: profileErr } = await sbAdmin
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          display_name: email.split('@')[0],
          role: 'manager',
          team_id: team.id,
          category: teamCategory || 'beer-distribution',
        })
        .select()
        .single();
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

      return NextResponse.json({ user: profile, team }, { status: 201 });
    }

    // ─── CREATE REP ──────────────────────────────────────────────────
    if (action === 'create-rep') {
      if (!email || !password || !managerId) {
        return NextResponse.json({ error: 'email, password, managerId required' }, { status: 400 });
      }
      const { data: manager } = await sbAdmin
        .from('profiles')
        .select('id, role, team_id')
        .eq('id', managerId)
        .single();
      if (!manager) return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
      if (manager.role !== 'manager' && manager.role !== 'admin') {
        return NextResponse.json({ error: 'managerId must belong to a manager' }, { status: 400 });
      }

      // Enforce the team's plan seat limit before creating the login.
      const seats = await checkSeatAvailable(sbAdmin, { id: manager.id, team_id: manager.team_id ?? null });
      if (!seats.ok) {
        return NextResponse.json(
          { error: seats.error, code: 'seat_limit_reached', used: seats.used, limit: seats.limit },
          { status: 403 },
        );
      }

      const { data: authUser, error: authErr } = await sbAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

      // Use upsert so profile is created if auth user was just created
      const { data: profile, error: profileErr } = await sbAdmin
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          display_name: email.split('@')[0],
          role: 'rep',
          team_id: manager.team_id,
          manager_id: managerId,
          category: 'beer-distribution',
        })
        .select()
        .single();
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

      return NextResponse.json({ user: profile }, { status: 201 });
    }

    // ─── UPDATE USER ROLE ────────────────────────────────────────────
    if (action === 'update-role') {
      const { userId, role: newRole } = body;
      if (!userId || !newRole) return NextResponse.json({ error: 'userId and role required' }, { status: 400 });
      if (!ALLOWED_ROLES.includes(newRole)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

      const { data, error } = await sbAdmin
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();
      if (error) return NextResponse.json({ error }, { status: 500 });

      return NextResponse.json({ data });
    }

    // ─── DELETE USER ────────────────────────────────────────────────
    if (action === 'delete-user') {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

      await sbAdmin.from('sessions').delete().eq('user_id', userId);
      await sbAdmin.from('profiles').delete().eq('id', userId);
      await sbAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
