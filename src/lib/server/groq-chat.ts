import type { ChatMessage } from '@/lib/server/ai-guard';

// Groq retired the Llama 3.x chat models this app used (llama-3.1-8b-instant now
// returns 404 model_not_found). These are models Groq serves today, in order of
// preference. If one is retired (404) or rate limited (429, free-tier limits are
// per model), the next one is tried. GROQ_MODEL can put a different model first.
// qwen3.8-27b is first: in side-by-side buyer roleplay tests it stayed in character
// with short spoken replies, where gpt-oss-20b drifted into lists and rep-style questions.
export const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'] as const;

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function groqModelOrder(override = process.env.GROQ_MODEL): string[] {
  const first = override?.trim();
  return first ? [first, ...GROQ_MODELS.filter(m => m !== first)] : [...GROQ_MODELS];
}

export type GroqResult =
  | { ok: true; content: string; model: string }
  | { ok: false; status: number; code: string | null };

export async function groqChat(
  apiKey: string,
  opts: { messages: ChatMessage[]; temperature: number; maxTokens: number; json?: boolean },
  fetchImpl: typeof fetch = fetch,
): Promise<GroqResult> {
  let last: GroqResult = { ok: false, status: 0, code: null };
  for (const model of groqModelOrder()) {
    const body: Record<string, unknown> = {
      model,
      messages: opts.messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    };
    // gpt-oss models reason before answering; keep that short so replies stay fast
    // and the token budget goes to the answer.
    if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
    if (opts.json) body.response_format = { type: 'json_object' };

    const res = await fetchImpl(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, content: (data.choices?.[0]?.message?.content || '') as string, model };
    }
    let code: string | null = null;
    try {
      const err = await res.json();
      code = err?.error?.code ?? err?.error?.type ?? null;
    } catch { /* non-JSON error body */ }
    // Status, model and Groq's error code only; never the key or the prompt.
    console.error('Groq error', res.status, model, code ?? '');
    last = { ok: false, status: res.status, code };
    if (res.status !== 404 && res.status !== 429) break;
  }
  return last;
}
