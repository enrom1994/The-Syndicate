-- =====================================================
-- FIX ATTACK_LOG TABLE: ADD MISSING COLUMNS
-- =====================================================
-- The perform_pvp_attack RPC expects these columns:
-- attack_type, cash_stolen, respect_change

-- Add the attack_type column
ALTER TABLE public.attack_log 
ADD COLUMN IF NOT EXISTS attack_type TEXT;

-- Add the cash_stolen column (RPC uses this instead of cash_transferred)
ALTER TABLE public.attack_log 
ADD COLUMN IF NOT EXISTS cash_stolen INTEGER DEFAULT 0;

-- Add the respect_change column (RPC uses this instead of respect_gained/lost)
ALTER TABLE public.attack_log 
ADD COLUMN IF NOT EXISTS respect_change INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.attack_log.attack_type IS 'Type of PvP attack used (mugging, business_raid, safe_heist, drive_by)';
COMMENT ON COLUMN public.attack_log.cash_stolen IS 'Total cash stolen (pocket + vault)';
COMMENT ON COLUMN public.attack_log.respect_change IS 'Net respect change for attacker (positive if won, negative if lost)';

