import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TIER_DISPLAY, roleForTier, tierForPriceId, tierFromCheckoutMetadata, type PaidTier } from '@/lib/tiers';
import { createInvitedUser, findUserByEmail, sendInviteEmail } from '@/lib/server/invites';

// Handles a completed Stripe checkout: records the paid tier on the user and,
// for a new customer, creates an invited account and emails a set-password link.
// Throws on database errors so the webhook returns 500 and Stripe retries.

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

    const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', existingUser.id).maybeSingle();
    const currentRole = (profile as { role?: string | null } | null)?.role ?? null;
    // Keep admins and managers as they are; a rep who buys a team plan becomes its manager.
    const role = currentRole === 'admin' || currentRole === 'manager' ? currentRole : roleForTier(tier);
    const { error: profileError } = await supabase.from('profiles').upsert({ id: existingUser.id, role, tier });
    if (profileError) throw new Error(`profile upsert failed: ${profileError.message}`);
    console.log(`Updated existing account to ${TIER_DISPLAY[tier]}`);
    return;
  }

  // New customer: invite flow, no password is generated. They set their own from the emailed link.
  const { user, link } = await createInvitedUser(supabase, email, { tier });
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, role: roleForTier(tier), tier, display_name: email.split('@')[0] });
  if (profileError) throw new Error(`profile insert failed: ${profileError.message}`);

  const emailed = await sendInviteEmail(email, link, `Your TrainField AI ${TIER_DISPLAY[tier]} account has been created for ${email}.`);
  console.log(`Created account (tier: ${TIER_DISPLAY[tier]}); set-password email ${emailed ? 'sent' : 'NOT sent'}`);
}

