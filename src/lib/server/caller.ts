import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/server/supabase-admin';

export type CallerProfile = { id: string; role: string | null; team_id: string | null };
export type Caller = {
  user: { id: string; email: string | null };
  profile: CallerProfile | null;
  sb: SupabaseClient;
};

/**
 * Resolves the caller from the signed-in Supabase session cookie only.
 * Returns a 401 response when there is no session.
 */
export async function getCaller(): Promise<Caller | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = createAdminClient();
  const { data } = await sb.from('profiles').select('id, role, team_id').eq('id', user.id).maybeSingle();
  return { user, profile: (data as CallerProfile | null) ?? null, sb };
}

export function isManager(profile: CallerProfile | null): boolean {
  return profile?.role === 'manager' || profile?.role === 'admin';
}
