import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { clientIp, rateLimitAll } from '@/lib/server/rate-limit';
import { cleanMessages, publicPersona, tooMany } from '@/lib/server/ai-guard';
import { groqChat } from '@/lib/server/groq-chat';
import { getSampleIncentive, type SampleIncentive } from '@/lib/incentives';
import { createAdminClient } from '@/lib/server/supabase-admin';
import { buildScoringPrompt, parseAnalysis, type Analysis } from '@/lib/server/scoring';
import { cleanTurns, incentiveError, loadTeamCategory, parsePracticeOptions, practiceProfile, practiceScope, resolvePracticePersona } from '@/lib/server/practice';
import { incentivesAllowed, profileFor, type IndustryProfile } from '@/lib/industry';
import { verifyTurn, type TurnMessage } from '@/lib/server/turn-token';

const MINUTE = 60_000;

async function score(apiKey: string, prompt: string, incentive: SampleIncentive | null, profile: IndustryProfile, traineeLines: string[] = []): Promise<Analysis | { error: string }> {
  const result = await groqChat(apiKey, {
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Analyze this transcript and return your JSON.' },
    ],
    temperature: 0.3,
    maxTokens: 1024,
    json: true,
  });
  if (!result.ok) return { error: 'The AI service had a problem. Try again.' };
  return parseAnalysis(result.content, incentive, profile, traineeLines) ?? { error: 'Could not read the score. Try again.' };
}

type SessionRow = {
  id: string;
  transcript: string[] | null;
  overall_score: number | null;
  discovery: number | null;
  objection_handling: number | null;
  value_articulation: number | null;
  confidence_pacing: number | null;
  closing_technique: number | null;
  strengths: string[] | null;
  opportunities: string[] | null;
  coaching_tips: string[] | null;
  recommended_drill: string | null;
};

function rowToAnalysis(r: SessionRow): Analysis {
  return {
    overallScore: r.overall_score ?? 0,
    discovery: r.discovery,
    objectionHandling: r.objection_handling,
    valueArticulation: r.value_articulation,
    confidencePacing: r.confidence_pacing,
    closingTechnique: r.closing_technique,
    strengths: r.strengths || [],
    opportunities: r.opportunities || [],
    coachingTips: r.coaching_tips || [],
    recommendedDrill: r.recommended_drill,
  };
}

/**
 * Signed-in debrief. The transcript must carry the turn token the server issued with
 * the last AI reply, so it is exactly the conversation the AI took part in. The score
 * is computed here and the session row is written here; nothing the client says about
 * scores is used.
 */
async function signedInAnalyze(userId: string, body: Record<string, unknown>) {
  const rl = rateLimitAll(`analyze:user:${userId}`, [
    { limit: 10, windowMs: 10 * MINUTE },
    { limit: 60, windowMs: 24 * 60 * MINUTE },
  ]);
  if (!rl.ok) return tooMany(rl.retryAfterSeconds, true);

  const sb = createAdminClient();
  const { data: profile } = await sb.from('profiles').select('id, team_id').eq('id', userId).maybeSingle();
  const teamId = (profile as { team_id?: string | null } | null)?.team_id ?? null;

  const opts = parsePracticeOptions(body);
  if ('error' in opts) return NextResponse.json({ error: opts.error }, { status: 400 });
  const persona = await resolvePracticePersona(sb, teamId, body.personaId);
  if (!persona) return NextResponse.json({ error: 'Unknown scenario' }, { status: 400 });
  const industry = practiceProfile(persona, await loadTeamCategory(sb, userId, teamId));
  const badIncentive = incentiveError(opts, industry);
  if (badIncentive) return NextResponse.json({ error: badIncentive }, { status: 400 });

  const transcript: TurnMessage[] | null = cleanTurns(body.transcript, { maxMessages: 81, maxCharsEach: 4000, maxCharsTotal: 40000 });
  if (!transcript) return NextResponse.json({ error: 'Transcript is empty or too long' }, { status: 400 });
  if (!transcript.some(m => m.role === 'user')) {
    return NextResponse.json({ error: 'Say something to the buyer before asking for a score' }, { status: 400 });
  }
  const scope = practiceScope(userId, persona, opts);
  if (!verifyTurn(body.turnToken, scope, transcript)) {
    return NextResponse.json({ error: 'This call could not be verified, so it was not scored. Start a new call.', code: 'unverified_transcript' }, { status: 409 });
  }

  const storedTranscript = transcript.map(m => `${m.role}: ${m.content}`);

  // Scoring the same call twice returns the first score instead of a second row.
  const { data: recent } = await sb
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  const key = JSON.stringify(storedTranscript);
  const dupe = ((recent || []) as SessionRow[]).find(r => JSON.stringify(r.transcript || []) === key);
  if (dupe) return NextResponse.json({ analysis: rowToAnalysis(dupe), session: { id: dupe.id }, duplicate: true });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI is not configured' }, { status: 500 });

  const durationSeconds = typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds)
    ? Math.max(0, Math.min(4 * 3600, Math.floor(body.durationSeconds))) : 0;
  const scenarioName = `${persona.name} [${opts.dealStage}] [${opts.difficulty}]`;
  const result = await score(apiKey, buildScoringPrompt({
    scenarioName,
    scenarioContext: persona.custom ? persona.description : '',
    incentive: opts.incentive,
    durationSeconds,
    transcript,
    profile: industry,
  }), opts.incentive, industry, transcript.filter(m => m.role === 'user').map(m => m.content));
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 });

  // Link to a store-owner account only if the caller owns it; otherwise drop it.
  let accountId: string | null = null;
  if (typeof body.accountId === 'string' && /^[0-9a-f-]{36}$/i.test(body.accountId)) {
    const { data: acct } = await sb.from('accounts').select('id').eq('id', body.accountId).eq('rep_id', userId).maybeSingle();
    if (acct) accountId = body.accountId;
  }

  const { data: saved, error } = await sb
    .from('sessions')
    .insert({
      user_id: userId,
      scenario_name: `${scenarioName}${opts.incentive ? ` [sample incentive: ${opts.incentive.name}]` : ''}`,
      overall_score: result.overallScore,
      discovery: result.discovery,
      objection_handling: result.objectionHandling,
      value_articulation: result.valueArticulation,
      confidence_pacing: result.confidencePacing,
      closing_technique: result.closingTechnique,
      strengths: result.strengths,
      opportunities: result.opportunities,
      coaching_tips: result.coachingTips,
      recommended_drill: result.recommendedDrill,
      duration_seconds: durationSeconds || null,
      transcript: storedTranscript,
      account_id: accountId,
    })
    .select('id')
    .single();
  if (error || !saved) {
    console.error('analyze: session save failed', error?.message);
    return NextResponse.json({ analysis: result, session: null, saveError: 'Your score could not be saved. Try scoring again.' });
  }
  return NextResponse.json({ analysis: result, session: { id: (saved as { id: string }).id } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = await getSessionUser();
    if (user) return await signedInAnalyze(user.id, body);

    // Public demo debrief: built-in personas only, small transcripts, tight limits, nothing saved.
    const rl = rateLimitAll(`analyze:ip:${clientIp(req.headers)}`, [
      { limit: 4, windowMs: 10 * MINUTE },
      { limit: 15, windowMs: 24 * 60 * MINUTE },
    ]);
    if (!rl.ok) return tooMany(rl.retryAfterSeconds, false);
    const persona = publicPersona(body.personaId);
    if (!persona) return NextResponse.json({ error: 'Unknown scenario' }, { status: 400 });
    const transcript = cleanMessages(body.transcript, { maxMessages: 24, maxCharsEach: 1200, maxCharsTotal: 12000, allowSystem: false });
    const incentive = body.incentiveId ? getSampleIncentive(body.incentiveId) : null;
    if (body.incentiveId && !incentive) return NextResponse.json({ error: 'Unknown incentive' }, { status: 400 });
    const profile = profileFor(persona.id);
    if (incentive && !incentivesAllowed(profile)) return NextResponse.json({ error: 'Sample incentives are only for beer distribution scenarios' }, { status: 400 });
    const durationSeconds = Number.isFinite(body.durationSeconds) ? Math.max(0, Math.floor(body.durationSeconds)) : 0;

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is empty or too long' }, { status: 400 });
    }
    if (!transcript.some(m => m.role === 'user')) {
      return NextResponse.json({ error: 'Say something to the buyer before asking for a score' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 500 });
    }

    const result = await score(apiKey, buildScoringPrompt({ scenarioName: persona.name, incentive, durationSeconds, transcript, profile }), incentive, profile, transcript.filter(m => m.role === 'user').map(m => m.content));
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 });
    return NextResponse.json({ analysis: result });
  } catch (e: unknown) {
    console.error('analyze route error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
