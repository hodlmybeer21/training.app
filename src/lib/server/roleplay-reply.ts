import type { ChatMessage } from '@/lib/server/ai-guard';
import type { groqChat as GroqChatFn, GroqResult } from '@/lib/server/groq-chat';
import { cleanReply, IN_ROLE_FALLBACK, isBuyerPersona, looksLikeRepSpeak, RETRY_REMINDER, roleLock } from '@/lib/roleplay';

/**
 * Put the role lock on the conversation: appended to the scenario's system prompt
 * (or added as one if the caller sent none). The rep is `user`, the character is
 * `assistant`; any extra client system messages are folded into the first one.
 */
export function withRoleLock(messages: ChatMessage[], personaId: unknown): ChatMessage[] {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const turns = messages.filter(m => m.role !== 'system');
  return [{ role: 'system', content: (system || 'You are the other party in a sales roleplay.') + roleLock(personaId) }, ...turns];
}

/**
 * Get the character's reply. For buyer personas, a reply that reads like the rep
 * talking is retried once with an explicit reminder; if the retry still drifts, a
 * neutral in-character line is returned instead of rep-speak.
 */
export async function roleplayReply(
  apiKey: string,
  messages: ChatMessage[],
  personaId: unknown,
  maxTokens: number,
  chat: typeof GroqChatFn,
): Promise<GroqResult & { retried?: boolean; fallback?: boolean }> {
  const first = await chat(apiKey, { messages, temperature: 0.8, maxTokens });
  if (!first.ok) return first;
  const reply = cleanReply(first.content);
  if (!isBuyerPersona(personaId) || !looksLikeRepSpeak(reply)) return { ...first, content: reply };

  const retry = await chat(apiKey, {
    messages: [...messages, { role: 'system', content: RETRY_REMINDER }],
    temperature: 0.5,
    maxTokens,
  });
  if (retry.ok) {
    const second = cleanReply(retry.content);
    if (second && !looksLikeRepSpeak(second)) return { ...retry, content: second, retried: true };
  }
  return { ok: true, content: IN_ROLE_FALLBACK, model: first.model, retried: true, fallback: true };
}
