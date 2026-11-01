import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TIER_DISPLAY, roleForTier, tierForPriceId, tierFromCheckoutMetadata, type PaidTier } from '@/lib/tiers';
import { createInvitedUser, findUserByEmail, sendInviteEmail } from '@/lib/server/invites';
import { createTeam, defaultTeamName, DEFAULT_TEAM_CATEGORY } from '@/lib/server/teams';

// Handles a completed Stripe checkout: records the paid tier on the user and,
// for a new customer, creates an invited account and emails a set-password link.
// A team plan (Small Team / Team) also gives the buyer a team they manage:
//  - new customer: a new team, buyer is its manager
//  - existing manager/admin who already has a team: that team keeps going, now on the plan
//  - anyone else (a rep on someone else's team, a manager with no team): a NEW team,
//    so a rep never takes over the team they currently belong to
// Throws on database errors so the webhook returns 500 and Stripe retries. A retry
// finds the buyer already managing a team and does not create a second one.

async function resolveTier(stripe: Stripe, session: Stripe.Checkout.Session): Promise<PaidTier | null> {
  const fromMeta = tierFromCheckoutMetadata(session.metadata as Record<string, string> | null);
  if (fromMeta) return fromMeta;
  // Fall back to the purchased price (line items are not included in the event payload).
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
    for (const item of items.data) {
      const t = tierForPriceId(item.price?.id);
      if (t) return t;
    }
  } catch (e: unknown) {
    console.error('listLineItems failed:', e instanceof Error ? e.message : e);
  }
  return null;
}

export async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const email = (session.customer_email || session.customer_details?.email || '').trim().toLowerCase();
  if (!email) {
    console.error('No email in checkout session:', session.id);
    return;
  }
  const tier = await resolveTier(stripe, session);
  if (!tier) {
    console.error('Could not work out the plan for checkout session:', session.id);
    return;
  }

  const existingUser = await findUserByEmail(supabase, email);

  if (existingUser) {
    // app_metadata can only be written with the service role, so it is the trusted
    // record of the paid plan (used for team seat limits).
    const { error: metaError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      app_metadata: { ...(existingUser.app_metadata || {}), tier },
    });
    if (metaError) throw new Error(`app_metadata update failed: ${metaError.message}`);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, team_id, display_name, category')
      .eq('id', existingUser.id)
      .maybeSingle();
    const p = (profile || {}) as { role?: string | null; team_id?: string | null; display_name?: string | null; category?: string | null };
    const currentRole = p.role ?? null;
    const leads = currentRole === 'admin' || currentRole === 'manager';

    if (tier === 'solo') {
      // Solo is one seat: keep admins and managers as they are, everyone else is a rep.
      const role = leads ? currentRole : roleForTier(tier);
      const { error: profileError } = await supabase.from('profiles').upsert({ id: existingUser.id, role, tier });
      if (profileError) throw new Error(`profile upsert failed: ${profileError.message}`);
    } else if (leads && p.team_id) {
      // Already runs a team: put that team on the plan.
      const { error: profileError } = await supabase.from('profiles').upsert({ id: existingUser.id, role: currentRole, tier });
      if (profileError) throw new Error(`profile upsert failed: ${profileError.message}`);
    } else {
      // A rep (or a manager with no team) bought a team plan: give them their own new team.
      const teamId = await createTeam(supabase, defaultTeamName(p.display_name, email), p.category || DEFAULT_TEAM_CATEGORY);
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: existingUser.id,
        role: currentRole === 'admin' ? 'admin' : 'manager',
        tier,
        team_id: teamId,
        manager_id: null,
      });
      if (profileError) throw new Error(`profile upsert failed: ${profileError.message}`);
      console.log('Created a new team for the buyer');
    }
    console.log(`Updated existing account to ${TIER_DISPLAY[tier]}`);
    return;
  }

  // New customer: invite flow, no password is generated. They set their own from the emailed link.
  const { user, link } = await createInvitedUser(supabase, email, { tier });
  const displayName = email.split('@')[0];
  const teamId = tier === 'solo' ? null : await createTeam(supabase, defaultTeamName(displayName, email), DEFAULT_TEAM_CATEGORY);
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      role: roleForTier(tier),
      tier,
      display_name: displayName,
      ...(teamId ? { team_id: teamId, category: DEFAULT_TEAM_CATEGORY } : {}),
    });
  if (profileError) throw new Error(`profile insert failed: ${profileError.message}`);

  const intro = teamId
    ? `Your TrainField AI ${TIER_DISPLAY[tier]} account has been created for ${email}. You're the manager of your new team: after you sign in, open Manager → Members to add your reps.`
    : `Your TrainField AI ${TIER_DISPLAY[tier]} account has been created for ${email}.`;
  const emailed = await sendInviteEmail(email, link, intro);
  console.log(`Created account (tier: ${TIER_DISPLAY[tier]}); set-password email ${emailed ? 'sent' : 'NOT sent'}`);
}

