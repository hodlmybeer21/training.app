-- TrainField queue item 5: store-owner accounts (persona approach).
-- Applied to project lipuchbftpvvbnbbtehs via the Supabase MCP (apply_migration
-- "store_owner_accounts") on 2026-10-24.
--
-- Scope guard: an account holds a store name, optional address/city, an assigned
-- practice persona and short rep-typed notes. No recordings, audio or transcripts of
-- real conversations are stored here (NH requires all-party consent).
--
-- Server routes use the service role (bypasses RLS). These policies limit what the
-- anon key or a signed-in browser session can do directly.

BEGIN;

CREATE TABLE IF NOT EXISTS public.accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id     uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  name        text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  address     text CHECK (address IS NULL OR char_length(address) <= 200),
  city        text CHECK (city IS NULL OR char_length(city) <= 80),
  -- A built-in persona id (e.g. 'nh-liquor-store-owner') or a custom_personas.id.
  persona_id  text NOT NULL CHECK (char_length(persona_id) BETWEEN 1 AND 80),
  notes       text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounts_rep_id_idx ON public.accounts (rep_id);
CREATE INDEX IF NOT EXISTS accounts_team_id_idx ON public.accounts (team_id);

-- Practice sessions can point at the account they were run against.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sessions_account_id_idx ON public.sessions (account_id);

-- ── rep_id and team_id are set by the server, never by the client ─────────────
CREATE OR REPLACE FUNCTION public.accounts_protect_owner_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.rep_id := auth.uid();
    NEW.team_id := (SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid());
  ELSIF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.rep_id IS DISTINCT FROM OLD.rep_id
     OR NEW.team_id IS DISTINCT FROM OLD.team_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'An account''s owner and team cannot be changed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accounts_protect_owner_columns ON public.accounts;
CREATE TRIGGER accounts_protect_owner_columns
  BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.accounts_protect_owner_columns();

REVOKE EXECUTE ON FUNCTION public.accounts_protect_owner_columns() FROM PUBLIC, anon, authenticated;

-- ── RLS: owner-scoped; managers/admins read their own team's accounts ─────────
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.accounts FROM anon;

DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_select_team_manager" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_update_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_service_role" ON public.accounts;

CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = rep_id);
CREATE POLICY "accounts_select_team_manager" ON public.accounts
  FOR SELECT TO authenticated
  USING (
    team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = (SELECT auth.uid())
         AND p.role IN ('manager', 'admin')
         AND p.team_id = accounts.team_id
    )
  );
CREATE POLICY "accounts_insert_own" ON public.accounts
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = rep_id);
CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = rep_id) WITH CHECK ((SELECT auth.uid()) = rep_id);
CREATE POLICY "accounts_service_role" ON public.accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- No DELETE policy: removing accounts is not offered to clients yet.

-- A directly inserted session may only point at one of the caller's own accounts.
DROP POLICY IF EXISTS "sessions_insert_own" ON public.sessions;
CREATE POLICY "sessions_insert_own" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid())::text = user_id
    AND (account_id IS NULL OR EXISTS (
      SELECT 1 FROM public.accounts a WHERE a.id = sessions.account_id AND a.rep_id = (SELECT auth.uid())
    ))
  );

COMMIT;
