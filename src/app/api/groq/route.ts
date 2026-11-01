import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { clientIp, rateLimitAll } from '@/lib/server/rate-limit';
import { cleanMessages, publicPersona, tooMany, ChatMessage } from '@/lib/server/ai-guard';
import { groqChat } from '@/lib/server/groq-chat';
import { getSampleIncentive, incentiveBuyerPrompt } from '@/lib/incentives';
import { withRoleLock, roleplayReply } from '@/lib/server/roleplay-reply';
import { createAdminClient } from '@/lib/server/supabase-admin';
import {
  buildPracticeSystemPrompt, cleanTurns, loadGoalContext, parsePracticeOptions,
  practiceOpeningLine, practiceScope, resolvePracticePersona,
} from '@/lib/server/practice';
import { signTurn, verifyTurn, type TurnMessage, type TurnScope } from '@/lib/server/turn-token';

const MINUTE = 60_000;

type Prepared = { messages: ChatMessage[]; personaId: string; turns?: TurnMessage[]; scope?: TurnScope } | NextResponse;

/**
 * Signed-in practice. The client sends ids (persona, deal stage, difficulty, sample
 * incentive) plus the user/assistant turns; the server builds the system prompt.
 * The history before the rep's newest line must be the opening line (first turn) or
 * carry the turn token issued with the previous AI reply.
 */
async function prepareSignedIn(userId: string, body: Record<string, unknown>): Promise<Prepared> {
  const sb = createAdminClient();
  const { data: profile } = await sb.from('profiles').select('id, team_id').eq('id', userId).maybeSingle();
  const teamId = (profile as { team_id?: string | null } | null)?.team_id ?? null;

  const opts = parsePracticeOptions(body);
  if ('error' in opts) return NextResponse.json({ error: opts.error }, { status: 400 });
  const persona = await resolvePracticePersona(sb, teamId, body.personaId);
  if (!persona) return NextResponse.json({ error: 'Unknown scenario' }, { status: 400 });

  // Only user/assistant turns are accepted; a client-sent system message is rejected.
  const turns = cleanTurns(body.messages, { maxMessages: 80, maxCharsEach: 4000, maxCharsTotal: 40000 });
  if (!turns || turns[turns.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Conversation is empty, too long, or not in the expected format' }, { status: 400 });
  }

  const scope = practiceScope(userId, persona, opts);
  const history = turns.slice(0, -1);
  const opening = practiceOpeningLine(persona, opts);
  const freshCall = history.length === 1 && history[0].role === 'assistant' && history[0].content === opening;
  if (!freshCall && !verifyTurn(body.turnToken, scope, history)) {
    return NextResponse.json({ error: 'This call could not be verified. Start a new call.', code: 'unverified_conversation' }, { status: 409 });
  }

  const system = buildPracticeSystemPrompt(persona, opts, await loadGoalContext(sb, teamId));
  return { messages: withRoleLock([{ role: 'system', content: system }, ...turns], persona.id), personaId: persona.id, turns, scope };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = await getSessionUser();
    let prepared: Prepared;
    let maxTokens = 512;

    if (user) {
      const rl = rateLimitAll(`groq:user:${user.id}`, [
        { limit: 40, windowMs: 10 * MINUTE },
        { limit: 400, windowMs: 24 * 60 * MINUTE },
      ]);
      if (!rl.ok) return tooMany(rl.retryAfterSeconds, true);
      prepared = await prepareSignedIn(user.id, body);
    } else {
      // Public demo: only built-in personas, system prompt is set on the server.
      const rl = rateLimitAll(`groq:ip:${clientIp(req.headers)}`, [
        { limit: 20, windowMs: 10 * MINUTE },
        { limit: 80, windowMs: 24 * 60 * MINUTE },
      ]);
      if (!rl.ok) return tooMany(rl.retryAfterSeconds, false);
      const persona = publicPersona(body.personaId);
      if (!persona) return NextResponse.json({ error: 'Unknown scenario' }, { status: 400 });
      // Optional sample incentive: the buyer prompt add-on comes from server-side data only.
      const incentive = body.incentiveId ? getSampleIncentive(body.incentiveId) : null;
      if (body.incentiveId && !incentive) return NextResponse.json({ error: 'Unknown incentive' }, { status: 400 });
      const turns = cleanMessages(body.messages, { maxMessages: 24, maxCharsEach: 1200, maxCharsTotal: 12000, allowSystem: false });
      const system = persona.systemPrompt + (incentive ? incentiveBuyerPrompt(incentive) : '');
      if (!turns) return NextResponse.json({ error: 'Conversation is empty or too long' }, { status: 400 });
      prepared = { messages: withRoleLock([{ role: 'system', content: system }, ...turns], persona.id), personaId: persona.id };
      maxTokens = 300;
    }

    if (prepared instanceof NextResponse) return prepared;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 500 });
    }

    const result = await roleplayReply(apiKey, prepared.messages, prepared.personaId, maxTokens, groqChat);
    if (!result.ok) {
      return NextResponse.json({ error: 'The AI service had a problem. Try again.' }, { status: 502 });
    }
    const reply = result.content;
    const turnToken = prepared.scope && prepared.turns
      ? signTurn(prepared.scope, [...prepared.turns, { role: 'assistant', content: reply }])
      : undefined;
    return NextResponse.json({ choices: [{ message: { content: reply } }], ...(turnToken ? { turnToken } : {}) });
  } catch (e: unknown) {
    console.error('groq route error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
