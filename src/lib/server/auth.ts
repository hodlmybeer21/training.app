import { createClient } from '@/utils/supabase/server';

/**
 * Returns the signed-in Supabase user from the request cookies, or null.
 * Never trust a user ID sent by the client (e.g. an x-user-id header).
 */
export async function getSessionUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    return user ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    return null;
  }
}
