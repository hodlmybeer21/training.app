-- Migration: add manager_id to profiles table for team hierarchy
-- Run via Supabase SQL Editor: https://lipuchbftpvvbnbbtehs.supabase.co/project/_/sql

BEGIN;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
COMMIT;