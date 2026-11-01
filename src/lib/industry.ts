// Per-industry framing for practice and scoring.
//
// Beer distribution is TrainField's home market, and some rules only make sense
// there: the alcohol tied-house rules, keg and tap-takeover tips, the sample
// incentive programs, and "push for price, delivery or exclusivity" stage notes.
// Everything here keeps those beer pieces inside the beer category and gives the
// other industries their own stage notes, scorecard labels and fallback tip.
//
// A "profile" is the framing used for one call. It is the team category, except the
// three generic sales personas (difficult customer, new account, hostile prospect),
// which are plain B2B sales calls wherever they appear.

import { PERSONA_BY_CATEGORY } from '@/lib/personas/index';

export const CATEGORY_IDS = ['beer-distribution', 'retail', 'hr-management', 'real-estate', 'insurance'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];
export type IndustryProfile = CategoryId | 'b2b';

export const BEER: CategoryId = 'beer-distribution';

const GENERIC_SALES_IDS = new Set(['difficult-customer', 'new-account-pitch', 'hostile-prospect']);

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === 'string' && (CATEGORY_IDS as readonly string[]).includes(v);
}

/** A known category id, or beer (the default for teams created before categories). */
export function normalizeCategory(v: unknown): CategoryId {
  return isCategoryId(v) ? v : BEER;
}

const CATEGORY_OF_BUILT_IN = new Map<string, CategoryId>();
for (const [cat, list] of Object.entries(PERSONA_BY_CATEGORY)) {
  for (const p of list as { id: string }[]) {
    if (isCategoryId(cat) && !CATEGORY_OF_BUILT_IN.has(p.id)) CATEGORY_OF_BUILT_IN.set(p.id, cat);
  }
}

/** Category a built-in persona belongs to; null for custom personas and unknown ids. */
export function builtInCategory(personaId: unknown): CategoryId | null {
  return typeof personaId === 'string' ? CATEGORY_OF_BUILT_IN.get(personaId) ?? null : null;
}

/**
 * Framing for a call. Built-in personas use their own category; custom personas use
 * the team's category (beer when unknown).
 */
export function profileFor(personaId: unknown, teamCategory?: unknown): IndustryProfile {
  if (typeof personaId === 'string' && GENERIC_SALES_IDS.has(personaId)) return 'b2b';
  return builtInCategory(personaId) ?? normalizeCategory(teamCategory);
}

export function isBeerProfile(p: IndustryProfile): boolean {
  return p === BEER;
}

/** Sample incentive programs are beer distributor programs; nowhere else. */
export function incentivesAllowed(p: IndustryProfile): boolean {
  return isBeerProfile(p);
}

// ── Scorecard ────────────────────────────────────────────────────────────────
// The five score fields are the same columns for every industry (no schema change);
// the label and what the coach grades differ.

export type SkillKey = 'discovery' | 'objectionHandling' | 'valueArticulation' | 'confidencePacing' | 'closingTechnique';
export type Scorecard = {
  kind: 'sales' | 'conversation';
  coach: string;
  callType: string;
  traineeLabel: string;
  otherLabel: string;
  overall: string;
  skills: { key: SkillKey; label: string; guidance: string }[];
};

const SALES_LABELS: Record<SkillKey, string> = {
  discovery: 'Discovery',
  objectionHandling: 'Objection Handling',
  valueArticulation: 'Value Articulation',
  confidencePacing: 'Confidence & Pacing',
  closingTechnique: 'Closing Technique',
};

function salesCard(o: { coach: string; callType: string; trainee: string; other: string; guidance: Record<SkillKey, string>; labels?: Partial<Record<SkillKey, string>> }): Scorecard {
  const labels = { ...SALES_LABELS, ...o.labels };
  return {
    kind: 'sales',
    coach: o.coach,
    callType: o.callType,
    traineeLabel: o.trainee,
    otherLabel: o.other,
    overall: 'how compelling, well-paced and next-step-oriented the conversation was',
    skills: (Object.keys(SALES_LABELS) as SkillKey[]).map(key => ({ key, label: labels[key], guidance: o.guidance[key] })),
  };
}

const SCORECARDS: Record<IndustryProfile, Scorecard> = {
  'beer-distribution': salesCard({
    coach: 'an expert beer distribution sales coach',
    callType: 'sales roleplay',
    trainee: 'SALES REP (trainee)',
    other: 'BUYER (AI roleplay)',
    guidance: {
      discovery: "did they ask good questions to uncover the account's needs, budget, timeline and decision process?",
      objectionHandling: 'did they address pushback without conceding too quickly?',
      valueArticulation: 'did they lead with velocity, margin impact or differentiation before price?',
      confidencePacing: 'were they concise and confident, or did they ramble or trail off?',
      closingTechnique: 'did they ask for the order, push for a next step, or try to close?',
    },
  }),
  'b2b': salesCard({
    coach: 'an expert B2B sales coach',
    callType: 'sales roleplay',
    trainee: 'SALES REP (trainee)',
    other: 'PROSPECT (AI roleplay)',
    guidance: {
      discovery: "did they ask good questions to uncover the prospect's needs, budget, timeline and decision process?",
      objectionHandling: 'did they address pushback without conceding too quickly?',
      valueArticulation: 'did they lead with outcomes, ROI or differentiation before price?',
      confidencePacing: 'were they concise and confident, or did they ramble or trail off?',
      closingTechnique: 'did they ask for the business or a specific next step with a date?',
    },
  }),
  'retail': salesCard({
    coach: 'an expert retail sales and customer service coach',
    callType: 'in-store sales roleplay',
    trainee: 'STORE ASSOCIATE (trainee)',
    other: 'CUSTOMER (AI roleplay)',
    labels: { closingTechnique: 'Closing & Add-ons' },
    guidance: {
      discovery: "did they ask what the customer needs, how they'll use it and what matters most before recommending?",
      objectionHandling: 'did they handle price, fit and "I saw it cheaper" pushback calmly, without overpromising on store policy?',
      valueArticulation: "did they connect the product's features to what the customer said they need?",
      confidencePacing: 'were they friendly, concise and confident, without pressure or rambling?',
      closingTechnique: 'did they ask for the sale or a clear next step, and suggest add-ons only when they truly fit?',
    },
  }),
  'real-estate': salesCard({
    coach: 'an expert real estate sales coach',
    callType: 'real estate client roleplay',
    trainee: 'AGENT (trainee)',
    other: 'CLIENT (AI roleplay)',
    labels: { closingTechnique: 'Next Step & Commitment' },
    guidance: {
      discovery: "did they uncover the client's motivation, timeline, finances and must-haves before giving advice?",
      objectionHandling: 'did they handle pushback (price, commission, timing, "we can do it ourselves") with facts and empathy, without caving or arguing?',
      valueArticulation: 'did they explain their plan, process and the market data they would actually use, instead of vague claims?',
      confidencePacing: 'were they calm, clear and confident, without jargon or rambling?',
      closingTechnique: 'did they ask for a commitment: a signed agreement, the next appointment, or a clear decision date?',
    },
  }),
  'insurance': salesCard({
    coach: 'an expert insurance agent and client service coach',
    callType: 'insurance client roleplay',
    trainee: 'AGENT (trainee)',
    other: 'CLIENT (AI roleplay)',
    labels: { valueArticulation: 'Coverage Explanation', closingTechnique: 'Next Step & Commitment' },
    guidance: {
      discovery: "did they ask about the client's situation, exposures, current coverage and what they want protected?",
      objectionHandling: 'did they handle frustration and price pushback calmly, without promising coverage or claim outcomes they cannot guarantee?',
      valueArticulation: 'did they explain coverage, exclusions and the process in plain language, and show value beyond price?',
      confidencePacing: 'were they clear, calm and confident, without jargon or rambling?',
      closingTechnique: 'did they agree a specific next step: documents needed, a quote review, a bind decision or a follow-up date?',
    },
  }),
  'hr-management': {
    kind: 'conversation',
    coach: 'an expert workplace communication coach for managers and HR',
    callType: 'workplace conversation roleplay',
    traineeLabel: 'TRAINEE',
    otherLabel: 'OTHER PERSON (AI roleplay)',
    overall: 'how clear, respectful, policy-safe and productive the conversation was',
    skills: [
      { key: 'discovery', label: 'Listening', guidance: 'did they ask open questions, let the other person finish and reflect back what they heard?' },
      { key: 'objectionHandling', label: 'Empathy', guidance: 'did they acknowledge feelings and stay calm and respectful under pushback?' },
      { key: 'valueArticulation', label: 'Clarity', guidance: 'did they state the purpose and key message plainly, with specific examples instead of vague hints?' },
      { key: 'confidencePacing', label: 'Policy-Safe Language', guidance: 'did they stick to facts and policy, avoid promises they cannot keep, avoid any comment on protected characteristics, and avoid threats or retaliation?' },
      { key: 'closingTechnique', label: 'Next Steps & Documentation', guidance: 'did they summarize what was agreed, who does what by when, and what will be written down or followed up?' },
    ],
  },
};

export function scorecardFor(p: IndustryProfile): Scorecard {
  return SCORECARDS[p] ?? SCORECARDS[BEER];
}

/** Score labels for a debrief UI, by score field. */
export function skillLabels(p: IndustryProfile): { key: SkillKey; label: string }[] {
  return scorecardFor(p).skills.map(({ key, label }) => ({ key, label }));
}

// ── Coaching rules and fallback tips ──────────────────────────────────────────

// Beer uses COACHING_COMPLIANCE_RULES from compliance.ts (tied-house). These are the
// guardrails for the other industries. Training guardrails, not legal advice.
export const INDUSTRY_COACHING_RULES: Record<Exclude<IndustryProfile, 'beer-distribution'>, string> = {
  'b2b': `
GUARDRAILS (follow these in EVERY tip, opportunity, strength and drill):
- Never coach the rep to invent facts, statistics, customer names or results; coach them to use facts they can actually source.
- Never coach promises the rep cannot keep (guaranteed results, terms they are not authorized to give).
- When something depends on company policy, say "check with your manager" instead of inventing a rule.`,
  'retail': `
GUARDRAILS (follow these in EVERY tip, opportunity, strength and drill):
- Never coach the associate to promise price matches, returns, discounts or warranties outside store policy; say "check your store policy".
- Never coach pressure tactics or misleading claims about a product.
- Treat every customer the same regardless of who they are; never coach assumptions based on appearance, age, sex, race, religion, disability or national origin.`,
  'real-estate': `
GUARDRAILS (fair housing and agent conduct; follow these in EVERY tip, opportunity, strength and drill):
- Never coach the agent to steer: do not suggest, describe or rank neighborhoods, schools or homes by who lives there or who would "fit", and never base advice on race, color, religion, sex, national origin, disability, familial status, or any other class protected by federal, state or local law.
- If the client asks about the "type of people" in an area, crime, or similar, credit the agent for redirecting to objective sources the client can check themselves and for staying neutral.
- Never coach promises about sale price, appraisal or timing that the agent cannot guarantee, and never invent market statistics; coach the agent to use comparable sales and data they can show.
- Commissions are negotiable; never coach the agent to say a commission is standard, fixed or set by law.
- For legal, tax or lending questions, coach the agent to refer the client to an attorney, tax professional or lender.`,
  'insurance': `
GUARDRAILS (insurance conduct; follow these in EVERY tip, opportunity, strength and drill):
- Never coach the agent to promise coverage, a claim payment, an approval or a price they cannot guarantee, or to describe policy terms inaccurately.
- Never coach offering gifts, cash or anything of value to win a policy (rebating is restricted in many states).
- Never coach decisions or comments based on race, religion, national origin, sex, disability or other protected characteristics.
- When an answer depends on the policy wording, the carrier or state rules, coach the agent to say they will confirm it and follow up.`,
  'hr-management': `
GUARDRAILS (workplace conversations; follow these in EVERY tip, opportunity, strength and drill):
- Never coach promises outside company policy (raises, promotions, job security) or anything that reads as a threat or retaliation.
- Never coach comments about, or decisions based on, age, race, religion, sex, pregnancy, disability, national origin or any other protected characteristic.
- For complaints of harassment or discrimination, accommodation requests, leave, or terminations, coach the trainee to listen, document, and involve HR or legal rather than resolve it alone.
- Coach toward facts and specific examples, not opinions about the person.`,
};

export const SAFE_TIPS: Record<Exclude<IndustryProfile, 'beer-distribution'>, string> = {
  'b2b': 'Ask what a good outcome looks like for them before you pitch, tie your offer to that answer with facts you can back up, and close by asking for a specific next step with a date.',
  'retail': "Ask one or two questions about how they'll use it before recommending anything, connect the product to that answer, and finish by asking if they're ready to take it today or what's holding them back.",
  'real-estate': 'Start with questions about the client\'s goals and timeline, back your pricing or strategy with comparable sales you can show them, and end with a clear next step such as a signed agreement or the next appointment. Keep neighborhood talk to objective facts the client can verify themselves.',
  'insurance': 'Confirm what the client wants protected, explain coverage and exclusions in plain language, never promise how a claim or underwriting decision will go, and agree on a specific next step: documents needed, a quote review, or a follow-up date.',
  'hr-management': "State the purpose in one or two plain sentences, ask an open question and listen before you respond, acknowledge the other person's view, stick to facts and policy, and close by summarizing next steps, owners, dates and what will be documented.",
};

// ── Stage notes, openings and objectives ─────────────────────────────────────
// The four stage ids are shared by every category (labels in categories.ts). The
// notes are written TO THE AI CHARACTER; the objectives are shown to the trainee.

type StageText = Record<'initial-pitch' | 'proposal' | 'negotiation' | 'renewal', string>;

export const BEER_STAGE_CONTEXT: StageText = {
  'initial-pitch': `\n[DEAL STAGE: INITIAL PITCH] You have not heard the rep's pitch yet. You are curious but guarded and deciding whether they are worth your time. Make them earn credibility. Do not volunteer your needs; answer their questions only if they ask good ones.`,
  'proposal': `\n[DEAL STAGE: PROPOSAL] You have seen the rep's proposal and pricing. You are weighing fit and value against cost. Raise specific objections about price, terms and competing options, and ask the rep to justify the switch.`,
  'negotiation': `\n[DEAL STAGE: NEGOTIATION] You are actively negotiating. Push the rep hard for concessions on price, delivery, terms or exclusivity, and use pressure tactics. Only give ground when the rep trades something real for it.`,
  'renewal': `\n[DEAL STAGE: RENEWAL] The rep wants to keep or renew your business. You are not fully happy: bring up past problems (service, out-of-stocks, slow sellers) and make it clear you are open to other options. Do not assume you will stay.`,
};

const STAGE_CONTEXT_BY_PROFILE: Record<IndustryProfile, StageText> = {
  'beer-distribution': BEER_STAGE_CONTEXT,
  'b2b': {
    'initial-pitch': `\n[STAGE: FIRST CONVERSATION] You have not heard the rep's pitch yet. You are guarded and deciding whether they are worth your time. Do not volunteer your needs; answer their questions only if they ask good ones.`,
    'proposal': `\n[STAGE: PROPOSAL] You have seen the rep's proposal and pricing. Weigh fit and value against cost, raise specific objections about price, terms and competing options, and ask the rep to justify the switch.`,
    'negotiation': `\n[STAGE: NEGOTIATION] You are actively negotiating. Push hard for concessions on price, terms, timeline or scope. Only give ground when the rep trades something real for it.`,
    'renewal': `\n[STAGE: RENEWAL] The rep wants to keep your business. Bring up past problems (service issues, missed commitments, cost) and make it clear you are open to other options.`,
  },
  'retail': {
    'initial-pitch': `\n[STAGE: GREETING & NEEDS] The associate is just approaching you. You are polite but a little guarded and do not explain everything you need unless they ask good questions.`,
    'proposal': `\n[STAGE: PRODUCT DEMO] The associate is showing you options. React honestly: ask how it fits your needs, what the difference is between options, and whether it is worth the price.`,
    'negotiation': `\n[STAGE: OBJECTIONS] You are hesitating. Raise real objections: price, fit, a cheaper option you saw elsewhere, or wanting to think about it. Soften only if the associate addresses your actual concern.`,
    'renewal': `\n[STAGE: CLOSE & ADD-ONS] You are close to buying. You are wary of being upsold; accept a suggestion only if the associate explains why it helps you.`,
  },
  'real-estate': {
    'initial-pitch': `\n[STAGE: FIRST MEETING] You are meeting this agent for the first time and deciding whether to trust them. Do not share your full situation unless they ask good questions.`,
    'proposal': `\n[STAGE: PROPOSAL] The agent has presented their plan, pricing advice or terms. Question how they reached their numbers and what they will actually do for you.`,
    'negotiation': `\n[STAGE: NEGOTIATION] You are pushing back on the agent's advice or terms (price, commission, timeline or strategy). Only move when the agent gives you a clear reason grounded in facts.`,
    'renewal': `\n[STAGE: CLOSING & COMMITMENT] You are close to a decision but nervous. Raise your remaining worries and make the agent earn the commitment.`,
  },
  'insurance': {
    'initial-pitch': `\n[STAGE: FIRST CONVERSATION] You are starting the conversation with the agent and are not sure they can help. Share details only when they ask good questions.`,
    'proposal': `\n[STAGE: QUOTE / OPTIONS] The agent has presented a quote, an option or a decision. Ask what you are actually getting, what is not covered, and why it costs what it does.`,
    'negotiation': `\n[STAGE: PUSHBACK] You disagree with the price, the coverage or the decision. Press for answers and alternatives; calm down only when the agent explains clearly and honestly.`,
    'renewal': `\n[STAGE: RENEWAL / RETENTION] Your policy is up for renewal or you are thinking of leaving. Bring up what has frustrated you and make it clear you are comparing options.`,
  },
  'hr-management': {
    'initial-pitch': `\n[STAGE: OPENING & CONTEXT] The conversation is just starting. Stay in your character's position and react to how the trainee opens; do not jump ahead to the main issue on your own.`,
    'proposal': `\n[STAGE: CORE MESSAGE] The main message (feedback, a request, a decision or a concern) is on the table. React honestly as your character would and ask what it means for you.`,
    'negotiation': `\n[STAGE: DISAGREEMENT] You disagree with part of what has been said. Push back with your own reasons and feelings; soften only when the trainee listens, acknowledges your view and offers something concrete.`,
    'renewal': `\n[STAGE: WRAP-UP & NEXT STEPS] The conversation is wrapping up. Ask what exactly was agreed, who does what by when, and what will be written down; do not let it end vague.`,
  },
};

export function stageContextFor(p: IndustryProfile, dealStage: string): string {
  return (STAGE_CONTEXT_BY_PROFILE[p] ?? BEER_STAGE_CONTEXT)[dealStage as keyof StageText] || '';
}

// What the character says first at each later stage (the persona's own opening line
// is used for the first stage). Shared by the practice page and the server.
const SALES_OPENINGS: Partial<StageText> = {
  'proposal': `Thanks for sending that over. I've had a chance to look it over and I have some questions — some of the pricing is higher than what I expected. Can we walk through it?`,
  'negotiation': `Okay, I've got leadership involved and they have concerns. If we're going to move forward, we need to talk about what you can actually give us here. What's flex?`,
  'renewal': `I appreciate you reaching out about renewing, but I'd be lying if I said everything was great this year. We need to talk about what's changed.`,
};

const STAGE_OPENINGS_BY_PROFILE: Record<IndustryProfile, Partial<StageText>> = {
  'beer-distribution': SALES_OPENINGS,
  'b2b': SALES_OPENINGS,
  'retail': {
    'proposal': `Okay, I looked at the one you showed me. It's more than I wanted to spend, so walk me through why it's worth it.`,
    'negotiation': `Honestly, I saw something similar for less somewhere else. Why would I buy it here?`,
    'renewal': `I think I'm leaning toward this one. Is there anything else I actually need, or is that just the upsell?`,
  },
  'real-estate': {
    'proposal': `I've looked at what you put together. Before we decide anything, help me understand how you got to those numbers.`,
    'negotiation': `I've thought about it, and I'm not sold on all of this yet. What's actually negotiable here?`,
    'renewal': `We're close, but I'm nervous about committing. What happens next, and what if it doesn't go the way you said?`,
  },
  'insurance': {
    'proposal': `I looked at what you sent. It's more than I expected, so walk me through what I'm actually paying for.`,
    'negotiation': `I'm not happy with where this landed. What are my options here?`,
    'renewal': `My renewal came in and I need to understand what changed before I decide whether to stay.`,
  },
  'hr-management': {
    'proposal': `Okay. Let's get into the main thing we're here to talk about.`,
    'negotiation': `I hear what you're saying, but I don't fully agree. Can we work through that?`,
    'renewal': `Before we wrap up, I want to be clear on what we agreed and what happens next.`,
  },
};

export function stageOpeningFor(p: IndustryProfile, dealStage: string): string | null {
  return (STAGE_OPENINGS_BY_PROFILE[p] ?? SALES_OPENINGS)[dealStage as keyof StageText] ?? null;
}

const SALES_OBJECTIVES: StageText = {
  'initial-pitch': "Capture attention and establish credibility — qualify the prospect's needs before presenting anything. Focus on discovery.",
  'proposal': 'Address the proposal evaluation — help them see clear value vs. cost. Handle pricing objections with ROI framing.',
  'negotiation': "Navigate concessions smartly — trade value for what matters, don't give things away free. Find the actual objection behind the pressure.",
  'renewal': 'Understand why they might leave and make a compelling case to stay — acknowledge real issues and propose a path forward.',
};

const STAGE_OBJECTIVES_BY_PROFILE: Record<IndustryProfile, StageText> = {
  'beer-distribution': SALES_OBJECTIVES,
  'b2b': SALES_OBJECTIVES,
  'retail': {
    'initial-pitch': 'Greet, build rapport and ask what they need and how they will use it before recommending anything.',
    'proposal': 'Show the option that fits what they told you and connect each feature to their need.',
    'negotiation': 'Find the real objection behind "too expensive" or "I\'ll think about it" and answer it within store policy.',
    'renewal': 'Ask for the sale, and suggest an add-on only if it genuinely helps them.',
  },
  'real-estate': {
    'initial-pitch': "Learn the client's motivation, timeline and finances before you give advice. Earn trust with questions, not claims.",
    'proposal': 'Explain your plan and how you reached your numbers using comparable sales you can show.',
    'negotiation': 'Handle pushback on price, commission or strategy with facts and empathy, without caving or arguing.',
    'renewal': 'Address remaining worries and ask for a clear commitment or next appointment. Keep it fair-housing safe throughout.',
  },
  'insurance': {
    'initial-pitch': 'Understand the client\'s situation and what they want protected before talking coverage or price.',
    'proposal': 'Explain the quote, coverage and exclusions in plain language, including what it does not cover.',
    'negotiation': 'Stay calm under pushback, be honest about what you can and cannot change, and offer real alternatives.',
    'renewal': 'Acknowledge what frustrated them, explain what changed, and agree a specific next step.',
  },
  'hr-management': {
    'initial-pitch': 'Set the purpose of the conversation plainly and make the other person comfortable enough to talk.',
    'proposal': 'Deliver the core message clearly with specific examples, then stop and listen.',
    'negotiation': 'Acknowledge their view, stay with facts and policy, and work toward something concrete.',
    'renewal': 'Summarize what was agreed, who does what by when, and what will be documented.',
  },
};

export function stageObjectiveFor(p: IndustryProfile, dealStage: string): string | null {
  return (STAGE_OBJECTIVES_BY_PROFILE[p] ?? SALES_OBJECTIVES)[dealStage as keyof StageText] ?? null;
}
