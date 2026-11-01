import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { isAdminEmail } from '@/lib/admin';
import { createAdminClient as createSbAdmin } from '@/lib/server/supabase-admin';
import { checkSeatAvailable } from '@/lib/server/seats';
import { createInvitedUser, sendInviteEmail } from '@/lib/server/invites';
import { VALID_ROLES, DEFAULT_SEAT_LIMIT } from '@/lib/tiers';
import { createTeam, teamCategory as validTeamCategory } from '@/lib/server/teams';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Map of auth user id → email. profiles has no email column, so the Users table reads it from auth. */
async function authEmails(sb: SupabaseClient): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const perPage = 1000;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) break;
    const users = data?.users ?? [];
    for (const u of users) if (u.email) out[u.id] = u.email;
    if (users.length < perPage) break;
  }
  return out;
}

const ALLOWED_ROLES: readonly string[] = VALID_ROLES;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin actions are allowed only for emails listed in the ADMIN_EMAILS env var.
// New managers and reps are created through Supabase's invite flow: the admin never
// sets or sees a password. The response carries the one-time set-password link so
// the admin can pass it on if the email does not arrive.

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }
    const sbAdmin = createSbAdmin();

    // Get team names separately (no FK relationship in DB)
    const { data: allTeams } = await sbAdmin.from('teams').select('id, name, category');
    const teamMap: Record<string, string> = {};
    (allTeams || []).forEach(t => { teamMap[t.id] = t.name; });

    const { data: allProfiles } = await sbAdmin
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    const emails = await authEmails(sbAdmin);
    const profilesWithTeams = (allProfiles || []).map((p: any) => ({
      ...p,
      email: p.email || emails[p.id] || null,
      teams: p.team_id ? { name: teamMap[p.team_id] || p.team_id } : null,
    }));

    const teams = (allTeams || []).map((t: { id: string; name: string; category?: string | null }) => ({ id: t.id, name: t.name, category: t.category ?? null }));
    return NextResponse.json({ profiles: profilesWithTeams, teams });
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
    const { action, teamName, managerId, teamCategory } = body;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    // ─── CREATE MANAGER ───────────────────────────────────────────────
    if (action === 'create-manager') {
      if (!EMAIL_RE.test(email) || !teamName) {
        return NextResponse.json({ error: 'email and teamName required' }, { status: 400 });
      }
      // Only known categories; anything else falls back to Beer Distribution.
      const category = validTeamCategory(teamCategory);
      let invited;
      try {
        invited = await createInvitedUser(sbAdmin, email);
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Invite failed' }, { status: 400 });
      }
      const authUser = { user: invited.user };

      const { data: team, error: teamErr } = await sbAdmin
        .from('teams')
        .insert({ name: String(teamName).trim().slice(0, 100), category })
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
          category,
        })
        .select()
        .single();
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

      const emailed = await sendInviteEmail(email, invited.link, `A TrainField AI manager account has been created for ${email} (team: ${teamName}).`);
      return NextResponse.json({ user: profile, team, inviteLink: invited.link, emailed }, { status: 201 });
    }

    // ─── CREATE REP ──────────────────────────────────────────────────
    if (action === 'create-rep') {
      if (!EMAIL_RE.test(email) || !managerId) {
        return NextResponse.json({ error: 'email and managerId required' }, { status: 400 });
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

      // The rep practices in their team's category (not always Beer Distribution).
      let repCategory = validTeamCategory(null);
      if (manager.team_id) {
        const { data: team } = await sbAdmin.from('teams').select('category').eq('id', manager.team_id).maybeSingle();
        repCategory = validTeamCategory((team as { category?: string } | null)?.category);
      }

      let invited;
      try {
        invited = await createInvitedUser(sbAdmin, email);
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Invite failed' }, { status: 400 });
      }
      const authUser = { user: invited.user };

      // Use upsert so profile is created if auth user was just created
      const { data: profile, error: profileErr } = await sbAdmin
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          display_name: email.split('@')[0],
          role: 'rep',
          team_id: manager.team_id,
          manager_id: managerId,
          category: repCategory,
        })
        .select()
        .single();
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

      const emailed = await sendInviteEmail(email, invited.link, `A TrainField AI rep account has been created for ${email}.`);
      return NextResponse.json({ user: profile, inviteLink: invited.link, emailed }, { status: 201 });
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

    // ─── ASSIGN USER TO A TEAM ───────────────────────────────────────
    // { userId, teamId } moves an existing user onto a team (within its seat limit);
    // { userId, teamId: null } takes them off; { userId, newTeamName, newTeamCategory }
    // creates a team and puts them on it. Reps report to the team's manager.
    if (action === 'assign-team') {
      const { userId } = body;
      if (typeof userId !== 'string' || !userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
      const { data: target } = await sbAdmin.from('profiles').select('id, role, team_id').eq('id', userId).maybeSingle();
      if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      let teamId: string | null = typeof body.teamId === 'string' && body.teamId ? body.teamId : null;
      const newTeamName = typeof body.newTeamName === 'string' ? body.newTeamName.trim() : '';
      if (newTeamName) {
        teamId = await createTeam(sbAdmin, newTeamName, body.newTeamCategory);
      } else if (teamId) {
        const { data: team } = await sbAdmin.from('teams').select('id').eq('id', teamId).maybeSingle();
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      // A user moved onto a team practices in that team's category.
      let category: string | undefined;
      if (teamId) {
        const { data: t } = await sbAdmin.from('teams').select('category').eq('id', teamId).maybeSingle();
        category = validTeamCategory((t as { category?: string } | null)?.category);
      }

      let managerId: string | null = null;
      if (teamId && target.team_id !== teamId) {
        const { data: onTeam } = await sbAdmin.from('profiles').select('id, role').eq('team_id', teamId);
        const members = (onTeam || []) as { id: string; role: string | null }[];
        const lead = members.find((m) => m.role === 'manager') || members.find((m) => m.role === 'admin');
        if (lead) {
          const seats = await checkSeatAvailable(sbAdmin, { id: lead.id, team_id: teamId });
          if (!seats.ok) {
            return NextResponse.json({ error: seats.error, code: 'seat_limit_reached', used: seats.used, limit: seats.limit }, { status: 403 });
          }
        } else if (members.length >= DEFAULT_SEAT_LIMIT) {
          return NextResponse.json({ error: `This team already has ${members.length} people (limit ${DEFAULT_SEAT_LIMIT} with no paid plan on record).`, code: 'seat_limit_reached' }, { status: 403 });
        }
        if (target.role === 'rep' && lead) managerId = lead.id;
      } else if (teamId && target.team_id === teamId && target.role === 'rep') {
        const { data: lead } = await sbAdmin.from('profiles').select('id').eq('team_id', teamId).eq('role', 'manager').limit(1).maybeSingle();
        managerId = (lead as { id?: string } | null)?.id ?? null;
      }

      const { data, error } = await sbAdmin
        .from('profiles')
        .update({ team_id: teamId, manager_id: managerId, ...(category ? { category } : {}) })
        .eq('id', userId)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data, teamId });
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
