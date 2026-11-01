// Alcohol trade-practice guardrails for AI coaching.
//
// Beer distributors and brewers are "industry members" under the federal
// tied-house rules (27 CFR part 6) and similar state laws. Coaching that tells
// a rep to give an account free product, pay for or reimburse the account's
// advertising, pay for placement, or hand over money or services to win a tap
// line can coach a rep into a violation. These rules keep the debrief on legal
// tactics. They are guardrails for training feedback, not legal advice.
//
// Sources: 27 CFR 6.21 (unlawful inducements), 6.51-6.54 (paying for advertising,
// display or distribution, cooperative advertising), 6.84 (point-of-sale
// materials), 6.91 (samples), 6.98 (educational seminars), 6.99 (stocking and
// rotating), 27 CFR part 8 (exclusive outlets), 27 CFR part 11 (consignment sales).

export const COACHING_COMPLIANCE_RULES = `
COMPLIANCE (alcohol trade-practice / tied-house rules; follow these in EVERY tip, opportunity, strength and drill):
- Never tell the rep to give the account free or discounted product to win the placement: no free kegs, cases, pints, rounds, "on the house" beer, or product to pour for free.
- Never tell the rep to pay for, split, reimburse or "cover" the account's advertising, social ads, boosted posts, flyers, events, staff, tap fees, slotting or placement fees. That includes "I'll run a $X Facebook/Instagram ad for your bar".
- Tap fees, slotting fees, promo budgets and event money paid to the account are not negotiating items. Never tell the rep to quote, negotiate, waive, reduce or "get back to them on" a tap fee or a promo budget for the account; product pricing (case and keg price) is fine to discuss.
- Never suggest cash, gift cards, rebates to the account, free equipment, loans, extended credit, guaranteed sales, buy-backs or "we'll take it back if it doesn't sell", or asking for an exclusive (only-our-brand) tap or shelf.
- If the buyer asks for any of those, the best answer is a polite, clear no plus a legal alternative. Credit the rep for doing that; never penalize the rep for refusing.
- Coach toward legal tactics instead: discovery about the account's goals; brand story and product fit; velocity and sell-through facts the rep can actually source; placement, rotation and keg-change timing; menu and tap-list features; staff product education and tastings within the law; branded point-of-sale materials (coasters, tap markers, posters) without paying the account to use them; stocking and rotating the rep's own product; pricing within the account's and the law's limits; promoting the brand on the brand's own channels; and following up with a clear next step.
- When a tactic depends on state law or company policy, say "check your state rules and your compliance team" instead of inventing a rule.`;

// Phrases that signal coaching toward an inducement. Matched against the model's
// coaching output after scoring as a safety net in case the prompt is ignored.
const INDUCEMENT_PATTERNS: RegExp[] = [
  // free product / free pours
  /\bfree\s+(?:pints?|beers?|kegs?|cases?|rounds?|product|pours?|drinks?|samples?\s+for\s+(?:customers|guests|patrons))\b/i,
  /\b(?:on\s+the\s+house|comp(?:ed|ing)?\s+(?:a\s+)?(?:keg|case|round|pints?))\b/i,
  /\b(?:give|offer|throw\s+in|provide|donate)\s+(?:them\s+|the\s+(?:account|buyer|owner|bar|store)\s+)?(?:a\s+|an\s+|some\s+)?(?:free|complimentary|extra)\s+(?:keg|case|pint|beer|product|round)s?\b/i,
  /\bbuy\s+(?:a|the)\s+round\b/i,
  // paying for the account's advertising or placement
  /\$\s?\d[\d,]*(?:\.\d+)?\s*(?:local\s+)?(?:facebook|instagram|meta|social(?:\s+media)?|google|digital|online|radio|print|newspaper)?\s*(?:ad|ads|advert\w*|boost\w*|campaign|ad\s+spend)\b/i,
  /\b(?:run|buy|pay\s+for|fund|cover|split|reimburse|sponsor)\s+(?:a\s+|an\s+|the\s+|their\s+|some\s+)?(?:local\s+)?(?:facebook|instagram|meta|social(?:\s+media)?|google|digital|paid|boosted)?\s*(?:ads?|advertising|ad\s+spend|marketing\s+(?:costs?|spend|budget))\b/i,
  /\b(?:cover|pay\s+for|split|reimburse)\s+(?:the\s+|their\s+|your\s+|his\s+|her\s+)?(?:bar'?s\s+|account'?s\s+|store'?s\s+)?marketing\b/i,
  /\b(?:cover|pay|split|reimburse)\s+(?:the\s+|their\s+|your\s+)?(?:promotion|promo|event|staff|tap|slotting|placement|advertising)\s+(?:costs?|fees?|spend|budget|expenses?|bill)\b/i,
  /\b(?:co-?op|cooperative)\s+(?:ad|ads|advertising|marketing)\b/i,
  /\b(?:pay|offer|cover|split)\s+(?:a\s+|the\s+|their\s+)?slotting\s+(?:fee|allowance)s?\b/i,
  // money, equipment, guaranteed sales, exclusivity
  // "cash" alone is too broad ("cash flow", "cash-and-carry"); flag money handed to the account.
  /\b(?:give|offer|pay|hand|slip)\w*\s+(?:\w+\s+){0,3}cash\b|\bcash\s+(?:incentives?|payments?|back|bonus(?:es)?|rebates?|to\s+the\s+(?:account|bar|store|owner))\b/i,
  /\b(?:gift\s+cards?|kickbacks?|rebates?\s+to\s+the\s+(?:account|bar|store|owner))\b/i,
  // treating a tap fee or a promo budget for the account as something the rep provides
  /\b(?:provide|quote|give|offer|share|get|waive|reduce|lower|negotiate|cover|discuss|send|confirm)\w*\s+(?:\w+\s+){0,4}tap[- ]?(?:handle\s+)?fees?\b/i,
  /\b(?:offer|provide|give|commit|promise|share|fund|put\s+up)\w*\s+(?:\w+\s+){0,4}(?:promo(?:tional)?|marketing|event|launch)\s+(?:budgets?|dollars|money|funds?|funding|spend)\b/i,
  /\b(?:free|loan(?:ed)?|lend)\s+(?:a\s+)?(?:kegerator|draft\s+system|cooler|fridge|equipment|tap\s+system)\b/i,
  /\b(?:guaranteed?\s+(?:sale|sell[- ]through)|buy[- ]?back|take\s+(?:it|them|the\s+kegs?)\s+back\s+if)\b/i,
  /\bexclusiv(?:e|ity)\s+(?:tap|handle|line|shelf|placement|account)s?\b(?!\s+(?:takeovers?|nights?|events?))|\b(?:tap|handle|line)\s+exclusivity\b/i,
];

// A match right after one of these words is the line warning against the tactic
// ("declined to cover their ad spend", "don't offer free kegs"), not recommending it.
const NEGATION_BEFORE = /\b(?:declin\w*|refus\w*|stop\w*|turn(?:ed|s)?\s+down|said\s+no|say\s+no|not\s+allowed|prohibit\w*|illegal|unlawful|can'?t|cannot|won'?t|wouldn'?t|shouldn'?t|never|don'?t|do\s+not|avoid\w*|no|without|rather\s+than|instead\s+of\s+(?:offering|promising|giving|paying))\b[^.;!?]{0,30}$/i;

// "When the buyer asks you to cover the tap fee, say no and offer a staff tasting":
// the match describes the buyer's ask, and the line coaches a refusal. Kept only when
// the line also says no somewhere and never tells the rep to go along with it.
const ASK_CONTEXT = /\b(?:asks?|asked|asking|request\w*|demand\w*|wants?|wanted|push(?:es|ed|ing)?\s+for|brings?\s+up|mentions?|raises?|fish\w*\s+for)\b[^.;!?]{0,40}$/i;
const REFUSAL_CUE = /\b(?:say\s+no|said\s+no|(?:clear|polite|firm|friendly),?\s+no\b|declin\w*|refus\w*|turn\w*\s+(?:it\s+|that\s+)?down|can'?t|cannot|not\s+allowed|off\s+the\s+table|not\s+something\s+(?:you|we)\s+can|illegal|unlawful|tied-house|legal\s+alternatives?)\b/i;
const GO_ALONG = /\b(?:agree\s+to|say\s+yes|go\s+ahead\s+and|accept\s+(?:the|their)|meet\s+them\s+halfway|split\s+the\s+difference)\b/i;
// "The rep offered to cover the tap fee, which is a tied-house problem": an
// opportunity that names the mistake and why it's wrong.
const CORRECTION_AFTER = /\b(?:tied-house|not\s+allowed|illegal|unlawful|violat\w*|against\s+the\s+(?:law|rules)|can'?t\s+legally|isn'?t\s+legal|not\s+legal|compliance\s+(?:problem|issue|risk))\b/i;

/** True when a coaching line recommends something that reads as a prohibited inducement. */
export function recommendsInducement(text: string): boolean {
  for (const re of INDUCEMENT_PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of text.matchAll(g)) {
      const at = m.index ?? 0;
      const before = text.slice(Math.max(0, at - 60), at);
      const after = text.slice(at + m[0].length);
      if (NEGATION_BEFORE.test(before)) continue;
      if (ASK_CONTEXT.test(before) && REFUSAL_CUE.test(text) && !GO_ALONG.test(text)) continue;
      if (CORRECTION_AFTER.test(after) && !GO_ALONG.test(text)) continue;
      return true;
    }
  }
  return false;
}

export const SAFE_MARKETING_TIP =
  "When the buyer asks what you'll do to bring people in, be specific about what you can legally do: plan the tap takeover date and keg-change timing, bring branded coasters and tap markers, run a staff tasting so the bartenders can sell it, and promote the night on the brand's own social channels. Don't offer to pay for the account's ads or give product away; check your state rules and compliance team if you're unsure.";

/**
 * Drops coaching lines that recommend an inducement. If a list loses every line
 * it gets the safe fallback (for tips) or stays empty.
 */
export function sanitizeCoachingList(items: string[], fallback?: string): { items: string[]; removed: number } {
  const kept = items.filter((t) => !recommendsInducement(t));
  const removed = items.length - kept.length;
  if (removed > 0 && fallback && !kept.includes(fallback)) kept.push(fallback);
  return { items: kept, removed };
}

// ── Real estate: fair housing ──────────────────────────────────────────────────
// Safety net for real estate debriefs: drop a coaching line that steers or sorts
// clients or neighborhoods by a protected class (Fair Housing Act, 42 U.S.C. 3604,
// and state laws that add classes). A line that warns against it is kept.
const STEERING_PATTERNS: RegExp[] = [
  /\b(?:people|families|folks|neighbou?rs|buyers|residents|crowd)\s+like\s+(?:you|yours|them|us|your\s+family)\b/i,
  /\b(?:race|racial\w*|ethnic\w*|religio\w*|national\s+origin|immigrants?|disabilit\w*|handicap\w*|familial\s+status|demographic\w*)\b/i,
  /\b(?:safe|good|nice|right|best|better)\s+(?:neighbou?rhoods?|areas?|parts?\s+of\s+town|communit(?:y|ies))\s+for\s+(?:you|your\s+(?:family|kids)|families|kids|people)\b/i,
  /\b(?:who|the\s+type\s+of\s+people\s+who|what\s+kind\s+of\s+people)\s+(?:lives?|live)\s+(?:there|in\s+(?:the|that)\s+(?:area|neighbou?rhood))\b/i,
  /\bsteer\w*\b/i,
];
const FAIR_HOUSING_NEGATION = new RegExp(NEGATION_BEFORE.source.replace('rather\\s+than', 'rather\\s+than|redirect\\w*|refer\\w*|fair[- ]housing|neutral|regardless\\s+of|based\\s+on\\s+anything\\s+but'), 'i');

/** True when a real estate coaching line steers on, or sorts by, a protected class. */
export function recommendsSteering(text: string): boolean {
  for (const re of STEERING_PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of text.matchAll(g)) {
      const before = text.slice(Math.max(0, (m.index ?? 0) - 60), m.index ?? 0);
      if (!FAIR_HOUSING_NEGATION.test(before)) return true;
    }
  }
  return false;
}

/** Like sanitizeCoachingList, with any "is this line unsafe?" check. */
export function filterCoachingList(items: string[], unsafe: (t: string) => boolean, fallback?: string): { items: string[]; removed: number } {
  const kept = items.filter(t => !unsafe(t));
  const removed = items.length - kept.length;
  if (removed > 0 && fallback && !kept.includes(fallback)) kept.push(fallback);
  return { items: kept, removed };
}
