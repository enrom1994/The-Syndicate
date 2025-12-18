-- =====================================================
-- SECURITY LINT FIXES
-- =====================================================
-- 1. Enable RLS on family_contributions table
-- 2. Fix function search_path for all flagged functions
--
-- Uses DO blocks with exception handling so non-existent functions don't fail
-- =====================================================

SET search_path = public;

-- =====================================================
-- 1. ENABLE RLS ON FAMILY_CONTRIBUTIONS
-- =====================================================

ALTER TABLE public.family_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_contributions
DROP POLICY IF EXISTS "Players can view own contributions" ON public.family_contributions;
CREATE POLICY "Players can view own contributions"
    ON public.family_contributions FOR SELECT
    USING (player_id = auth.uid());

DROP POLICY IF EXISTS "Players can view family contributions" ON public.family_contributions;
CREATE POLICY "Players can view family contributions"
    ON public.family_contributions FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM public.family_members WHERE player_id = auth.uid()
        )
    );

-- No direct INSERT/UPDATE/DELETE - only via RPCs (SECURITY DEFINER)
COMMENT ON TABLE public.family_contributions IS 'Tracks player contributions to family treasury. RLS enabled.';


-- =====================================================
-- 2. FIX FUNCTION SEARCH_PATH FOR FLAGGED FUNCTIONS
-- =====================================================
-- Uses exception handling to skip non-existent functions

DO $$
BEGIN
    -- Core gameplay functions
    EXECUTE 'ALTER FUNCTION public.claim_achievement(UUID, UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.increment_diamonds(UUID, INTEGER, TEXT) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.spin_lucky_wheel(UUID, BOOLEAN) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.activate_booster(UUID, TEXT) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.bank_deposit(UUID, BIGINT) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.bank_withdraw(UUID, BIGINT) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.contribute_to_treasury(UUID, BIGINT) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.contribute_contraband_to_treasury(UUID, UUID, INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.contribute_item_to_family(UUID, UUID, INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.update_family_settings(UUID, JSONB) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.collect_business_income(UUID, UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.sell_item(UUID, UUID, INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.get_respect_tier(INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.get_pvp_fee(INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.claim_daily_reward(UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.spend_diamonds(UUID, INTEGER, TEXT) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.spend_cash(UUID, BIGINT, TEXT) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    EXECUTE 'ALTER FUNCTION public.increment_cash(UUID, BIGINT, TEXT) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
