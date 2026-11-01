// Shared roleplay prompt pieces for practice (signed-in) and the public demo.
//
// Role mapping, used everywhere: the trainee (sales rep) is the `user` role and the
// AI character (buyer / owner / other party) is the `assistant` role.
//
// The deal-stage and difficulty notes below are written TO THE AI CHARACTER. Earlier
// versions addressed the rep ("do not concede on price", "make a compelling case"),
// which pulled the model into speaking as the rep.

import { BEER, BEER_STAGE_CONTEXT, scorecardFor, stageContextFor, stageOpeningFor, type IndustryProfile } from '@/lib/industry';

export type RoleplaySpeaker = 'user' | 'assistant';
export const SPEAKER_LABEL: Record<RoleplaySpeaker, string> = {
  user: 'SALES REP (trainee)',
  assistant: 'BUYER (AI roleplay)',
};

// Beer stage notes (kept as STAGE_CONTEXT for callers and tests); other industries
// get their own notes from stageContextFor() in industry.ts.
export const STAGE_CONTEXT: Record<string, string> = BEER_STAGE_CONTEXT;

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

// Buyer lock for non-beer sales calls (custom retail, real estate or insurance
// personas, and the generic B2B personas): same idea, no kegs or taps.
export const GENERIC_BUYER_LOCK = `\n[YOU ARE THE CUSTOMER, NOT THE SELLER] You are the customer, client or prospect. The trainee is the one selling or advising. You never sell, quote prices, offer discounts or make the trainee's pitch for them. You may ask for things, push back, or turn them down. Talk about YOUR situation in the first person.`;

/**
 * Server-side lock appended to whatever system prompt the scenario uses. The keg
 * and tap wording is only for beer calls; manager/HR calls get the generic lock.
 */
export function roleLock(personaId: unknown, profile: IndustryProfile = BEER): string {
  if (!isBuyerPersona(personaId) || profile === 'hr-management') return GENERIC_ROLE_LOCK;
  return GENERIC_ROLE_LOCK + (profile === BEER ? BUYER_ROLE_LOCK : GENERIC_BUYER_LOCK);
}

/** Builds the scenario prompt (persona + stage + difficulty + extras) for the call's industry. */
export function buildScenarioPrompt(base: string, dealStage: string, difficulty: string, extra = '', profile: IndustryProfile = BEER): string {
  return base + stageContextFor(profile, dealStage) + (DIFFICULTY_CONTEXT[difficulty] || '') + extra;
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
  const text = reply
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*(?:buyer|owner|prospect|assistant|client|customer)\s*:\s*/i, '')
    .trim();
  return firstReplySegment(text);
}

// Groq's gpt-oss models (the fallback when the first model is rate limited) sometimes
// return more than one answer, or leaked planning notes, glued together with no
// space: "…for a themed night.Got it. We're already stocked…" or
// "…fall tasting.We need to ask about margins…". The first segment is the character's
// actual reply to the trainee; everything after the seam is dropped. A sentence end
// followed directly by a capital letter is the seam, since normal prose has a space.
const GLUED_SEAM = /[a-z0-9)][.!?]["”’)]?(?=[A-Z][a-z’'])/g;
// A made-up next turn for the trainee ("\nRep: …") is cut off the same way.
const NEXT_TURN = /\n\s*(?:rep|sales\s+rep|agent|trainee|user|you|me|manager)\s*:/i;
const MIN_FIRST_SEGMENT = 30;

export function firstReplySegment(text: string): string {
  let out = text;
  const turn = out.search(NEXT_TURN);
  if (turn > 0) out = out.slice(0, turn);
  for (const m of out.matchAll(GLUED_SEAM)) {
    const end = (m.index ?? 0) + m[0].length;
    if (end >= MIN_FIRST_SEGMENT) { out = out.slice(0, end); break; }
  }
  return out.trim();
}

/** Said when the model returns nothing usable twice in a row. */
export const EMPTY_REPLY_FALLBACK = `Sorry, I lost you for a second. Can you say that again?`;

export const RETRY_REMINDER = `Your last draft spoke as the sales rep. That is wrong. You are the BUYER. Reply again, in first person as the owner/buyer, reacting to what the rep just said. Do not offer, ship or give anything; ask questions or push back instead.`;

export const IN_ROLE_FALLBACK = `Hold on, you're the one pitching me here. What exactly are you offering, and why should I care?`;

/** Readable transcript for scoring, with unambiguous speaker labels for the call's industry. */
export function formatTranscript(turns: { role: string; content: string }[], profile: IndustryProfile = BEER): string {
  const card = scorecardFor(profile);
  const label: Record<RoleplaySpeaker, string> = { user: card.traineeLabel, assistant: card.otherLabel };
  return turns
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${label[m.role as RoleplaySpeaker]}: ${m.content}`)
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
// for the first stage). Shared so the server can check the opening it is sent.
export function openingLineFor(personaOpening: string, dealStage: string, profile: IndustryProfile = BEER): string {
  return stageOpeningFor(profile, dealStage) || personaOpening;
}
