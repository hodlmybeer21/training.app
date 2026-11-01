import { NextRequest, NextResponse } from 'next/server';
import { getCaller, isManager, type Caller } from '@/lib/server/caller';
import { checkSeatAvailable } from '@/lib/server/seats';
import { createInvitedUser, findUserByEmail, sendInviteEmail } from '@/lib/server/invites';
import { rateLimitAll } from '@/lib/server/rate-limit';
import { teamCategory } from '@/lib/server/teams';

// Manager-side team membership. A manager (or admin) on a team can see its seats,
// invite a new rep by email (same invite / set-password flow the admin console uses),
// and take a rep off the team. Seat limits come from the paid plan (seats.ts).
// The set-password link goes only to the invited person's email; it is never
// returned to the manager.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR = 60 * 60_000;

type Member = { id: string; display_name: string | null; role: string | null; manager_id: string | null };

async function managerOnTeam(): Promise<{ caller: Caller; teamId: string } | NextResponse> {
  const caller = await getCaller();
  if (caller instanceof NextResponse) return caller;
  if (!isManager(caller.profile)) return NextResponse.json({ error: 'Managers only' }, { status: 403 });
  const teamId = caller.profile?.team_id;
  if (!teamId) {
    return NextResponse.json({ error: 'You are not on a team yet. Contact us to set one up.', code: 'no_team' }, { status: 400 });
  }
  return { caller, teamId };
}

export async function GET() {
  try {
    const ctx = await managerOnTeam();
    if (ctx instanceof NextResponse) return ctx;
    const { caller, teamId } = ctx;
    const { data: team } = await caller.sb.from('teams').select('id, name, category').eq('id', teamId).maybeSingle();
    const { data: rows, error } = await caller.sb
      .from('profiles')
      .select('id, display_name, role, manager_id')
      .eq('team_id', teamId);
    if (error) throw new Error('Could not load team members');
    const seats = await checkSeatAvailable(caller.sb, { id: caller.user.id, team_id: teamId });
    const members = ((rows || []) as Member[]).map((m) => ({
      id: m.id,
      display_name: m.display_name,
      role: m.role,
      you: m.id === caller.user.id,
    }));
    return NextResponse.json({
      team: team || { id: teamId, name: 'Your team' },
      seats: { used: seats.used, limit: seats.limit, tier: seats.tier, available: seats.ok },
      members,
    });
  } catch (e: unknown) {
    console.error('team members GET error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await managerOnTeam();
    if (ctx instanceof NextResponse) return ctx;
    const { caller, teamId } = ctx;

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    const displayName = typeof body?.displayName === 'string' && body.displayName.trim()
      ? body.displayName.trim().slice(0, 80)
      : email.split('@')[0];

    const rl = rateLimitAll(`team-invite:${caller.user.id}`, [
      { limit: 10, windowMs: HOUR },
      { limit: 30, windowMs: 24 * HOUR },
    ]);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many invites. Try again later.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } });
    }

    const seats = await checkSeatAvailable(caller.sb, { id: caller.user.id, team_id: teamId });
    if (!seats.ok) {
      return NextResponse.json({ error: seats.error, code: 'seat_limit_reached', used: seats.used, limit: seats.limit }, { status: 403 });
    }

    if (await findUserByEmail(caller.sb, email)) {
      return NextResponse.json(
        { error: 'That email already has a TrainField login. Contact us and we will move them onto your team.', code: 'already_registered' },
        { status: 409 },
      );
    }

    const { data: team } = await caller.sb.from('teams').select('id, name, category').eq('id', teamId).maybeSingle();
    const t = (team || {}) as { name?: string; category?: string };

    let invited;
    try {
      invited = await createInvitedUser(caller.sb, email);
    } catch (err) {
      console.error('team invite failed', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Could not create the invite. Check the email and try again.' }, { status: 400 });
    }

    const { error: profileErr } = await caller.sb.from('profiles').upsert({
      id: invited.user.id,
      display_name: displayName,
      role: 'rep',
      team_id: teamId,
      manager_id: caller.user.id,
      category: teamCategory(t.category),
    });
    if (profileErr) {
      console.error('team invite profile failed', profileErr.message);
      return NextResponse.json({ error: 'The login was created but could not be added to your team. Contact us.' }, { status: 500 });
    }

    const emailed = await sendInviteEmail(
      email,
      invited.link,
      `You've been added to ${t.name ? `the team "${t.name}"` : 'a team'} on TrainField AI as a rep (${email}).`,
    );
    return NextResponse.json(
      { member: { id: invited.user.id, display_name: displayName, role: 'rep' }, emailed },
      { status: 201 },
    );
  } catch (e: unknown) {
    console.error('team members POST error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/team/members?id=<rep id>: takes a rep off the team. The login and history stay. */
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await managerOnTeam();
    if (ctx instanceof NextResponse) return ctx;
    const { caller, teamId } = ctx;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (id === caller.user.id) return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 });

    const { data: member } = await caller.sb.from('profiles').select('id, role, team_id').eq('id', id).maybeSingle();
    const m = member as { id: string; role: string | null; team_id: string | null } | null;
    if (!m || m.team_id !== teamId) return NextResponse.json({ error: 'Not on your team' }, { status: 404 });
    if (m.role !== 'rep') return NextResponse.json({ error: 'Only reps can be removed here. Contact us to change a manager.' }, { status: 403 });

    const { error } = await caller.sb.from('profiles').update({ team_id: null, manager_id: null }).eq('id', id).eq('team_id', teamId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('team members DELETE error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
