-- TrainField security: plan tier column, locked privileged profile columns, owner-only reads.
-- Applied to project lipuchbftpvvbnbbtehs via the Supabase MCP (apply_migration
-- "lock_profiles_sessions_rls") on 2026-10-24. Server routes use the service role,
-- which bypasses RLS, so these policies only limit what the anon key / a signed-in
-- browser session can do directly.

BEGIN;

-- ── profiles.tier: the paid plan lives here, never in role ───────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier text;

-- Move plan names that the old webhook wrote into role.
UPDATE public.profiles
   SET tier = role,
       role = CASE WHEN role = 'solo' THEN 'rep' ELSE 'manager' END
 WHERE role IN ('solo', 'small-team', 'team');
UPDATE public.profiles SET role = 'rep'
 WHERE role IS NULL OR role NOT IN ('rep', 'manager', 'admin');

-- Mirror into auth app_metadata (the trusted copy used for seat limits) where missing.
UPDATE auth.users u
   SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tier', p.tier)
  FROM public.profiles p
 WHERE p.id = u.id AND p.tier IS NOT NULL AND (u.raw_app_meta_data ->> 'tier') IS NULL;

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'rep';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('rep', 'manager', 'admin'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tier_check CHECK (tier IS NULL OR tier IN ('solo', 'small-team', 'team'));

-- ── Only the service role / admin API may change role, team, manager, tier, category ──
CREATE OR REPLACE FUNCTION public.profiles_protect_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Direct client access (anon key or a user's JWT) runs as anon/authenticated.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'rep';
    NEW.team_id := NULL;
    NEW.manager_id := NULL;
    NEW.tier := NULL;
    NEW.category := NULL;
  ELSIF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.team_id IS DISTINCT FROM OLD.team_id
     OR NEW.manager_id IS DISTINCT FROM OLD.manager_id
     OR NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.category IS DISTINCT FROM OLD.category THEN
    RAISE EXCEPTION 'Only an admin can change role, team, manager, plan or category'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileged_columns ON public.profiles;
CREATE TRIGGER profiles_protect_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_privileged_columns();

REVOKE EXECUTE ON FUNCTION public.profiles_protect_privileged_columns() FROM PUBLIC, anon, authenticated;

-- ── profiles: owner-only ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_service_role" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── sessions (scores + transcripts): owner-only ──────────────────────────────
-- Managers see their team's sessions through /api/team, which uses the service role.
DROP POLICY IF EXISTS "sessions_select" ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert" ON public.sessions;
DROP POLICY IF EXISTS "sessions_update" ON public.sessions;
DROP POLICY IF EXISTS "sessions_select_own" ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert_own" ON public.sessions;

CREATE POLICY "sessions_select_own" ON public.sessions
  FOR SELECT TO authenticated USING ((SELECT auth.uid())::text = user_id);
CREATE POLICY "sessions_insert_own" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())::text = user_id);

-- ── teams: members can read their own team's name ────────────────────────────
DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_select_own_team" ON public.teams;
CREATE POLICY "teams_select_own_team" ON public.teams
  FOR SELECT TO authenticated
  USING (id = (SELECT p.team_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())));

-- ── custom_personas: were readable AND writable by anyone with the anon key ───
-- The app reads and writes personas only through server routes (service role).
DROP POLICY IF EXISTS "custom_personas_select" ON public.custom_personas;
DROP POLICY IF EXISTS "custom_personas_insert" ON public.custom_personas;
DROP POLICY IF EXISTS "custom_personas_update" ON public.custom_personas;
DROP POLICY IF EXISTS "custom_personas_delete" ON public.custom_personas;
DROP POLICY IF EXISTS "custom_personas_select_own_team" ON public.custom_personas;
CREATE POLICY "custom_personas_select_own_team" ON public.custom_personas
  FOR SELECT TO authenticated
  USING (team_id = (SELECT p.team_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())));

-- ── team_goals: any manager could manage every team's goals ──────────────────
-- Writes go through /api/goals (service role). Members may read their own team's goals.
DROP POLICY IF EXISTS "team_goals_manage" ON public.team_goals;
DROP POLICY IF EXISTS "team_goals_select_own_team" ON public.team_goals;
CREATE POLICY "team_goals_select_own_team" ON public.team_goals
  FOR SELECT TO authenticated
  USING (team_id = (SELECT p.team_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())));

COMMIT;
