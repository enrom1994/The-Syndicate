-- =====================================================
-- FINAL PRE-WAR OPS CLEANUP
-- =====================================================
-- 1. Remove XP from Heists (pve_targets)
-- 2. Reduce Drive-By stamina cost (harassment tier)
-- 3. Risk tier alignment complete via docs

SET search_path = public;

-- =====================================================
-- 1. REMOVE XP FROM HEISTS
-- =====================================================
-- XP is deprecated. Heists keep small Respect only.
-- Jobs remain the primary PvE Respect ladder.

UPDATE public.pve_targets SET xp_reward = 0;

-- =====================================================
-- 2. DRIVE-BY TIER CLARIFICATION (OPTION A)
-- =====================================================
-- Reduce stamina cost from 12 to 8 so Drive-By is clearly
-- weaker than Safe Heist (15 stamina).
-- Drive-By = Harassment (Medium Risk)
-- Safe Heist = Raid (High Risk)

UPDATE public.pvp_attack_types 
SET stamina_cost = 8,
    description = 'Quick harassment strike'
WHERE id = 'drive_by';

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.pve_targets IS 'PvE heist targets - XP removed, Respect only';
