// Shared roleplay prompt pieces for practice (signed-in) and the public demo.
//
// Role mapping, used everywhere: the trainee (sales rep) is the `user` role and the
// AI character (buyer / owner / other party) is the `assistant` role.
//
// The deal-stage and difficulty notes below are written TO THE AI CHARACTER. Earlier
// versions addressed the rep ("do not concede on price", "make a compelling case"),
// which pulled the model into speaking as the rep.

export type RoleplaySpeaker = 'user' | 'assistant';
export const SPEAKER_LABEL: Record<RoleplaySpeaker, string> = {
  user: 'SALES REP (trainee)',
  assistant: 'BUYER (AI roleplay)',
};

export const STAGE_CONTEXT: Record<string, string> = {
  'initial-pitch': `\n[DEAL STAGE: INITIAL PITCH] You have not heard the rep's pitch yet. You are curious but guarded and deciding whether they are worth your time. Make them earn credibility. Do not volunteer your needs; answer their questions only if they ask good ones.`,
  'proposal': `\n[DEAL STAGE: PROPOSAL] You have seen the rep's proposal and pricing. You are weighing fit and value against cost. Raise specific objections about price, terms and competing options, and ask the rep to justify the switch.`,
  'negotiation': `\n[DEAL STAGE: NEGOTIATION] You are actively negotiating. Push the rep hard for concessions on price, delivery, terms or exclusivity, and use pressure tactics. Only give ground when the rep trades something real for it.`,
  'renewal': `\n[DEAL STAGE: RENEWAL] The rep wants to keep or renew your business. You are not fully happy: bring up past problems (service, out-of-stocks, slow sellers) and make it clear you are open to other options. Do not assume you will stay.`,
};

export const DIFFICULTY_CONTEXT: Record<string, string> = {
  'easy': `\n[DIFFICULTY: EASY] You are warm and receptive and want this to work. Your objections are mild. Agree to a next step if the rep lays out a clear path.`,
  'challenging': `\n[DIFFICULTY: CHALLENGING] You are realistic and skeptical. Ask fair questions and push back on anything that does not add up. The rep has to earn your trust with substance, not charm.`,
  'intense': `\n[DIFFICULTY: INTENSE] You are aggressive and demanding. Interrupt, issue ultimatums, mention other options, and make extreme demands. Stay in character no matter how the rep responds.`,
};

// Built-in personas where the AI is NOT a buyer being sold to (a manager, a colleague,
// an employee, an HR or insurance counterpart...). They get the generic role lock only.
const NOT_A_BUYER = new Set([
  'nh-district-manager', 'nh-route-rep', 'annual-review', 'exit-interview',
]);
const NOT_A_BUYER_PREFIX = ['hr-', 'ins-', 're-', 'retail-'];

/**
 * Should the "never speak as the rep" guard apply? True for the beverage buyer and
 * owner personas and for custom team personas (store owners). Unknown ids count as
 * custom personas.
 */
export function isBuyerPersona(personaId: unknown): boolean {
  if (typeof personaId !== 'string' || !personaId) return true;
  if (NOT_A_BUYER.has(personaId)) return false;
  return !NOT_A_BUYER_PREFIX.some(p => personaId.startsWith(p));
}

export const GENERIC_ROLE_LOCK = `\n\n[ROLE LOCK - FOLLOW STRICTLY] You play ONLY the character described above. Every user message is spoken by the trainee on the other side of the conversation; every assistant message is yours. Never write the trainee's lines, never switch sides, never coach the trainee, and never step out of character. Reply with only your character's spoken words: no labels, no stage directions, no narration. Keep it to 1-3 short sentences.`;

export const BUYER_ROLE_LOCK = `\n[YOU ARE THE BUYER, NOT THE SELLER] You are the account owner or buyer. The trainee is the distributor or sales rep pitching YOU. You never sell, ship, deliver, stock or give away product, and you never offer prices, discounts, deals, free or complimentary kegs or cases, tap handles, POS, staff training or promo support: those are the rep's to offer. You may ASK for them, demand them, or turn them down. Talk about YOUR business (your taps, your shelves, your customers, your margins) in the first person.`;

/** Server-side lock appended to whatever system prompt the scenario uses. */
export function roleLock(personaId: unknown): string {
  return GENERIC_ROLE_LOCK + (isBuyerPersona(personaId) ? BUYER_ROLE_LOCK : '');
}

/** Builds the scenario prompt the practice page sends (persona + stage + difficulty + extras). */
export function buildScenarioPrompt(base: string, dealStage: string, difficulty: string, extra = ''): string {
  return base + (STAGE_CONTEXT[dealStage] || '') + (DIFFICULTY_CONTEXT[difficulty] || '') + extra;
}

// Phrases a buyer would not say but a rep would. Kept specific to avoid flagging
// normal buyer talk like "I can give you one door" or "your brand".
const REP_SPEAK: RegExp[] = [
  /\bwe(?:'ll| will| can| could)\s+(?:ship|send|deliver|drop off|bring)\b/i,
  /\b(?:I'll|I will|I can|let me)\s+(?:ship|send over|deliver|drop off)\b/i,
  /\bcomplimentary\s+(?:keg|kegs|case|cases|tap handles?|samples?)\b/i,
  /\b(?:we|I)(?:'ll| will| can| could)?\s+(?:give|send|get)\s+you\s+(?:a\s+|some\s+)?free\b/i,
  /\bon us\b/i,
  /\b(?:we|I)(?:'ll| will| can| could)?\s+(?:throw in|comp)\b/i,
  /\bwe(?:'re| are)?\s+(?:offering|able to offer)\b/i,
  /\b(?:I|we)\s+(?:can|could|would)\s+offer you\b/i,
  /\byour\s+(?:(?:current|own|existing|whole|local|slow|busy|best|top|regular|Tuesday)\s+)?(?:taps?|crowd|tap lines?|bar|restaurant|store|shelf|shelves|cooler|coolers|cooler doors?|regulars|patrons|guests|menu|tap list)\b/i,
  /\b(?:our|my)\s+(?:distributorship|portfolio|wholesale price|distributor pricing|sales team)\b/i,
  /\bwould you like to (?:place|go ahead with) (?:an|the) order\b/i,
  /^\s*(?:rep|sales ?rep|salesperson|distributor)\s*:/im,
];

/** True when a buyer reply reads like the sales rep talking. */
export function looksLikeRepSpeak(reply: string): boolean {
  return REP_SPEAK.some(r => r.test(reply));
}

/** Strip a speaker label or reasoning block the model sometimes adds. */
export function cleanReply(reply: string): string {
  return reply
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*(?:buyer|owner|prospect|assistant)\s*:\s*/i, '')
    .trim();
}

export const RETRY_REMINDER = `Your last draft spoke as the sales rep. That is wrong. You are the BUYER. Reply again, in first person as the owner/buyer, reacting to what the rep just said. Do not offer, ship or give anything; ask questions or push back instead.`;

export const IN_ROLE_FALLBACK = `Hold on, you're the one pitching me here. What exactly are you offering, and why should I care?`;

/** Readable transcript for scoring, with unambiguous speaker labels. */
export function formatTranscript(turns: { role: string; content: string }[]): string {
  return turns
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${SPEAKER_LABEL[m.role as RoleplaySpeaker]}: ${m.content}`)
    .join('\n');
}

// ── Practice scenario options ─────────────────────────────────────────────────
// Every category uses these four stage ids (with category-specific labels), so the
// server can validate what the practice page sends.
export const DEAL_STAGE_IDS = ['initial-pitch', 'proposal', 'negotiation', 'renewal'] as const;
export type DealStageId = (typeof DEAL_STAGE_IDS)[number];
export const DIFFICULTY_IDS = ['easy', 'challenging', 'intense'] as const;
export type DifficultyId = (typeof DIFFICULTY_IDS)[number];

export function isDealStage(v: unknown): v is DealStageId {
  return typeof v === 'string' && (DEAL_STAGE_IDS as readonly string[]).includes(v);
}
export function isDifficulty(v: unknown): v is DifficultyId {
  return typeof v === 'string' && (DIFFICULTY_IDS as readonly string[]).includes(v);
}

// What the character says first at each deal stage (the persona's own opening line
// for the initial pitch). Shared so the server can check the opening it is sent.
const STAGE_OPENINGS: Record<string, string> = {
  'proposal': `Thanks for sending that over. I've had a chance to look it over and I have some questions — some of the pricing is higher than what I expected. Can we walk through it?`,
  'negotiation': `Okay, I've got leadership involved and they have concerns. If we're going to move forward, we need to talk about what you can actually give us here. What's flex?`,
  'renewal': `I appreciate you reaching out about renewing, but I'd be lying if I said everything was great this year. We need to talk about what's changed.`,
};

export function openingLineFor(personaOpening: string, dealStage: string): string {
  return STAGE_OPENINGS[dealStage] || personaOpening;
}
