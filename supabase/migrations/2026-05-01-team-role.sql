-- Migration: add team and role to profiles table for multi-team support
-- Run this in Supabase SQL Editor — https://lipuchbftpvvbnbbtehs.supabase.co/project/_/sql
BEGIN;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'rep' CHECK (role IN ('rep', 'manager', 'admin'));
  CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON profiles(team_id);
COMMIT;
