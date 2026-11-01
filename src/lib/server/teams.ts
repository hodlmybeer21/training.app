import type { SupabaseClient } from '@supabase/supabase-js';
import { getCategoryById } from '@/lib/categories';

export const DEFAULT_TEAM_CATEGORY = 'beer-distribution';

export function teamCategory(category: unknown): string {
  return typeof category === 'string' && getCategoryById(category)?.id === category ? category : DEFAULT_TEAM_CATEGORY;
}

export function defaultTeamName(displayName: string | null | undefined, email: string): string {
  const who = (displayName || '').trim() || email.split('@')[0] || 'New';
  return `${who.slice(0, 60)}'s team`;
}

/** Inserts a team row and returns its id. Throws on a database error. */
export async function createTeam(sb: SupabaseClient, name: string, category: unknown): Promise<string> {
  const { data, error } = await sb
    .from('teams')
    .insert({ name: name.trim().slice(0, 100) || 'New team', category: teamCategory(category) })
    .select('id')
    .single();
  if (error || !(data as { id?: string } | null)?.id) throw new Error(`team insert failed: ${error?.message || 'no id returned'}`);
  return (data as { id: string }).id;
}
