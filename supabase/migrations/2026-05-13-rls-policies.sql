-- Enable RLS + policies for TrainField AI
-- Run via Supabase SQL Editor: https://lipuchbftpvvbnbbtehs.supabase.co/project/_/sql

BEGIN;

-- ── profiles ──────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid()::uuid = id);
CREATE POLICY "profiles_service_role" ON profiles FOR ALL USING (auth.role() = 'service_role');

-- ── sessions ──────────────────────────────────────────────────────────────────
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- NOTE: sessions.user_id is TEXT (stores 'anonymous', 'test-user', or auth.uid() as text)
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id = 'anonymous');
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (auth.uid()::text = user_id OR user_id = 'anonymous');
CREATE POLICY "sessions_service_role" ON sessions FOR ALL TO service_role USING (true);

-- ── team_goals ───────────────────────────────────────────────────────────────
ALTER TABLE team_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_goals_manage" ON team_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()::uuid AND profiles.role IN ('manager', 'admin'))
);

-- ── teams ─────────────────────────────────────────────────────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_select" ON teams FOR SELECT USING (true);
CREATE POLICY "teams_service_role" ON teams FOR ALL TO service_role USING (true);

-- ── custom_personas ───────────────────────────────────────────────────────────
-- Already had RLS from prior migration, add service role policy
CREATE POLICY "custom_personas_service_role" ON custom_personas FOR ALL TO service_role USING (true);

COMMIT;