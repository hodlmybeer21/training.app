import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { clientIp, rateLimitAll } from '@/lib/server/rate-limit';
import { cleanMessages, publicPersona, tooMany } from '@/lib/server/ai-guard';
import { groqChat } from '@/lib/server/groq-chat';

const MINUTE = 60_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = await getSessionUser();
    let scenarioName: string;
    let scoringHints = '';
    let transcript;

    if (user) {
      const rl = rateLimitAll(`analyze:user:${user.id}`, [
        { limit: 10, windowMs: 10 * MINUTE },
        { limit: 60, windowMs: 24 * 60 * MINUTE },
      ]);
      if (!rl.ok) return tooMany(rl.retryAfterSeconds, true);
      transcript = cleanMessages(body.transcript, { maxMessages: 80, maxCharsEach: 4000, maxCharsTotal: 40000, allowSystem: false });
      scenarioName = typeof body.scenarioName === 'string' ? body.scenarioName.slice(0, 200) : 'General sales call';
      scoringHints = typeof body.scoringHints === 'string' ? body.scoringHints.slice(0, 2000) : '';
    } else {
      // Public demo debrief: built-in personas only, small transcripts, tight limits.
      const rl = rateLimitAll(`analyze:ip:${clientIp(req.headers)}`, [
        { limit: 4, windowMs: 10 * MINUTE },
        { limit: 15, windowMs: 24 * 60 * MINUTE },
      ]);
      if (!rl.ok) return tooMany(rl.retryAfterSeconds, false);
      const persona = publicPersona(body.personaId);
      if (!persona) return NextResponse.json({ error: 'Unknown scenario' }, { status: 400 });
      transcript = cleanMessages(body.transcript, { maxMessages: 24, maxCharsEach: 1200, maxCharsTotal: 12000, allowSystem: false });
      scenarioName = persona.name;
    }
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

    // Build readable transcript string
    const transcriptText = transcript
      .map((m) => {
        const speaker = m.role === 'user' ? 'Salesperson' : 'Prospect';
        return `${speaker}: ${m.content}`;
      })
      .join('\n');

    const scenarioContext = scoringHints
      ? `\n\nPERSONA-SPECIFIC SCORING CONTEXT:\n${scoringHints}\n\nUse these specific criteria when evaluating the salesperson's performance in this scenario.`
      : '';

    const scoringPrompt = `You are an expert sales coach analyzing a recorded sales roleplay. Your job is to give honest, specific, actionable feedback.

SCENARIO: ${scenarioName || 'General sales call'}${scenarioContext}
DURATION: ${durationSeconds ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s` : 'Unknown'}

TRANSCRIPT:
${transcriptText}

Analyze the salesperson's performance and return a JSON object with this exact structure:
{
  "overallScore": 0-100,
  "discovery": 0-100,
  "objectionHandling": 0-100,
  "valueArticulation": 0-100,
  "confidencePacing": 0-100,
  "closingTechnique": 0-100,
  "strengths": ["specific example from transcript", "specific example from transcript"],
  "opportunities": ["specific example from transcript", "specific example from transcript"],
  "coachingTips": ["specific actionable tip based on what happened", "specific actionable tip based on what happened"],
  "recommendedDrill": "1-2 sentence description of the best next practice scenario based on their weakest area"
}

Scoring guidance:
- Overall score reflects how compelling, well-paced, and closing-oriented the call was
- Discovery: did they ask good questions to uncover the prospect's needs, budget, timeline, decision process?
- Objection Handling: did they address pushback without conceding too quickly?
- Value Articulation: did they lead with ROI, margin impact, or differentiation before price?
- Confidence & Pacing: were they concise, confident, or did they ramble / trail off?
- Closing Technique: did they ask for the order, push for a next step, or try to close?

Be specific — cite exact moments from the transcript in strengths and opportunities. Do not give generic praise. If they struggled, say so directly. Return JSON only, no commentary.`;

    const result = await groqChat(apiKey, {
      messages: [
        { role: 'system', content: scoringPrompt },
        { role: 'user', content: 'Analyze this transcript and return your JSON.' }
      ],
      temperature: 0.3,
      maxTokens: 1024,
      json: true,
    });
    if (!result.ok) {
      return NextResponse.json({ error: 'The AI service had a problem. Try again.' }, { status: 502 });
    }
    let content = result.content;

    // Strip markdown code fences if present
    content = content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'Could not read the score. Try again.' }, { status: 502 });
    }

    return NextResponse.json({ analysis });
  } catch (e: unknown) {
    console.error('analyze route error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
