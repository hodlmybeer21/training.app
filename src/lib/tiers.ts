// Paid plans and their seat limits. These mirror the pricing page
// (src/app/pricing/page.tsx): Small Team "Up to 5 seats", Team "Up to 15 seats".
// Solo is a single-rep plan, so it has one seat.
// Keys match the tier names the Stripe webhook stores (TIER_ROLE_MAP).
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
