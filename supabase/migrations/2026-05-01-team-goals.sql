-- team_goals: manager-pushed selling targets for team training
-- One team, multiple active goals. Goals drive prompt injection and scoring.
CREATE TABLE IF NOT EXISTS team_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL,
  manager_id    UUID NOT NULL,
  goal_text     TEXT NOT NULL,
  product_sku   TEXT,
  goal_type     TEXT DEFAULT 'volume' CHECK (goal_type IN ('volume', 'pod', 'execution', 'combo')),
  target_cases  INTEGER,
  target_pods   INTEGER,
  target_date   DATE,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_goals_team_id ON team_goals(team_id);
CREATE INDEX IF NOT EXISTS idx_team_goals_active ON team_goals(team_id, active);
