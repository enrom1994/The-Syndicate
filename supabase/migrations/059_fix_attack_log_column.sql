-- =====================================================
-- FIX ATTACK_LOG TABLE: ADD ATTACK_TYPE COLUMN
-- =====================================================

-- Add the attack_type column to attack_log if it doesn't exist
ALTER TABLE public.attack_log 
ADD COLUMN IF NOT EXISTS attack_type TEXT;

-- Add comment
COMMENT ON COLUMN public.attack_log.attack_type IS 'Type of PvP attack used (mugging, business_raid, safe_heist, drive_by)';
