// Best-effort in-memory rate limiter (free, no external service).
// Limits are per server instance, so they are a speed bump against abuse of
// the AI endpoints, not a hard quota. Fixed windows keyed by caller.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

/** Allow `limit` hits per `windowMs` for `key`. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Check several windows at once (e.g. per-10-minutes and per-day). All must pass. */
export function rateLimitAll(key: string, rules: { limit: number; windowMs: number }[]): RateLimitResult {
  for (const r of rules) {
    const res = rateLimit(`${key}:${r.windowMs}`, r.limit, r.windowMs);
    if (!res.ok) return res;
  }
  return { ok: true, retryAfterSeconds: 0 };
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip') || 'unknown';
}
