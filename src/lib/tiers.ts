// Paid plans and their seat limits. These mirror the pricing page
// (src/app/pricing/page.tsx): Small Team "Up to 5 seats", Team "Up to 15 seats".
// Solo is a single-rep plan, so it has one seat.
// Keys match the tier names the Stripe webhook stores (see PLANS below).
export const TIER_SEAT_LIMITS = {
  solo: 1,
  'small-team': 5,
  team: 15,
} as const;

export type PaidTier = keyof typeof TIER_SEAT_LIMITS;

export const TIER_DISPLAY: Record<PaidTier, string> = {
  solo: 'Solo',
  'small-team': 'Small Team',
  team: 'Team',
};

export function isPaidTier(value: unknown): value is PaidTier {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TIER_SEAT_LIMITS, value);
}

export function seatLimitFor(tier: unknown): number | null {
  return isPaidTier(tier) ? TIER_SEAT_LIMITS[tier] : null;
}

// Teams with no paid tier on record (for example a team an admin set up by hand)
// get the Small Team limit instead of unlimited seats.
export const DEFAULT_SEAT_LIMIT = TIER_SEAT_LIMITS['small-team'];

// profiles.role only ever holds one of these. The paid plan lives in
// profiles.tier and auth app_metadata.tier, never in role.
export const VALID_ROLES = ['rep', 'manager', 'admin'] as const;
export type Role = (typeof VALID_ROLES)[number];

/** Role a new paying customer starts with: Solo is one rep, team plans buy a manager seat. */
export function roleForTier(tier: PaidTier): Role {
  return tier === 'solo' ? 'rep' : 'manager';
}

// ── Stripe plans ─────────────────────────────────────────────────────────────
// The one place that maps a pricing-page plan key to its Stripe price and tier.
// Checkout and the webhook both use this, so they can't drift apart.
// Each price can be overridden with an env var (e.g. live-mode price IDs).
export const PLANS = {
  solo: { tier: 'solo', priceEnv: 'STRIPE_PRICE_SOLO', defaultPriceId: 'price_1TWQx5ItqtvZaj2wNbzj7QTH' },
  small: { tier: 'small-team', priceEnv: 'STRIPE_PRICE_SMALL_TEAM', defaultPriceId: 'price_1TWQyBItqtvZaj2wHA2n7Dvm' },
  team: { tier: 'team', priceEnv: 'STRIPE_PRICE_TEAM', defaultPriceId: 'price_1TWQzEItqtvZaj2wHyT8EdHY' },
} as const satisfies Record<string, { tier: PaidTier; priceEnv: string; defaultPriceId: string }>;

export type PlanKey = keyof typeof PLANS;

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLANS, value);
}

export function priceIdForPlan(plan: PlanKey): string {
  const p = PLANS[plan];
  return process.env[p.priceEnv] || p.defaultPriceId;
}

/** Maps a Stripe price ID (current env price or the built-in default) to its tier. */
export function tierForPriceId(priceId: unknown): PaidTier | null {
  if (typeof priceId !== 'string' || !priceId) return null;
  for (const key of Object.keys(PLANS) as PlanKey[]) {
    const p = PLANS[key];
    if (priceId === priceIdForPlan(key) || priceId === p.defaultPriceId) return p.tier;
  }
  return null;
}

/**
 * Works out the paid tier from checkout session metadata. Accepts the current
 * shape ({ plan, tier }) and the old one, where metadata.priceId held a plan key
 * ("solo" | "small" | "team") or a real price ID.
 */
export function tierFromCheckoutMetadata(meta: Record<string, string> | null | undefined): PaidTier | null {
  if (!meta) return null;
  if (isPaidTier(meta.tier)) return meta.tier;
  if (isPlanKey(meta.plan)) return PLANS[meta.plan].tier;
  if (isPlanKey(meta.priceId)) return PLANS[meta.priceId].tier;
  return tierForPriceId(meta.priceId);
}
