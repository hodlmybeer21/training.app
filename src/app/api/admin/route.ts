import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';

function createSbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  try {
    const serverSb = await createServerClient();
    const { data: { user } } = await serverSb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sbAdmin = createSbAdmin();
    const { data: profile } = await sbAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const { data: allProfiles } = await sbAdmin
      .from('profiles')
      .select('*, teams(name)')
      .order('created_at', { ascending: false });

    return NextResponse.json({ profiles: allProfiles || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const serverSb = await createServerClient();
    const { data: { user: adminUser } } = await serverSb.auth.getUser();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sbAdmin = createSbAdmin();
    const { data: adminProfile } = await sbAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (!adminProfile || (adminProfile as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

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

      const { data: profile, error: profileErr } = await sbAdmin
        .from('profiles')
        .update({ role: 'manager', team_id: team.id })
        .eq('id', authUser.user.id)
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
        .select('team_id')
        .eq('id', managerId)
        .single();
      if (!manager) return NextResponse.json({ error: 'Manager not found' }, { status: 404 });

      const { data: authUser, error: authErr } = await sbAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

      const { data: profile, error: profileErr } = await sbAdmin
        .from('profiles')
        .update({ role: 'rep', team_id: manager.team_id, manager_id: managerId })
        .eq('id', authUser.user.id)
        .select()
        .single();
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

      return NextResponse.json({ user: profile }, { status: 201 });
    }

    // ─── UPDATE USER ROLE ────────────────────────────────────────────
    if (action === 'update-role') {
      const { userId, role: newRole } = body;
      if (!userId || !newRole) return NextResponse.json({ error: 'userId and role required' }, { status: 400 });

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
