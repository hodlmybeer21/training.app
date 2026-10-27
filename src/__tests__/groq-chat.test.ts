import { describe, it, expect, vi, afterEach } from 'vitest';
import { groqChat, groqModelOrder, GROQ_MODELS } from '@/lib/server/groq-chat';

const ok = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
const err = (status: number, code: string) => new Response(JSON.stringify({ error: { code } }), { status });
const msgs = [{ role: 'user' as const, content: 'hi' }];

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('groqChat', () => {
  it('never uses a retired Llama model and starts with a current one', () => {
    expect(GROQ_MODELS.some(m => m.includes('llama'))).toBe(false);
    expect(groqModelOrder('')[0]).toBe(GROQ_MODELS[0]);
    expect(groqModelOrder('custom/model')).toEqual(['custom/model', ...GROQ_MODELS]);
  });

  it('returns the first model reply and sends reasoning_effort only to gpt-oss', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = vi.fn().mockResolvedValue(ok('Make it quick.'));
    const r = await groqChat(' key\n', { messages: msgs, temperature: 0.8, maxTokens: 300 }, f);
    expect(r).toEqual({ ok: true, content: 'Make it quick.', model: GROQ_MODELS[0] });
    const [, init] = f.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer key');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: GROQ_MODELS[0], max_tokens: 300 });
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.response_format).toBeUndefined();
  });

  it('falls back on 404 model_not_found and 429, and asks for JSON when scoring', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = vi.fn()
      .mockResolvedValueOnce(err(404, 'model_not_found'))
      .mockResolvedValueOnce(err(429, 'rate_limit_exceeded'))
      .mockResolvedValueOnce(ok('{"overallScore":70}'));
    const r = await groqChat('k', { messages: msgs, temperature: 0.3, maxTokens: 1024, json: true }, f);
    expect(r).toEqual({ ok: true, content: '{"overallScore":70}', model: GROQ_MODELS[2] });
    expect(f).toHaveBeenCalledTimes(3);
    const first = JSON.parse(f.mock.calls[0][1].body);
    expect(first.model).toBe('qwen/qwen3.8-27b');
    expect(first.reasoning_effort).toBeUndefined();
    const second = JSON.parse(f.mock.calls[1][1].body);
    expect(second.model).toBe('openai/gpt-oss-20b');
    expect(second.reasoning_effort).toBe('low');
    expect(second.response_format).toEqual({ type: 'json_object' });
  });

  it('stops on auth errors and reports the status and code without retrying', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = vi.fn().mockResolvedValue(err(401, 'invalid_api_key'));
    const r = await groqChat('secret-key', { messages: msgs, temperature: 0.8, maxTokens: 300 }, f);
    expect(r).toEqual({ ok: false, status: 401, code: 'invalid_api_key' });
    expect(f).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret-key');
  });
});
