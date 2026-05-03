CREATE TABLE IF NOT EXISTS custom_personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  manager_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#D4860A',
  description TEXT DEFAULT '',
  system_prompt TEXT NOT NULL,
  opening_line TEXT NOT NULL,
  voice_pitch DECIMAL(3,2) DEFAULT 1.0,
  voice_rate DECIMAL(3,2) DEFAULT 1.0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE custom_personas ENABLE ROW LEVEL SECURITY;