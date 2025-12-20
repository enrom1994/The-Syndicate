-- =====================================================
-- FIX: Allow players to read other players for attack system
-- The original migration 004_dev_read_access.sql tried to drop a 
-- policy with the wrong name. This fixes it.
-- =====================================================

-- Drop the restrictive original policy (correct name)
DROP POLICY IF EXISTS "Players can view own data" ON public.players;

-- Drop the dev policy if it exists (it may have been created with wrong name)
DROP POLICY IF EXISTS "Dev public view players" ON public.players;

-- Drop the policy we're about to create if it already exists (idempotent)
DROP POLICY IF EXISTS "Players can view all profiles" ON public.players;

-- Create a proper policy allowing players to read all player profiles
-- This is needed for the attack system and leaderboards
CREATE POLICY "Players can view all profiles" ON public.players 
    FOR SELECT USING (true);
