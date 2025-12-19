-- =====================================================
-- FIX ATTACK_LOG TABLE: ADD MISSING COLUMNS
-- =====================================================
-- ISSUE: perform_pvp_attack RPC fails with "column does not exist"
-- ROOT CAUSE: Migration 142 introduced new logic but didn't add all columns to attack_log.
-- =====================================================

SET search_path = public;

-- Add missing columns to attack_log
ALTER TABLE public.attack_log 
ADD COLUMN IF NOT EXISTS vault_stolen BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS respect_stolen INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS crew_killed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attacker_strength INTEGER,
ADD COLUMN IF NOT EXISTS defender_strength INTEGER,
ADD COLUMN IF NOT EXISTS roll INTEGER,
ADD COLUMN IF NOT EXISTS win_chance INTEGER,
ADD COLUMN IF NOT EXISTS insurance_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_savings BIGINT DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.attack_log.vault_stolen IS 'Amount of cash stolen from defender''s vault';
COMMENT ON COLUMN public.attack_log.respect_stolen IS 'Amount of respect stolen directly from defender';
COMMENT ON COLUMN public.attack_log.crew_killed IS 'Number of defender crew members injured/killed';
COMMENT ON COLUMN public.attack_log.attacker_strength IS 'Final attack strength used in calculation';
COMMENT ON COLUMN public.attack_log.defender_strength IS 'Final defense strength used in calculation';
COMMENT ON COLUMN public.attack_log.roll IS 'The random roll (1-100) for this battle';
COMMENT ON COLUMN public.attack_log.win_chance IS 'The calculated win percentage for the attacker';
COMMENT ON COLUMN public.attack_log.insurance_applied IS 'Whether the defender had active insurance that mitigated losses';
COMMENT ON COLUMN public.attack_log.insurance_savings IS 'Amount of cash loss prevented by insurance';
