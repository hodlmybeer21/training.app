import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// Signed-in practice: every AI reply comes back with a turn token, an HMAC over the
// whole conversation so far plus the scenario it was played under. The next turn and
// the final scoring call must present the token for exactly that conversation, so a
// client can't invent buyer lines, swap the scenario, or score a transcript the AI
// never took part in. Nothing is stored: the token is the proof.
//
// The signing key is derived from SUPABASE_SERVICE_ROLE_KEY (already a server-only
// secret), so no new env var is needed. TURN_TOKEN_SECRET overrides it if ever set.

export type TurnScope = {
  userId: string;
  personaId: string;
  dealStage: string;
  difficulty: string;
  incentiveId: string;
};
export type TurnMessage = { role: 'user' | 'assistant'; content: string };

const VERSION = 'v1';
export const TURN_TOKEN_MAX_AGE_MS = 4 * 60 * 60 * 1000;

function signingKey(): Buffer | null {
  const base = process.env.TURN_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) return null;
  return createHmac('sha256', base).update('trainfield-practice-turn-token-v1').digest();
}

function digest(key: Buffer, scope: TurnScope, issuedAt: number, messages: TurnMessage[]): string {
  const convo = createHash('sha256')
    .update(JSON.stringify(messages.map((m) => [m.role, m.content])))
    .digest('hex');
  const payload = [VERSION, scope.userId, scope.personaId, scope.dealStage, scope.difficulty, scope.incentiveId, issuedAt, convo].join('|');
  return createHmac('sha256', key).update(payload).digest('base64url');
}

/** Token for `messages` (the conversation including the reply just generated). */
export function signTurn(scope: TurnScope, messages: TurnMessage[], now = Date.now()): string {
  const key = signingKey();
  if (!key) throw new Error('Turn signing is not configured');
  return `${VERSION}.${now}.${digest(key, scope, now, messages)}`;
}

/** True only if `token` was issued for exactly this scope and conversation, recently. */
export function verifyTurn(token: unknown, scope: TurnScope, messages: TurnMessage[], now = Date.now()): boolean {
  if (typeof token !== 'string') return false;
  const key = signingKey();
  if (!key) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return false;
  const issuedAt = Number(parts[1]);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60_000 || now - issuedAt > TURN_TOKEN_MAX_AGE_MS) return false;
  const expected = Buffer.from(digest(key, scope, issuedAt, messages));
  const got = Buffer.from(parts[2]);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
