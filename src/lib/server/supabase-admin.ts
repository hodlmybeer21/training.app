import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Service-role Supabase client. Server-only: never import from a client component. */
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
