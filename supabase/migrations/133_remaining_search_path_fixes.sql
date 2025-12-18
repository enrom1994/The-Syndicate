-- =====================================================
-- SECURITY LINT FIXES - REMAINING FUNCTIONS
-- =====================================================
-- Fixes the 3 remaining function search_path issues:
-- 1. update_family_settings (6 params)
-- 2. activate_booster (3 params) 
-- 3. perform_pvp_attack (5 params)
-- =====================================================

SET search_path = public;

-- Fix update_family_settings(UUID, TEXT, TEXT, TEXT, BOOLEAN, INTEGER)
DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.update_family_settings(UUID, TEXT, TEXT, TEXT, BOOLEAN, INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Fix activate_booster(UUID, TEXT, INTEGER)
DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.activate_booster(UUID, TEXT, INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Fix perform_pvp_attack(UUID, UUID, TEXT, BOOLEAN, UUID)
DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.perform_pvp_attack(UUID, UUID, TEXT, BOOLEAN, UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Also fix get_family_settings(UUID) which may also be missing
DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.get_family_settings(UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Also fix disband_family(UUID) which may also be missing
DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.disband_family(UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;


-- =====================================================
-- NOTE: auth_leaked_password_protection
-- =====================================================
-- This CANNOT be fixed via migration. It must be enabled 
-- in the Supabase Dashboard:
--   Authentication > Providers > Password
--   Enable "Leaked Password Protection"
-- =====================================================
