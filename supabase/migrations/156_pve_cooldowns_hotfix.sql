-- =====================================================
-- HOTFIX: CREATE MISSING PVE_COOLDOWNS TABLE
-- =====================================================
-- This table should have been created before get_pve_targets was modified
-- Run this immediately to fix the 404 error on Heists tab
-- =====================================================

SET search_path = public;

-- Create the missing pve_cooldowns table
CREATE TABLE IF NOT EXISTS public.pve_cooldowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.pve_targets(id) ON DELETE CASCADE,
    last_attacked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, target_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pve_cooldowns_player_target 
    ON public.pve_cooldowns(player_id, target_id);

-- RLS Policies
ALTER TABLE public.pve_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pve_cooldowns" ON public.pve_cooldowns;
CREATE POLICY "Users can view own pve_cooldowns" ON public.pve_cooldowns
    FOR SELECT USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can insert own pve_cooldowns" ON public.pve_cooldowns;
CREATE POLICY "Users can insert own pve_cooldowns" ON public.pve_cooldowns
    FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can update own pve_cooldowns" ON public.pve_cooldowns;
CREATE POLICY "Users can update own pve_cooldowns" ON public.pve_cooldowns
    FOR UPDATE USING (auth.uid() = player_id);

COMMENT ON TABLE public.pve_cooldowns IS 'Tracks per-player cooldowns for PvE heist targets';
