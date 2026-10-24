import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { clientIp, rateLimitAll } from '@/lib/server/rate-limit';
import { cleanMessages, publicPersona, tooMany, ChatMessage } from '@/lib/server/ai-guard';

const MINUTE = 60_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = await getSessionUser();
    let messages: ChatMessage[] | null;
    let maxTokens = 512;

    if (user) {
      // Signed-in practice: the client builds the scenario prompt.
      const rl = rateLimitAll(`groq:user:${user.id}`, [
        { limit: 40, windowMs: 10 * MINUTE },
        { limit: 400, windowMs: 24 * 60 * MINUTE },
      ]);
      if (!rl.ok) return tooMany(rl.retryAfterSeconds, true);
      messages = cleanMessages(body.messages, { maxMessages: 80, maxCharsEach: 4000, maxCharsTotal: 40000, allowSystem: true });
    } else {
      // Public demo: only built-in personas, system prompt is set on the server.
      const rl = rateLimitAll(`groq:ip:${clientIp(req.headers)}`, [
        { limit: 20, windowMs: 10 * MINUTE },
        { limit: 80, windowMs: 24 * 60 * MINUTE },
      ]);
      if (!rl.ok) return tooMany(rl.retryAfterSeconds, false);
      const persona = publicPersona(body.personaId);
      if (!persona) return NextResponse.json({ error: 'Unknown scenario' }, { status: 400 });
      const turns = cleanMessages(body.messages, { maxMessages: 24, maxCharsEach: 1200, maxCharsTotal: 12000, allowSystem: false });
      messages = turns ? [{ role: 'system', content: persona.systemPrompt }, ...turns] : null;
      maxTokens = 300;
    }

    if (!messages) return NextResponse.json({ error: 'Conversation is empty or too long' }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.8,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      console.error('Groq error', response.status);
      return NextResponse.json({ error: 'The AI service had a problem. Try again.' }, { status: 502 });
    }

    const data = await response.json();
    const reply = (data.choices?.[0]?.message?.content || '') as string;
    return NextResponse.json({ choices: [{ message: { content: reply } }] });
  } catch (e: unknown) {
    console.error('groq route error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
