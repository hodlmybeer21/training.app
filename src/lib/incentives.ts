// Sample beer-distributor incentive programs for demos, marketing video and practice.
// Every brand, program, payout and progress figure here is FICTIONAL. These are not
// any distributor's or supplier's real programs. Each one is flagged `sample: true`
// and the UI always shows a "Sample program" label next to it.

export type IncentiveType = 'pod' | 'volume' | 'display' | 'draft' | 'seasonal';

export interface SampleIncentive {
  id: string;
  sample: true;
  name: string;
  brand: string;
  type: IncentiveType;
  emoji: string;
  premise: 'Off-premise' | 'On-premise';
  period: 'Monthly' | 'Quarterly';
  /** What counts toward the goal. */
  counts: string;
  /** Threshold or target, in plain words. */
  target: string;
  /** What the rep earns (fictional figures). */
  payout: string;
  /** Lines a rep would use with the store owner. */
  talkingPoints: string[];
  /** The concrete thing the rep has to ask the buyer for. */
  ask: string;
  /** How the buyer realistically pushes back on that ask. */
  buyerPushback: string;
  /** Store-owner persona that fits this pitch best. */
  personaId: string;
  /** Sample progress for demos only; never real data. */
  sampleProgress: { current: number; goal: number; unit: string };
}

export const INCENTIVE_TYPE_LABEL: Record<IncentiveType, string> = {
  pod: 'POD / new placement',
  volume: 'Volume (cases)',
  display: 'Case stack / display',
  draft: 'Draft handle (POD)',
  seasonal: 'Seasonal pre-book',
};

export const SAMPLE_INCENTIVES: SampleIncentive[] = [
  {
    id: 'sample-pod-summit-ridge',
    sample: true,
    name: 'Summit Ridge Cold-Box Blitz',
    brand: 'Summit Ridge Lager',
    type: 'pod',
    emoji: '📍',
    premise: 'Off-premise',
    period: 'Monthly',
    counts: 'A new cold-box placement of Summit Ridge Lager 12-pack cans in an account that has not carried it in the last 90 days, photo-verified.',
    target: '12 new PODs this month',
    payout: '$15 per new POD, plus a $75 bonus at 12',
    talkingPoints: [
      'It is the #2 lager 12-pack in the chain stores two exits down, so your regulars already know it.',
      'One facing, eye level, and we rotate and face it every visit.',
      'If it does not turn in 30 days, I pull it and give you credit for what is left.',
    ],
    ask: 'one cold-box facing for Summit Ridge Lager 12-pack cans, set this week',
    buyerPushback: 'cooler space is maxed out; you would have to drop a SKU that already sells; you have been burned by slow movers before',
    personaId: 'nh-convenience-buyer',
    sampleProgress: { current: 8, goal: 12, unit: 'PODs' },
  },
  {
    id: 'sample-volume-granite-coast',
    sample: true,
    name: 'Granite Coast Quarterly Case Climb',
    brand: 'Granite Coast IPA',
    type: 'volume',
    emoji: '📦',
    premise: 'Off-premise',
    period: 'Quarterly',
    counts: 'Cases of Granite Coast IPA (all packages) sold into your accounts this quarter, compared with the same quarter last year.',
    target: '+150 cases over last year this quarter',
    payout: '$1 per case over last year, plus $200 at the full +150',
    talkingPoints: [
      'IPA is the fastest-growing style in your set, and Granite Coast is the top local IPA in it.',
      'Step your standing order from 5 to 8 cases and you stop running out on Fridays.',
      'The quarterly feature price runs all quarter, so the extra cases sell at a sharper shelf price.',
    ],
    ask: 'step the weekly standing order of Granite Coast IPA up from 5 to 8 cases for the quarter',
    buyerPushback: 'you do not want to sit on extra inventory; backroom space is tight; you want proof it will sell through before committing for a quarter',
    personaId: 'nh-grocery-buyer',
    sampleProgress: { current: 96, goal: 150, unit: 'cases' },
  },
  {
    id: 'sample-display-floor-stack',
    sample: true,
    name: 'Northbound Light 10-Case Floor Stack',
    brand: 'Northbound Light',
    type: 'display',
    emoji: '🧱',
    premise: 'Off-premise',
    period: 'Monthly',
    counts: 'A free-standing floor stack of at least 10 cases of Northbound Light 30-packs with price signage, up for 14 days or more, photo-verified.',
    target: '6 floor stacks this month',
    payout: '$25 per stack that stays up 14 days',
    talkingPoints: [
      'A 10-case stack by the front door sells 30-packs on impulse; nobody walks back to the cooler for a 30.',
      'I build it, sign it and keep it full; you do not lift a case.',
      'It is the big-game weekend coming up; that is when 30-packs fly.',
    ],
    ask: 'a 10-case floor stack of Northbound Light 30-packs at the front of the store for two weeks',
    buyerPushback: 'floor space near the register is for high-margin items; stacks block the aisle and the fire marshal complains; 30-packs are low margin',
    personaId: 'nh-convenience-buyer',
    sampleProgress: { current: 4, goal: 6, unit: 'stacks' },
  },
  {
    id: 'sample-draft-hollow-pine',
    sample: true,
    name: 'Hollow Pine Amber Tap Takeover',
    brand: 'Hollow Pine Amber',
    type: 'draft',
    emoji: '🍺',
    premise: 'On-premise',
    period: 'Monthly',
    counts: 'A new draft line of Hollow Pine Amber that stays on tap for at least 30 days.',
    target: '3 new tap handles this month',
    payout: '$40 per handle that stays on 30 days',
    talkingPoints: [
      'An amber is the easy middle of your tap list, for people who do not want an IPA or a light lager.',
      'First keg comes with coasters, a tap handle and a staff tasting before your Friday rush.',
      'If it is not pouring well after 30 days, we swap it for something that does.',
    ],
    ask: 'put Hollow Pine Amber on one draft line for 30 days, starting with the next keg change',
    buyerPushback: 'all your lines are spoken for; regulars complain when a beer rotates off; kegs that sit go stale and cost you money',
    personaId: 'nh-bar-owner',
    sampleProgress: { current: 2, goal: 3, unit: 'handles' },
  },
  {
    id: 'sample-seasonal-frostline',
    sample: true,
    name: 'Frostline Winter Porter Pre-Book',
    brand: 'Frostline Winter Porter',
    type: 'seasonal',
    emoji: '❄️',
    premise: 'Off-premise',
    period: 'Quarterly',
    counts: 'Cases of Frostline Winter Porter pre-booked before the November cutoff. Limited release; there is no reorder once it is gone.',
    target: '80 pre-booked cases across your accounts this quarter',
    payout: '$0.75 per pre-booked case, plus $50 if 10 of your accounts pre-book',
    talkingPoints: [
      'It sold out by mid-December last year and the stores that did not pre-book got nothing.',
      'Pre-book 5 cases now and they land the week before Thanksgiving, the best week for it.',
      'Pair it with a shelf talker and a cold-box facing and it sells itself to the holiday crowd.',
    ],
    ask: 'pre-book 5 cases of Frostline Winter Porter today, before the November cutoff',
    buyerPushback: 'dark seasonal beers are a gamble; last year you got stuck with leftover seasonal stock in January; you would rather order once you see demand',
    personaId: 'nh-liquor-store-owner',
    sampleProgress: { current: 35, goal: 80, unit: 'cases' },
  },
];

export function getSampleIncentive(id: unknown): SampleIncentive | null {
  if (typeof id !== 'string') return null;
  return SAMPLE_INCENTIVES.find(i => i.id === id) ?? null;
}

export function sampleProgressPercent(i: SampleIncentive): number {
  return Math.max(0, Math.min(100, Math.round((i.sampleProgress.current / i.sampleProgress.goal) * 100)));
}

/** Added to the AI buyer's system prompt so it reacts to the rep's specific ask. */
export function incentiveBuyerPrompt(i: SampleIncentive): string {
  return `\n\n[WHAT THE REP WILL ASK FOR] In this conversation the sales rep is trying to get you to agree to: ${i.ask} (brand: ${i.brand}). ` +
    `You do not know or care about the rep's internal incentives. Push back the way a real owner would: ${i.buyerPushback}. ` +
    `Do not agree right away. Make the rep earn it with specifics (sell-through, margin, risk reversal, service). ` +
    `Only agree, or agree to a smaller trial, if the rep handles your concerns and clearly asks for it. If they never ask, do not offer it.`;
}

/** Added to the scoring prompt so the debrief judges whether the rep advanced the goal. */
export function incentiveScoringPrompt(i: SampleIncentive): string {
  return `\n\nINCENTIVE GOAL (${INCENTIVE_TYPE_LABEL[i.type]}): the salesperson was pitching toward "${i.name}". ` +
    `The concrete ask was: ${i.ask}. Judge whether they advanced it: did they explicitly ask for it, ` +
    `handle the pushback, and get a commitment, a smaller trial, or a firm next step?`;
}

export const INCENTIVE_JSON_FIELD = `"incentiveGoal": { "asked": true or false, "outcome": "committed" | "trial" | "next-step" | "declined" | "not-asked", "score": 0-100, "evidence": "short quote or moment from the transcript" }`;

export type IncentiveOutcome = 'committed' | 'trial' | 'next-step' | 'declined' | 'not-asked';
export interface IncentiveGoalResult { asked: boolean; outcome: IncentiveOutcome; score: number; evidence: string }

const OUTCOMES: IncentiveOutcome[] = ['committed', 'trial', 'next-step', 'declined', 'not-asked'];

/** Normalizes the model's incentiveGoal object; returns null if it is missing or unusable. */
export function normalizeIncentiveGoal(raw: unknown): IncentiveGoalResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const outcome = OUTCOMES.includes(r.outcome as IncentiveOutcome) ? (r.outcome as IncentiveOutcome) : null;
  const asked = typeof r.asked === 'boolean' ? r.asked : outcome ? outcome !== 'not-asked' : false;
  const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
  if (!outcome && !Number.isFinite(Number(r.score))) return null;
  return {
    asked,
    outcome: outcome ?? (asked ? 'declined' : 'not-asked'),
    score,
    evidence: typeof r.evidence === 'string' ? r.evidence.slice(0, 400) : '',
  };
}

export const INCENTIVE_OUTCOME_LABEL: Record<IncentiveOutcome, string> = {
  committed: 'Got the commitment',
  trial: 'Got a smaller trial',
  'next-step': 'Set a firm next step',
  declined: 'Asked, buyer said no',
  'not-asked': 'Never asked for it',
};
