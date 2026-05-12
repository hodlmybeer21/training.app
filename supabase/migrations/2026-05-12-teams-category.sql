-- Migration: teams + category on profiles
-- Run via Supabase SQL Editor or Management API
BEGIN;
  -- Teams table: maps team_id to a category vertical
  CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'beer-distribution',
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Add category column to profiles (per-user override, null = inherit from team)
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category TEXT;

  -- Existing placeholder team: assign to beer-distribution
  UPDATE profiles SET category = 'beer-distribution'
    WHERE team_id = 'a1111111-1111-1111-1111-111111111111' AND category IS NULL;

  INSERT INTO teams (id, name, category)
    VALUES ('a1111111-1111-1111-1111-111111111111', 'BrewBot Sales Team', 'beer-distribution')
  ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category;
COMMIT;
