import { NextResponse } from 'next/server';
import { PERSONAS } from '@/lib/personas';
import { NH_PERSONAS } from '@/lib/personas-nh';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const PUBLIC_PERSONAS = [...PERSONAS, ...NH_PERSONAS];

export function publicPersona(id: unknown) {
  if (typeof id !== 'string') return null;
  return PUBLIC_PERSONAS.find(p => p.id === id) ?? null;
}

/**
 * Validate a chat history. Returns null if it is malformed or too large.
 * `allowSystem` is only true for signed-in users (the practice page builds its
 * own scenario prompts); anonymous callers never get to set the system prompt.
 */
export function cleanMessages(
  raw: unknown,
  opts: { maxMessages: number; maxCharsEach: number; maxCharsTotal: number; allowSystem: boolean },
): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > opts.maxMessages) return null;
  const out: ChatMessage[] = [];
  let total = 0;
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (typeof content !== 'string') return null;
    if (role !== 'user' && role !== 'assistant' && !(role === 'system' && opts.allowSystem)) {
      if (role === 'system') continue; // silently drop client system prompts for anonymous callers
      return null;
    }
    const limit = role === 'system' ? opts.maxCharsTotal : opts.maxCharsEach;
    if (content.length > limit) return null;
    total += content.length;
    if (total > opts.maxCharsTotal) return null;
    out.push({ role: role as ChatMessage['role'], content });
  }
  return out.length ? out : null;
}

export function tooMany(retryAfterSeconds: number, signedIn: boolean) {
  return NextResponse.json(
    {
      error: signedIn
        ? 'You are sending requests too fast. Wait a minute and try again.'
        : 'The free demo is busy for your connection. Wait a few minutes and try again, or sign in.',
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
