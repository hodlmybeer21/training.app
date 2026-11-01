import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/server/supabase-admin';
import { createRecoveryLink, sendPasswordResetEmail } from '@/lib/server/invites';
import { clientIp, rateLimitAll } from '@/lib/server/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN = 60_000;

// POST { email } → emails a one-time /set-password?type=recovery link if the
// account exists. Always answers the same way so it can't be used to check which
// emails have accounts. Rate limited per IP and per email (in memory, best effort).
export async function POST(req: NextRequest) {
  const generic = NextResponse.json({ ok: true, message: "If that email has a TrainField account, a reset link is on its way." });
  let email = '';
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 320) : '';
  } catch {
    return NextResponse.json({ error: 'Enter your email address.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });

  const ipLimit = rateLimitAll(`forgot:ip:${clientIp(req.headers)}`, [{ limit: 5, windowMs: 15 * MIN }, { limit: 20, windowMs: 24 * 60 * MIN }]);
  if (!ipLimit.ok) {
    return NextResponse.json({ error: 'Too many reset requests. Try again later.' }, { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } });
  }
  // Per-email limit fails quietly (same answer) so it doesn't reveal anything either.
  if (!rateLimitAll(`forgot:email:${email}`, [{ limit: 3, windowMs: 60 * MIN }]).ok) return generic;

  try {
    const link = await createRecoveryLink(createAdminClient(), email);
    if (link) await sendPasswordResetEmail(email, link);
  } catch (e) {
    console.error('forgot-password failed:', e instanceof Error ? e.message : e);
  }
  return generic;
}
