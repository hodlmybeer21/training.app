import type { SupabaseClient } from '@supabase/supabase-js';
import { seatLimitFor, isPaidTier, TIER_DISPLAY, DEFAULT_SEAT_LIMIT, type PaidTier } from '@/lib/tiers';

export type SeatCheck =
  | { ok: true; used: number; limit: number; tier: PaidTier | null }
  | { ok: false; used: number; limit: number; tier: PaidTier | null; error: string };

type MemberRow = { id: string; role: string | null };

/**
 * Checks whether one more person can be added to a manager's team.
 *
 * Seats = every profile on the team (managers and reps). When the manager has
 * no team_id, the group is the manager plus profiles whose manager_id points at them.
 *
 * The plan comes from the paying manager's auth app_metadata.tier, which only the
 * service role can write (set by the Stripe webhook). user_metadata is ignored
 * because users can edit it themselves. If no manager on the team has a paid tier
 * on record (for example a team an admin set up by hand), DEFAULT_SEAT_LIMIT applies.
 */
export async function checkSeatAvailable(
  sb: SupabaseClient,
  manager: { id: string; team_id: string | null },
): Promise<SeatCheck> {
  let members: MemberRow[] = [];
  if (manager.team_id) {
    const { data, error } = await sb.from('profiles').select('id, role').eq('team_id', manager.team_id);
    if (error) throw new Error('Could not load team members');
    members = (data || []) as MemberRow[];
  } else {
    const { data, error } = await sb.from('profiles').select('id, role').eq('manager_id', manager.id);
    if (error) throw new Error('Could not load team members');
    members = [{ id: manager.id, role: 'manager' }, ...((data || []) as MemberRow[]).filter((m) => m.id !== manager.id)];
  }
  if (!members.some((m) => m.id === manager.id)) members.push({ id: manager.id, role: 'manager' });

  const managerIds = members.filter((m) => m.id === manager.id || m.role === 'manager').map((m) => m.id);
  let tier: PaidTier | null = null;
  let limit: number | null = null;
  for (const id of managerIds) {
    const { data } = await sb.auth.admin.getUserById(id);
    const t = data?.user?.app_metadata?.tier;
    const l = seatLimitFor(t);
    if (isPaidTier(t) && l !== null && (limit === null || l > limit)) {
      tier = t;
      limit = l;
    }
  }

  const used = members.length;
  if (limit === null || tier === null) {
    tier = null;
    limit = DEFAULT_SEAT_LIMIT;
  }
  if (used >= limit) {
    const plan = tier ? `the ${TIER_DISPLAY[tier]} plan` : 'the default limit (no paid plan on record)';
    return {
      ok: false,
      used,
      limit,
      tier,
      error: `This team is using ${used} of ${limit} seats on ${plan}. Remove someone or upgrade the plan to add another person.`,
    };
  }
  return { ok: true, used, limit, tier };
}
