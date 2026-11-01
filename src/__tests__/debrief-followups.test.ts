// Follow-ups from the Nov 1 prod beer round: compliant beer tips were being filtered
// out, a bar owner reply came back as two answers glued together, and debrief
// strengths/opportunities pasted the trainee's own lines back verbatim.
import { describe, it, expect } from 'vitest';
import { recommendsInducement, SAFE_MARKETING_TIP } from '@/lib/compliance';
import { buildScoringPrompt, parseAnalysis } from '@/lib/server/scoring';
import { BEER_SAFE_TIP_2, CATEGORY_IDS, SAFE_DRILLS, SAFE_TIPS, SECOND_SAFE_TIPS, type IndustryProfile } from '@/lib/industry';
import { cleanReply, EMPTY_REPLY_FALLBACK, firstReplySegment } from '@/lib/roleplay';
import { roleplayReply } from '@/lib/server/roleplay-reply';
import { trimTraineeQuotes } from '@/lib/server/debrief-quotes';
import type { groqChat } from '@/lib/server/groq-chat';

const json = (o: Record<string, unknown>) => JSON.stringify({ overallScore: 60, discovery: 70, objectionHandling: 40, valueArticulation: 55, confidencePacing: 65, closingTechnique: 50, strengths: [], opportunities: [], ...o });

describe('beer compliance filter keeps compliant coaching', () => {
  const compliant = [
    'When the owner asks you to cover the tap fee, politely say no and offer a staff tasting and branded tap markers instead.',
    "If the buyer pushes for a promo budget, explain that tied-house rules mean you can't fund one, then offer legal alternatives like a tap takeover plan.",
    'The rep offered to waive the tap fee, which is a tied-house violation; next time decline and pivot to rotation and keg-change timing.',
    "Plan an exclusive tap takeover night and promote it on the brand's own social channels.",
    "Confirm the account's cash flow and payment terms before the first order.",
    'When asked for a tap fee or promo money, give a clear, friendly no and move to what you can legally do.',
    'Quote the case and keg price clearly, then tie it to the margin they told you they need.',
    SAFE_MARKETING_TIP,
    BEER_SAFE_TIP_2,
    SAFE_DRILLS['beer-distribution'],
  ];
  const inducements = [
    "Let me get the precise tap fee and case price for you by end of day.",
    'Offer a promo budget of $200 to help launch the beer.',
    'If they ask, agree to cover the tap fee for the first month.',
    'Offer them cash to switch from the competitor.',
    'Negotiate the tap fee down before you ask for the order.',
    'Ask for tap exclusivity in the area.',
  ];
  it.each(compliant)('keeps: %s', (t) => expect(recommendsInducement(t)).toBe(false));
  it.each(inducements)('still drops: %s', (t) => expect(recommendsInducement(t)).toBe(true));

  it('a tap-fee debrief keeps the compliant tip and still gets two tips and a drill', () => {
    const a = parseAnalysis(json({ coachingTips: [compliant[0], inducements[0]], recommendedDrill: 'Practice offering a promo budget to close faster.' }), null, 'beer-distribution')!;
    expect(a.coachingTips).toEqual([compliant[0], SAFE_MARKETING_TIP]);
    expect(a.recommendedDrill).toBe(SAFE_DRILLS['beer-distribution']);
  });

  it('beer keeps a compliant model drill', () => {
    const drill = 'Run the call again: when the buyer asks for a tap fee, say no and pitch a staff tasting, then ask for a trial line.';
    expect(parseAnalysis(json({ coachingTips: ['x'], recommendedDrill: drill }), null)!.recommendedDrill).toBe(drill);
  });

  it.each(CATEGORY_IDS.concat('b2b' as never) as IndustryProfile[])('%s always returns at least 2 tips and a drill', (profile) => {
    for (const tips of [[], ['Ask one more discovery question before you pitch.']]) {
      const a = parseAnalysis(json({ coachingTips: tips }), null, profile)!;
      expect(a.coachingTips.length).toBeGreaterThanOrEqual(2);
      expect(new Set(a.coachingTips).size).toBe(a.coachingTips.length);
      expect(a.recommendedDrill).toBeTruthy();
      if (profile !== 'beer-distribution') {
        const p = profile as Exclude<IndustryProfile, 'beer-distribution'>;
        expect([SAFE_TIPS[p], SECOND_SAFE_TIPS[p]]).toContain(a.coachingTips[a.coachingTips.length - 1]);
        expect(a.recommendedDrill).toBe(SAFE_DRILLS[profile]);
      }
    }
  });

  it('the beer scoring prompt says tap fees and promo budgets are not negotiating items', () => {
    const p = buildScoringPrompt({ scenarioName: 'Bar', incentive: null, durationSeconds: 60, transcript: [{ role: 'user', content: 'hi' }] });
    expect(p).toMatch(/Tap fees, slotting fees, promo budgets/);
  });
});

describe('glued replies', () => {
  const prod = "Right now we're running a few domestic lagers, a couple of Irish stouts, and a handful of seasonal IPAs. I'd also love a brand that can pull a crowd for a tap takeover or a themed night.Got it. We're already stocked with the basics, but we're craving something new.";
  it('keeps only the first answer when two are glued together', () => {
    expect(cleanReply(prod)).toBe("Right now we're running a few domestic lagers, a couple of Irish stouts, and a handful of seasonal IPAs. I'd also love a brand that can pull a crowd for a tap takeover or a themed night.");
  });
  it('drops leaked planning notes', () => {
    expect(firstReplySegment('The crowd keeps asking for a West Coast pale for our fall tasting.We need to ask about margins, tap fees, promo support.If I bring it in, what is the pour cost?'))
      .toBe('The crowd keeps asking for a West Coast pale for our fall tasting.');
  });
  it('cuts a made-up next turn for the trainee', () => {
    expect(cleanReply('Sounds fine, but what does it cost me per keg?\nRep: Great question, it is...')).toBe('Sounds fine, but what does it cost me per keg?');
  });
  it('leaves normal replies alone', () => {
    for (const t of [
      "So I've got 12 taps. Four are already local craft, three are macros, and the rest rotate.",
      'U.S. craft is flat this year. What makes yours different?',
      'It rates 4.5 on the menu app.',
      'Fine.Go on.',
      "Honestly? I'm not sure. Tell me more.",
    ]) expect(cleanReply(t)).toBe(t);
  });

  const fakeChat = (outputs: string[]) => {
    const calls: unknown[] = [];
    const chat = (async (_k: string, opts: unknown) => { calls.push(opts); return { ok: true, content: outputs.shift() ?? '', model: 'm' }; }) as unknown as typeof groqChat;
    return { chat, calls };
  };
  it('roleplayReply returns the first segment of a glued reply', async () => {
    const { chat } = fakeChat([prod]);
    const r = await roleplayReply('k', [{ role: 'user', content: 'hi' }], 'nh-bar-owner', 300, chat);
    expect(r.ok && r.content.endsWith('themed night.')).toBe(true);
  });
  it('an empty reply is retried once, then a neutral line is used', async () => {
    const one = fakeChat(['', 'What would it cost me?']);
    const r1 = await roleplayReply('k', [{ role: 'user', content: 'hi' }], 're-listing-commission', 300, one.chat, 'real-estate');
    expect(r1.ok && r1.content).toBe('What would it cost me?');
    const two = fakeChat(['', '']);
    const r2 = await roleplayReply('k', [{ role: 'user', content: 'hi' }], 're-listing-commission', 300, two.chat, 'real-estate');
    expect(r2.ok && r2.content).toBe(EMPTY_REPLY_FALLBACK);
    expect(two.calls).toHaveLength(2);
  });
});

describe('debriefs paraphrase instead of pasting trainee lines', () => {
  const lines = [
    "Fair question. Before I pitch anything, what's selling on your rotating lines right now, and what are customers asking for that you don't have?",
    "How about we start with one rotating line for a trial, I'll check velocity in four weeks, and I'll book the staff tasting for next Monday. Can I put in the order for a first keg today?",
  ];
  it('drops an item that is just a trainee line', () => {
    expect(trimTraineeQuotes(lines[0], lines)).toBeNull();
    expect(trimTraineeQuotes(`"${lines[1]}"`, lines)).toBeNull();
  });
  it('shortens a long quote but keeps the coaching around it', () => {
    const item = `The rep opened with a strong discovery question: '${lines[0]}' This shifted the focus to the buyer's needs before offering a solution.`;
    const out = trimTraineeQuotes(item, lines)!;
    expect(out).toContain("The rep opened with a strong discovery question: 'Fair question. Before I pitch anything, what's selling…'");
    expect(out).toContain("This shifted the focus to the buyer's needs");
    expect(out.length).toBeLessThan(item.length);
  });
  it('leaves paraphrase and short quotes alone', () => {
    const item = "Opened with discovery ('what's selling on your rotating lines') before pitching, which earned the buyer's attention.";
    expect(trimTraineeQuotes(item, lines)).toBe(item);
  });
  it('a debrief of pasted lines falls back to the scorecard', () => {
    const a = parseAnalysis(json({ coachingTips: ['a', 'b'], strengths: [lines[0]], opportunities: [lines[1]] }), null, 'beer-distribution', lines)!;
    expect(a.strengths).toEqual(['Discovery was your strongest area on this call (70/100). Keep doing what worked there.']);
    expect(a.opportunities[0]).toMatch(/^Objection Handling is the area to work on next \(40\/100\)\. Next time, check yourself on this: did you address pushback/);
    expect(JSON.stringify(a)).not.toContain(lines[0]);
  });
  it('HR fallbacks use the HR labels', () => {
    const a = parseAnalysis(json({ coachingTips: [], strengths: [], opportunities: [] }), null, 'hr-management')!;
    expect(a.strengths[0]).toMatch(/^Listening was your strongest area/);
    expect(a.opportunities[0]).toMatch(/^Empathy is the area to work on next/);
  });
  it('the scoring prompt asks for paraphrase', () => {
    const p = buildScoringPrompt({ scenarioName: 'X', incentive: null, durationSeconds: 60, transcript: [{ role: 'user', content: 'hi' }], profile: 'real-estate' });
    expect(p).toMatch(/in your own words/);
    expect(p).toMatch(/Never paste a whole AGENT \(trainee\) line/);
    expect(p).toMatch(/never put made-up numbers in it/);
  });
});
