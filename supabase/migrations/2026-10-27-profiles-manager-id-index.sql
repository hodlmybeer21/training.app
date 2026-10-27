-- Supabase performance advisor: profiles.manager_id foreign key had no covering index
-- (used by the team view and seat checks for managers without a team_id).
create index if not exists profiles_manager_id_idx on public.profiles (manager_id);
