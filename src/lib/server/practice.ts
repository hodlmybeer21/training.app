import type { SupabaseClient } from '@supabase/supabase-js';
import { PERSONA_BY_CATEGORY } from '@/lib/personas/index';
import { buildScenarioPrompt, isDealStage, isDifficulty, openingLineFor, type DealStageId, type DifficultyId } from '@/lib/roleplay';
import { getSampleIncentive, incentiveBuyerPrompt, type SampleIncentive } from '@/lib/incentives';
import { buildGoalContext } from '@/lib/goal-context';
import type { TurnMessage, TurnScope } from '@/lib/server/turn-token';

// Signed-in practice scenarios are built on the server from ids only: the client
// says which persona, deal stage, difficulty and sample incentive, and the server
// looks up the prompt text. No instruction text from the browser reaches the model.

export type PracticePersona = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  openingLine: string;
  custom: boolean;
};

const BUILT_IN = new Map<string, PracticePersona>();
for (const list of Object.values(PERSONA_BY_CATEGORY)) {
  for (const p of list as { id: string; name: string; description?: string; systemPrompt: string; openingLine: string }[]) {
    if (!BUILT_IN.has(p.id)) {
      BUILT_IN.set(p.id, { id: p.id, name: p.name, description: p.description || '', systemPrompt: p.systemPrompt, openingLine: p.openingLine, custom: false });
    }
  }
}

export function builtInPracticePersona(id: unknown): PracticePersona | null {
  return typeof id === 'string' ? BUILT_IN.get(id) ?? null : null;
}

const PERSONA_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** A built-in persona, or an active custom persona that belongs to the caller's team. */
export async function resolvePracticePersona(
  sb: SupabaseClient,
  teamId: string | null,
  personaId: unknown,
): Promise<PracticePersona | null> {
  const builtIn = builtInPracticePersona(personaId);
  if (builtIn) return builtIn;
  if (!teamId || typeof personaId !== 'string' || !PERSONA_ID_RE.test(personaId)) return null;
  const { data } = await sb
    .from('custom_personas')
    .select('id, name, description, system_prompt, opening_line, active, team_id')
    .eq('id', personaId)
    .eq('team_id', teamId)
    .maybeSingle();
  const row = data as { id: string; name: string; description: string | null; system_prompt: string; opening_line: string; active: boolean | null; team_id: string } | null;
  if (!row || row.active === false || row.team_id !== teamId) return null;
  return { id: row.id, name: row.name, description: row.description || '', systemPrompt: row.system_prompt, openingLine: row.opening_line, custom: true };
}

export async function loadGoalContext(sb: SupabaseClient, teamId: string | null): Promise<string> {
  if (!teamId) return '';
  const { data } = await sb
    .from('team_goals')
    .select('goal_text, product_sku, target_cases, target_pods, target_date')
    .eq('team_id', teamId)
    .eq('active', true)
    .order('created_at', { ascending: true });
  return buildGoalContext(data || []);
}

export type PracticeOptions = {
  dealStage: DealStageId;
  difficulty: DifficultyId;
  incentive: SampleIncentive | null;
};

/** Validates the scenario ids from the request. Returns an error message on bad input. */
export function parsePracticeOptions(body: Record<string, unknown>): PracticeOptions | { error: string } {
  const dealStage = body.dealStage ?? 'initial-pitch';
  const difficulty = body.difficulty ?? 'challenging';
  if (!isDealStage(dealStage)) return { error: 'Unknown deal stage' };
  if (!isDifficulty(difficulty)) return { error: 'Unknown difficulty' };
  let incentive: SampleIncentive | null = null;
  if (body.incentiveId) {
    incentive = getSampleIncentive(body.incentiveId);
    if (!incentive) return { error: 'Unknown incentive' };
  }
  return { dealStage, difficulty, incentive };
}

export function practiceScope(userId: string, persona: PracticePersona, opts: PracticeOptions): TurnScope {
  return { userId, personaId: persona.id, dealStage: opts.dealStage, difficulty: opts.difficulty, incentiveId: opts.incentive?.id ?? '' };
}

export function buildPracticeSystemPrompt(persona: PracticePersona, opts: PracticeOptions, goalContext: string): string {
  const base = buildScenarioPrompt(persona.systemPrompt, opts.dealStage, opts.difficulty, opts.incentive ? incentiveBuyerPrompt(opts.incentive) : '');
  return goalContext ? `${base}\n\n${goalContext}` : base;
}

export function practiceOpeningLine(persona: PracticePersona, opts: PracticeOptions): string {
  return openingLineFor(persona.openingLine, opts.dealStage);
}

/** Only user/assistant turns, as plain strings, within size limits. Null when malformed. */
export function cleanTurns(raw: unknown, opts: { maxMessages: number; maxCharsEach: number; maxCharsTotal: number }): TurnMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > opts.maxMessages) return null;
  const out: TurnMessage[] = [];
  let total = 0;
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    if (content.length > opts.maxCharsEach) return null;
    total += content.length;
    if (total > opts.maxCharsTotal) return null;
    out.push({ role, content });
  }
  return out;
}
