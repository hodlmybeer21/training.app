/* eslint-disable @typescript-eslint/no-explicit-any */
// Beer-only logic (tied-house rules, keg/tap tips, sample incentives, "price,
// delivery, exclusivity" stage notes) stays in the beer category; every other
// industry gets its own framing and never sees beer coaching.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildScoringPrompt, parseAnalysis } from '@/lib/server/scoring';
import { SAFE_MARKETING_TIP, recommendsSteering } from '@/lib/compliance';
import {
  CATEGORY_IDS, SAFE_TIPS, incentivesAllowed, profileFor, scorecardFor, skillLabels, stageContextFor, stageOpeningFor,
  type IndustryProfile,
} from '@/lib/industry';
import { buildScenarioPrompt, openingLineFor, roleLock } from '@/lib/roleplay';
import { getSampleIncentive, SAMPLE_INCENTIVES } from '@/lib/incentives';
import { publicPersona } from '@/lib/server/ai-guard';
import { PERSONAS } from '@/lib/personas';
import { RE_PERSONAS, INS_PERSONAS } from '@/lib/personas/index';
import { RE_FAIR_HOUSING_RULE } from '@/lib/personas/real-estate';
import { loadTeamCategory, practiceProfile, builtInPracticePersona } from '@/lib/server/practice';

vi.mock('@/lib/server/auth', () => ({ getSessionUser: async () => null }));
const sent: any[] = [];
let reply = 'ok';
vi.mock('@/lib/server/groq-chat', () => ({
  groqChat: async (_key: string, opts: any) => { sent.push(opts); return { ok: true, content: reply, model: 'test' }; },
}));
let ip = 0;
const post = (body: unknown) => new Request('http://x/api', {
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.0.${++ip}` },
}) as any;
beforeEach(() => { sent.length = 0; reply = 'ok'; process.env.GROQ_API_KEY = 'test-key'; });

const NON_BEER: IndustryProfile[] = ['retail', 'real-estate', 'insurance', 'hr-management', 'b2b'];
// Words that only belong in beer coaching.
const BEER_WORDS = /tied-house|\bkegs?\b|tap takeover|tap markers|tap handles?|coasters|27 CFR|free product|pints?\b|brewery|distributor/i;
const transcript = [{ role: 'assistant', content: 'Hello.' }, { role: 'user', content: 'Thanks for meeting with me.' }];

describe('scoring prompt by industry', () => {
  it('beer keeps the tied-house rules and inducement guidance', () => {
    const p = buildScoringPrompt({ scenarioName: 'Bar owner', incentive: null, durationSeconds: 60, transcript, profile: 'beer-distribution' });
    expect(p).toMatch(/tied-house/);
    expect(p).toMatch(/free product, paid ads or other inducements/);
    expect(p).toContain('SALES REP (trainee)');
  });

  it.each(NON_BEER)('%s prompt has no beer rules or beer vocabulary', (profile) => {
    const p = buildScoringPrompt({ scenarioName: 'X', incentive: null, durationSeconds: 60, transcript, profile });
    expect(p).not.toMatch(BEER_WORDS);
    expect(p).not.toMatch(/inducement/i);
    expect(p).toContain('GUARDRAILS');
  });

  it('real estate prompt carries the fair-housing rules', () => {
    const p = buildScoringPrompt({ scenarioName: 'Listing', incentive: null, durationSeconds: 60, transcript, profile: 'real-estate' });
    expect(p).toMatch(/fair housing/i);
    expect(p).toMatch(/steer/i);
    expect(p).toMatch(/familial status/);
    expect(p).toContain('AGENT (trainee)');
  });

  it('manager/HR calls are graded on the conversation scorecard, not a sale', () => {
    const p = buildScoringPrompt({ scenarioName: 'Review', incentive: null, durationSeconds: 60, transcript, profile: 'hr-management' });
    for (const label of ['Listening', 'Empathy', 'Clarity', 'Policy-Safe Language', 'Next Steps & Documentation']) expect(p).toContain(label);
    expect(p).not.toMatch(/SALES REP|BUYER \(AI|ask for the order|ROI/);
    expect(skillLabels('hr-management').map(s => s.label)).toEqual(['Listening', 'Empathy', 'Clarity', 'Policy-Safe Language', 'Next Steps & Documentation']);
    expect(scorecardFor('hr-management').kind).toBe('conversation');
  });

  it('a sample incentive is ignored outside beer', () => {
    const inc = SAMPLE_INCENTIVES[0];
    const p = buildScoringPrompt({ scenarioName: 'X', incentive: inc, durationSeconds: 60, transcript, profile: 'insurance' });
    expect(p).not.toContain(inc.name);
    expect(p).not.toMatch(/incentiveGoal/);
  });
});

describe('debrief clean-up by industry', () => {
  const json = (o: Record<string, unknown>) => JSON.stringify({ overallScore: 70, strengths: [], opportunities: [], ...o });

  it('a real estate debrief never contains beer tips', () => {
    // Lines the beer filter would strip (cash, gift cards) are normal real estate talk.
    const tips = ['Ask whether they would consider a cash offer versus a financed one.', 'Mention the closing gift card policy only if your brokerage allows it.'];
    for (const coachingTips of [tips, [], ['Lead with comparable sales.']]) {
      const a = parseAnalysis(json({ coachingTips, recommendedDrill: 'Run the listing appointment again.' }), null, 'real-estate')!;
      const all = [...a.coachingTips, ...a.strengths, ...a.opportunities, a.recommendedDrill || ''].join(' ');
      expect(all).not.toContain(SAFE_MARKETING_TIP);
      expect(all).not.toMatch(BEER_WORDS);
    }
    const kept = parseAnalysis(json({ coachingTips: tips }), null, 'real-estate')!;
    expect(kept.coachingTips).toEqual(tips);
    const empty = parseAnalysis(json({ coachingTips: [] }), null, 'real-estate')!;
    expect(empty.coachingTips).toEqual([SAFE_TIPS['real-estate']]);
  });

  it.each(NON_BEER)('%s debrief falls back to its own safe tip, never the keg/tap tip', (profile) => {
    const a = parseAnalysis(json({ coachingTips: [] }), null, profile)!;
    expect(a.coachingTips).toEqual([SAFE_TIPS[profile as Exclude<IndustryProfile, 'beer-distribution'>]]);
    expect(a.coachingTips.join(' ')).not.toMatch(BEER_WORDS);
  });

  it('beer still strips inducement tips and adds the tap/keg safe tip', () => {
    const a = parseAnalysis(json({ coachingTips: ['Offer them a free keg to get the line.'] }), null, 'beer-distribution')!;
    expect(a.coachingTips).toEqual([SAFE_MARKETING_TIP]);
  });

  it('real estate drops steering lines and keeps lines that warn against it', () => {
    const steer = 'Tell them the east side is a great neighborhood for families like yours.';
    const warn = 'Avoid commenting on neighborhood demographics; point them to public data they can check.';
    expect(recommendsSteering(steer)).toBe(true);
    expect(recommendsSteering(warn)).toBe(false);
    expect(recommendsSteering('Redirect any question about religion in the area to neutral, public sources.')).toBe(false);
    const a = parseAnalysis(json({ coachingTips: [steer, warn], recommendedDrill: 'Practice steering buyers toward the right area.' }), null, 'real-estate')!;
    expect(a.coachingTips).toEqual([warn, SAFE_TIPS['real-estate']]);
    expect(a.recommendedDrill).toBeNull();
  });

  it('sample incentive goals are only kept on beer calls', () => {
    const inc = SAMPLE_INCENTIVES[0];
    const raw = json({ coachingTips: ['x'], incentiveGoal: { asked: true, outcome: 'agreed', score: 80 } });
    expect(parseAnalysis(raw, inc, 'retail')!.incentiveGoal).toBeUndefined();
  });
});

describe('roleplay prompts by industry', () => {
  it.each(NON_BEER)('%s stage notes never push price/delivery/exclusivity or stock talk', (profile) => {
    for (const stage of ['initial-pitch', 'proposal', 'negotiation', 'renewal']) {
      const t = stageContextFor(profile, stage);
      expect(t.length).toBeGreaterThan(20);
      expect(t).not.toMatch(/delivery|exclusivity|out-of-stocks|slow sellers|kegs?|taps?\b/i);
    }
  });

  it('HR stage notes and openings say nothing about price', () => {
    for (const stage of ['initial-pitch', 'proposal', 'negotiation', 'renewal']) {
      expect(stageContextFor('hr-management', stage)).not.toMatch(/price|pricing|concession/i);
      expect(stageOpeningFor('hr-management', stage) || '').not.toMatch(/price|pricing|leadership involved/i);
    }
    expect(buildScenarioPrompt('BASE', 'negotiation', 'easy', '', 'hr-management')).not.toMatch(/price, delivery, terms/);
  });

  it('beer keeps its stage notes by default', () => {
    expect(buildScenarioPrompt('BASE', 'negotiation', 'easy')).toMatch(/price, delivery, terms or exclusivity/);
    expect(openingLineFor('Hi', 'initial-pitch')).toBe('Hi');
    expect(openingLineFor('Hi', 'renewal', 'insurance')).toMatch(/renewal came in/);
  });

  it('custom personas outside beer get a buyer lock without kegs or taps', () => {
    const custom = '3f1c2a9e-0000-0000-0000-000000000000';
    expect(roleLock(custom)).toMatch(/kegs/);
    for (const p of ['real-estate', 'insurance', 'retail', 'b2b'] as IndustryProfile[]) {
      expect(roleLock(custom, p)).not.toMatch(/kegs?|tap handles|your taps/i);
      expect(roleLock(custom, p)).toMatch(/NOT THE SELLER/);
    }
    expect(roleLock(custom, 'hr-management')).not.toMatch(/SELLER/);
  });
});

describe('which industry a call belongs to', () => {
  it('built-in personas use their own category, custom personas the team category', () => {
    expect(profileFor('nh-bar-owner')).toBe('beer-distribution');
    expect(profileFor('re-listing-commission', 'beer-distribution')).toBe('real-estate');
    expect(profileFor('ins-policy-renewal')).toBe('insurance');
    expect(profileFor('annual-review')).toBe('hr-management');
    expect(profileFor('hostile-prospect', 'real-estate')).toBe('b2b');
    expect(profileFor('custom-uuid', 'insurance')).toBe('insurance');
    expect(profileFor('custom-uuid', 'nonsense')).toBe('beer-distribution');
    const custom = { id: 'x', name: 'X', description: '', systemPrompt: '', openingLine: '', custom: true };
    expect(practiceProfile(custom, 'real-estate')).toBe('real-estate');
    expect(practiceProfile(builtInPracticePersona('nh-bar-owner')!, 'real-estate')).toBe('beer-distribution');
  });

  it('only beer offers sample incentives', () => {
    expect(CATEGORY_IDS.filter(c => incentivesAllowed(c))).toEqual(['beer-distribution']);
    expect(incentivesAllowed('b2b')).toBe(false);
  });

  it('practice opens on the user override, then the team category, then beer', async () => {
    const fake = (rows: Record<string, any>) => ({
      from: (t: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: rows[t] ?? null }) }) }) }),
    }) as any;
    expect(await loadTeamCategory(fake({ profiles: { category: 'insurance' }, teams: { category: 'retail' } }), 'u', 't')).toBe('insurance');
    expect(await loadTeamCategory(fake({ profiles: { category: null }, teams: { category: 'real-estate' } }), 'u', 't')).toBe('real-estate');
    expect(await loadTeamCategory(fake({ profiles: null }), 'u', null)).toBe('beer-distribution');
  });
});

describe('personas', () => {
  it('adds the three real estate personas, all with the fair-housing rule', () => {
    for (const id of ['re-listing-commission', 're-expired-fsbo', 're-buyer-consultation']) expect(RE_PERSONAS.some(p => p.id === id)).toBe(true);
    for (const p of RE_PERSONAS) expect(p.systemPrompt.endsWith(RE_FAIR_HOUSING_RULE)).toBe(true);
  });

  it('the generic sales personas no longer say distributor', () => {
    for (const id of ['new-account-pitch', 'hostile-prospect']) {
      const p = PERSONAS.find(x => x.id === id)!;
      expect(`${p.description} ${p.systemPrompt} ${p.openingLine}`).not.toMatch(/distributor/i);
    }
  });

  it('the liability claim persona tells one consistent story', () => {
    const p = INS_PERSONAS.find(x => x.id === 'ins-liability-claim')!;
    expect(p.systemPrompt).not.toMatch(/you're disputing the claim/i);
    expect(p.systemPrompt).toMatch(/you agree/i);
  });
});

describe('free demo', () => {
  it('offers real estate and insurance personas without an account', () => {
    expect(publicPersona('re-listing-commission')?.id).toBe('re-listing-commission');
    expect(publicPersona('ins-policy-renewal')?.id).toBe('ins-policy-renewal');
    expect(publicPersona('hr-raise-conversation')).toBeNull();
  });

  it('a real estate demo debrief has no beer tips even if the model drifts', async () => {
    reply = JSON.stringify({ overallScore: 60, coachingTips: [], strengths: ['Asked about timeline.'], opportunities: [], recommendedDrill: 'Try it again.' });
    const { POST } = await import('@/app/api/analyze/route');
    const res = await POST(post({ personaId: 're-listing-commission', transcript: [{ role: 'assistant', content: 'Why pay you more?' }, { role: 'user', content: 'What matters most to you in this sale?' }] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(JSON.stringify(body)).not.toMatch(BEER_WORDS);
    expect(body.analysis.coachingTips).toEqual([SAFE_TIPS['real-estate']]);
    const prompt = sent[0].messages[0].content as string;
    expect(prompt).toMatch(/real estate/);
    expect(prompt).not.toMatch(/tied-house/);
  });

  it('the demo chat uses the non-beer buyer lock and refuses beer incentives on insurance', async () => {
    const { POST } = await import('@/app/api/groq/route');
    const ok = await POST(post({ personaId: 'ins-policy-renewal', messages: [{ role: 'assistant', content: 'Calling to cancel.' }, { role: 'user', content: 'I hear you.' }] }));
    expect(ok.status).toBe(200);
    expect(sent[0].messages[0].content).not.toMatch(/kegs|tap handles/);
    const bad = await POST(post({ personaId: 'ins-policy-renewal', incentiveId: getSampleIncentive(SAMPLE_INCENTIVES[0].id)!.id, messages: [{ role: 'user', content: 'hi' }] }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/only for beer/);
  });
});
