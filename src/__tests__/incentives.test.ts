/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SAMPLE_INCENTIVES,
  getSampleIncentive,
  incentiveBuyerPrompt,
  incentiveScoringPrompt,
  normalizeIncentiveGoal,
  sampleProgressPercent,
} from '@/lib/incentives';
import { publicPersona } from '@/lib/server/ai-guard';

// Signed-out caller, and a fake Groq that records what it was sent.
vi.mock('@/lib/server/auth', () => ({ getSessionUser: async () => null }));
const sent: any[] = [];
let reply = 'ok';
vi.mock('@/lib/server/groq-chat', () => ({
  groqChat: async (_key: string, opts: any) => { sent.push(opts); return { ok: true, content: reply, model: 'test' }; },
}));

let ipCounter = 0;
const post = (body: unknown) => new Request('http://x/api', {
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ipCounter}` },
}) as any;

beforeEach(() => { sent.length = 0; reply = 'ok'; process.env.GROQ_API_KEY = 'test-key'; });

describe('sample incentive data', () => {
  it('has 4 to 6 programs, all flagged sample, with unique ids', () => {
    expect(SAMPLE_INCENTIVES.length).toBeGreaterThanOrEqual(4);
    expect(SAMPLE_INCENTIVES.length).toBeLessThanOrEqual(6);
    expect(SAMPLE_INCENTIVES.every(i => i.sample === true)).toBe(true);
    expect(new Set(SAMPLE_INCENTIVES.map(i => i.id)).size).toBe(SAMPLE_INCENTIVES.length);
    expect(SAMPLE_INCENTIVES.every(i => i.id.startsWith('sample-'))).toBe(true);
  });

  it('covers POD, volume and case-stack/display goals', () => {
    const types = new Set(SAMPLE_INCENTIVES.map(i => i.type));
    for (const t of ['pod', 'volume', 'display'] as const) expect(types.has(t)).toBe(true);
  });

  it('every program has the fields a rep needs and a real public persona', () => {
    for (const i of SAMPLE_INCENTIVES) {
      expect(i.name && i.brand && i.counts && i.target && i.payout && i.ask && i.buyerPushback).toBeTruthy();
      expect(['Monthly', 'Quarterly']).toContain(i.period);
      expect(i.talkingPoints.length).toBeGreaterThanOrEqual(2);
      expect(publicPersona(i.personaId)).not.toBeNull();
      expect(i.sampleProgress.goal).toBeGreaterThan(0);
      const pct = sampleProgressPercent(i);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });

  it('uses fictional brands only', () => {
    const real = /bud|miller|coors|michelob|corona|modelo|heineken|stella|sam adams|samuel adams|yuengling|pabst|guinness|blue moon|dogfish|smuttynose|allagash|sierra nevada|bellavance/i;
    for (const i of SAMPLE_INCENTIVES) expect(JSON.stringify(i)).not.toMatch(real);
  });

  it('looks programs up by id only', () => {
    expect(getSampleIncentive(SAMPLE_INCENTIVES[0].id)?.id).toBe(SAMPLE_INCENTIVES[0].id);
    expect(getSampleIncentive('nope')).toBeNull();
    expect(getSampleIncentive(42)).toBeNull();
  });

  it('builds buyer and scoring prompts around the specific ask', () => {
    const i = getSampleIncentive('sample-display-floor-stack')!;
    expect(incentiveBuyerPrompt(i)).toContain(i.ask);
    expect(incentiveBuyerPrompt(i)).toMatch(/Do not agree right away/);
    expect(incentiveScoringPrompt(i)).toContain('INCENTIVE GOAL');
    expect(incentiveScoringPrompt(i)).toContain(i.ask);
  });
});

describe('normalizeIncentiveGoal', () => {
  it('clamps the score and keeps a valid outcome', () => {
    expect(normalizeIncentiveGoal({ asked: true, outcome: 'trial', score: 140, evidence: 'x' })).toEqual({ asked: true, outcome: 'trial', score: 100, evidence: 'x' });
  });
  it('fills a missing outcome from asked', () => {
    expect(normalizeIncentiveGoal({ asked: false, score: 0 })?.outcome).toBe('not-asked');
    expect(normalizeIncentiveGoal({ asked: true, score: 40 })?.outcome).toBe('declined');
  });
  it('rejects junk', () => {
    expect(normalizeIncentiveGoal(null)).toBeNull();
    expect(normalizeIncentiveGoal('yes')).toBeNull();
  });
});

describe('public demo with an incentive', () => {
  it('/api/groq appends the incentive to the server-side buyer prompt', async () => {
    const { POST } = await import('@/app/api/groq/route');
    const res = await POST(post({ personaId: 'nh-convenience-buyer', incentiveId: 'sample-display-floor-stack', messages: [{ role: 'user', content: 'Hi' }] }));
    expect(res.status).toBe(200);
    const system = sent[0].messages[0];
    expect(system.role).toBe('system');
    expect(system.content).toContain('10-case floor stack');
  });

  it('/api/groq rejects an unknown incentive', async () => {
    const { POST } = await import('@/app/api/groq/route');
    const res = await POST(post({ personaId: 'nh-convenience-buyer', incentiveId: 'real-program', messages: [{ role: 'user', content: 'Hi' }] }));
    expect(res.status).toBe(400);
    expect(sent.length).toBe(0);
  });

  it('/api/groq without an incentive leaves the prompt alone', async () => {
    const { POST } = await import('@/app/api/groq/route');
    await POST(post({ personaId: 'nh-convenience-buyer', messages: [{ role: 'user', content: 'Hi' }] }));
    expect(sent[0].messages[0].content).not.toContain('WHAT THE REP WILL ASK FOR');
  });

  it('/api/analyze scores the incentive goal and labels it sample', async () => {
    reply = JSON.stringify({ overallScore: 70, discovery: 60, objectionHandling: 70, valueArticulation: 65, confidencePacing: 70, closingTechnique: 80, strengths: [], opportunities: [], coachingTips: [], recommendedDrill: 'x', incentiveGoal: { asked: true, outcome: 'trial', score: 77, evidence: 'Can I build 10 cases by the door?' } });
    const { POST } = await import('@/app/api/analyze/route');
    const res = await POST(post({ personaId: 'nh-convenience-buyer', incentiveId: 'sample-display-floor-stack', transcript: [{ role: 'assistant', content: 'What?' }, { role: 'user', content: 'Can I build 10 cases by the door?' }] }));
    expect(res.status).toBe(200);
    const prompt = sent[0].messages[0].content as string;
    expect(prompt).toContain('INCENTIVE GOAL');
    expect(prompt).toContain('"incentiveGoal"');
    const { analysis } = await res.json();
    expect(analysis.incentiveGoal).toMatchObject({ asked: true, outcome: 'trial', score: 77, incentiveId: 'sample-display-floor-stack', sample: true });
  });

  it('/api/analyze drops incentiveGoal when no incentive was picked', async () => {
    reply = JSON.stringify({ overallScore: 50, incentiveGoal: { asked: true, outcome: 'committed', score: 99 } });
    const { POST } = await import('@/app/api/analyze/route');
    const res = await POST(post({ personaId: 'nh-convenience-buyer', transcript: [{ role: 'user', content: 'Hello' }] }));
    const { analysis } = await res.json();
    expect(sent[0].messages[0].content).not.toContain('INCENTIVE GOAL');
    expect(analysis.incentiveGoal).toBeUndefined();
  });
});
