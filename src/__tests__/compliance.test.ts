import { describe, it, expect } from 'vitest';
import { recommendsInducement, sanitizeCoachingList, SAFE_MARKETING_TIP, COACHING_COMPLIANCE_RULES } from '@/lib/compliance';
import { buildScoringPrompt, parseAnalysis } from '@/lib/server/scoring';
import { BEER_SAFE_TIP_2, SAFE_DRILLS } from '@/lib/industry';

describe('coaching compliance (tied-house)', () => {
  const bad = [
    "State exactly what you will do (e.g., 'I will run a $50 local Facebook ad targeting a 5-mile radius and post on our brand page').",
    'Offer them a free keg to get on the line.',
    'Throw in free pints for the staff on launch night.',
    'Tell him you will cover the marketing for the takeover.',
    'Offer to split the event costs with the bar.',
    'Promise to take the kegs back if it does not sell.',
    'Ask for tap exclusivity in the area.',
    'Offer to pay the slotting fee for the endcap.',
    'Buy a round for the regulars to build goodwill.',
  ];
  const good = [
    'Ask one or two discovery questions about what a good Tuesday looks like.',
    'Offer a staff tasting so bartenders can sell it, plus branded coasters and tap markers.',
    'The rep correctly declined to cover the bar’s marketing costs and offered POS instead.',
    "Don't offer free kegs; propose a keg-change date and a tap takeover plan instead.",
    SAFE_MARKETING_TIP,
  ];
  it('flags coaching that recommends an inducement', () => {
    for (const t of bad) expect(recommendsInducement(t), t).toBe(true);
  });
  it('keeps legal coaching and lines that warn against inducements', () => {
    for (const t of good) expect(recommendsInducement(t), t).toBe(false);
  });
  it('replaces dropped tips with the safe marketing tip', () => {
    const r = sanitizeCoachingList([bad[0], good[0]], SAFE_MARKETING_TIP);
    expect(r.removed).toBe(1);
    expect(r.items).toEqual([good[0], SAFE_MARKETING_TIP]);
  });
  it('puts the compliance rules in the scoring prompt', () => {
    const p = buildScoringPrompt({ scenarioName: 'Bar owner', incentive: null, durationSeconds: 60, transcript: [{ role: 'user', content: 'hi' }] });
    expect(p).toContain(COACHING_COMPLIANCE_RULES.trim().slice(0, 40));
    expect(p).toMatch(/free or discounted product/);
  });
  it('strips inducement advice from a parsed debrief', () => {
    const a = parseAnalysis(JSON.stringify({ overallScore: 45, coachingTips: [bad[0]], opportunities: [bad[1], good[0]], strengths: [], recommendedDrill: 'Practice offering free pints.' }), null)!;
    expect(a.coachingTips).toEqual([SAFE_MARKETING_TIP, BEER_SAFE_TIP_2]);
    expect(a.opportunities).toEqual([good[0]]);
    expect(a.recommendedDrill).toBe(SAFE_DRILLS['beer-distribution']);
  });
});
