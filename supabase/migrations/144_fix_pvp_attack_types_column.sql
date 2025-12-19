-- =====================================================
-- FIX MISSING is_active COLUMN ON pvp_attack_types
-- =====================================================
-- ISSUE: perform_pvp_attack RPC fails with:
--   column "is_active" does not exist
-- 
-- ROOT CAUSE: The pvp_attack_types table was created in migration 037
--   with an is_active column, but it's missing in production.
--   This could be due to migration order issues or manual schema changes.
--
-- FIX: Add the is_active column if it doesn't exist, default to true.
-- =====================================================

SET search_path = public;

-- Add is_active column to pvp_attack_types if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pvp_attack_types' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.pvp_attack_types 
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        
        RAISE NOTICE 'Added is_active column to pvp_attack_types';
    ELSE
        RAISE NOTICE 'is_active column already exists on pvp_attack_types';
    END IF;
END $$;

-- Ensure all existing attack types are active
UPDATE public.pvp_attack_types 
SET is_active = true 
WHERE is_active IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.pvp_attack_types.is_active IS 
    'Whether this attack type is available for use. Allows disabling attack types without deleting them.';
