import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAllPersonaIds } from '@/lib/personas/index';
import type { Caller } from '@/lib/server/caller';

// Store-owner accounts. Scope guard: name, optional address/city, an assigned practice
// persona and short rep-typed notes only. No recordings or transcripts of real
// conversations are accepted or stored (NH requires all-party consent).

export const ACCOUNT_LIMITS = { name: 120, address: 200, city: 80, notes: 1000 } as const;
export const ACCOUNT_COLUMNS = 'id, name, address, city, persona_id, notes, created_at, updated_at';

export type AccountInput = { name?: string; address?: string | null; city?: string | null; persona_id?: string; notes?: string | null };

function optionalText(v: unknown, max: number, label: string): string | null | { error: string } {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return { error: `${label} must be text` };
  const t = v.trim();
  if (t.length > max) return { error: `${label} must be ${max} characters or fewer` };
  return t || null;
}

/** Validates a create (partial=false) or edit (partial=true) body. Owner fields are never read. */
export function parseAccountInput(body: Record<string, unknown>, partial: boolean): { value: AccountInput } | { error: string } {
  const out: AccountInput = {};
  if (!partial || 'name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) return { error: 'Store or account name is required' };
    if (body.name.trim().length > ACCOUNT_LIMITS.name) return { error: `Name must be ${ACCOUNT_LIMITS.name} characters or fewer` };
    out.name = body.name.trim();
  }
  if (!partial || 'persona_id' in body) {
    if (typeof body.persona_id !== 'string' || !body.persona_id.trim()) return { error: 'Pick a store-owner persona' };
    out.persona_id = body.persona_id.trim();
  }
  for (const [key, max, label] of [['address', ACCOUNT_LIMITS.address, 'Address'], ['city', ACCOUNT_LIMITS.city, 'City'], ['notes', ACCOUNT_LIMITS.notes, 'Notes']] as const) {
    if (!partial || key in body) {
      const r = optionalText(body[key], max, label);
      if (r && typeof r === 'object') return r;
      out[key] = r;
    }
  }
  return { value: out };
}

/** A persona is valid if it is built in, or an active custom persona on the caller's team. */
export async function personaAllowed(sb: SupabaseClient, personaId: string, teamId: string | null | undefined): Promise<boolean> {
  if (getAllPersonaIds().includes(personaId)) return true;
  if (!teamId || !/^[0-9a-f-]{36}$/i.test(personaId)) return false;
  const { data } = await sb.from('custom_personas').select('id').eq('id', personaId).eq('team_id', teamId).eq('active', true).maybeSingle();
  return !!data;
}

export async function readJson(req: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('bad');
    return body as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

type SessionRow = { id: string; account_id: string | null; overall_score: number | null; created_at: string; scenario_name: string | null };

/** The caller's own accounts, each with their recent practice scores against it. */
export async function listOwnAccounts(caller: Caller) {
  const { data: accounts, error } = await caller.sb
    .from('accounts')
    .select(ACCOUNT_COLUMNS)
    .eq('rep_id', caller.user.id)
    .order('updated_at', { ascending: false });
  if (error) return { error };
  const ids = (accounts || []).map((a: { id: string }) => a.id);
  let sessions: SessionRow[] = [];
  if (ids.length) {
    const { data, error: sErr } = await caller.sb
      .from('sessions')
      .select('id, account_id, overall_score, created_at, scenario_name')
      .eq('user_id', caller.user.id)
      .in('account_id', ids)
      .order('created_at', { ascending: false })
      .limit(500);
    if (sErr) return { error: sErr };
    sessions = (data || []) as SessionRow[];
  }
  return {
    accounts: (accounts || []).map((a: { id: string }) => {
      const mine = sessions.filter((s) => s.account_id === a.id);
      return {
        ...a,
        practice_count: mine.length,
        recent_sessions: mine.slice(0, 5).map(({ id, overall_score, created_at, scenario_name }) => ({ id, overall_score, created_at, scenario_name })),
      };
    }),
  };
}
