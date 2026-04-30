import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { transcript, scenarioName, durationSeconds } = await req.json();

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json({ error: 'Transcript required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    // Build readable transcript string
    const transcriptText = transcript
      .filter((m: { role: string }) => m.role !== 'system')
      .map((m: { role: string; content: string }) => {
        const speaker = m.role === 'user' ? 'Salesperson' : 'Prospect';
        return `${speaker}: ${m.content}`;
      })
      .join('\n');

    const scoringPrompt = `You are an expert sales coach analyzing a recorded sales roleplay. Your job is to give honest, specific, actionable feedback.

SCENARIO: ${scenarioName || 'General sales call'}
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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: scoringPrompt },
          { role: 'user', content: 'Analyze this transcript and return your JSON.' }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if present
    content = content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'Failed to parse analysis response', raw: content }, { status: 500 });
    }

    return NextResponse.json({ analysis });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
