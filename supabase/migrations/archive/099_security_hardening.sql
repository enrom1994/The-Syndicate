-- =====================================================
-- SECURITY HARDENING MIGRATION
-- =====================================================
-- Resolves "RLS Disabled" and "Mutable Search Path" warnings.

-- 1. ENABLE ROW LEVEL SECURITY ON TABLES
-- =====================================================

-- family_invites
ALTER TABLE IF EXISTS public.family_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invites" ON public.family_invites;
CREATE POLICY "Users can view their own invites"
    ON public.family_invites FOR SELECT
    USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage invites" ON public.family_invites;
CREATE POLICY "Service role can manage invites"
    ON public.family_invites FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- family_join_requests
ALTER TABLE IF EXISTS public.family_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their family requests" ON public.family_join_requests;
CREATE POLICY "Users can view their family requests"
    ON public.family_join_requests FOR SELECT
    USING (player_id = auth.uid() OR family_id IN (
        SELECT family_id FROM public.family_members WHERE player_id = auth.uid() AND role IN ('Boss', 'Underboss')
    ));

DROP POLICY IF EXISTS "Service role can manage requests" ON public.family_join_requests;
CREATE POLICY "Service role can manage requests"
    ON public.family_join_requests FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- game_seasons (Read Only Public)
ALTER TABLE IF EXISTS public.game_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for game_seasons" ON public.game_seasons;
CREATE POLICY "Public read access for game_seasons"
    ON public.game_seasons FOR SELECT
    USING (true);

-- high_stakes_cooldowns (User Read)
ALTER TABLE IF EXISTS public.high_stakes_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own cooldowns" ON public.high_stakes_cooldowns;
CREATE POLICY "Users can read own cooldowns"
    ON public.high_stakes_cooldowns FOR SELECT
    USING (player_id = auth.uid());

-- lucky_wheel_prizes (Read Only Public)
ALTER TABLE IF EXISTS public.lucky_wheel_prizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for lucky_wheel_prizes" ON public.lucky_wheel_prizes;
CREATE POLICY "Public read access for lucky_wheel_prizes"
    ON public.lucky_wheel_prizes FOR SELECT
    USING (true);

-- pvp_attack_types (Read Only Public)
ALTER TABLE IF EXISTS public.pvp_attack_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for pvp_attack_types" ON public.pvp_attack_types;
CREATE POLICY "Public read access for pvp_attack_types"
    ON public.pvp_attack_types FOR SELECT
    USING (true);

-- safe_packages (Read Only Public)
ALTER TABLE IF EXISTS public.safe_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for safe_packages" ON public.safe_packages;
CREATE POLICY "Public read access for safe_packages"
    ON public.safe_packages FOR SELECT
    USING (true);


-- 2. SECURE FUNCTIONS (SET SEARCH_PATH = public)
-- =====================================================
-- Prevents privilege escalation via search path hijacking.

ALTER FUNCTION public.activate_booster(UUID, TEXT, INTEGER) SET search_path = public;
ALTER FUNCTION public.add_experience(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.apply_referral_code(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.assign_equipment(UUID, UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.attack_pve(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.auto_collect_all_businesses(UUID) SET search_path = public;

-- Business Actions
ALTER FUNCTION public.bank_deposit(UUID, BIGINT) SET search_path = public;
ALTER FUNCTION public.bank_withdraw(UUID, BIGINT) SET search_path = public;
ALTER FUNCTION public.buy_business(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.collect_business_income(UUID, UUID) SET search_path = public;

-- Auction House
ALTER FUNCTION public.buy_auction_now(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.cancel_auction_listing(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.claim_expired_auction(UUID) SET search_path = public;
ALTER FUNCTION public.create_auction_listing(UUID, UUID, INTEGER, TEXT, BIGINT, BIGINT, INTEGER) SET search_path = public;

-- Shop
ALTER FUNCTION public.buy_item(UUID, UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.buy_starter_pack(UUID) SET search_path = public;

-- Calculations
ALTER FUNCTION public.calculate_net_worth_for_player(UUID) SET search_path = public;
ALTER FUNCTION public.calculate_net_worth(UUID) SET search_path = public;
ALTER FUNCTION public.calculate_next_level_xp(INTEGER) SET search_path = public;
ALTER FUNCTION public.calculate_task_progress(UUID, TEXT, INTEGER, TIMESTAMPTZ) SET search_path = public;
ALTER FUNCTION public.check_task_completion(UUID, UUID) SET search_path = public;

-- Bounties
ALTER FUNCTION public.cancel_bounty(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.claim_npc_bounty(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.claim_player_bounty(UUID, UUID) SET search_path = public;

-- Combat
ALTER FUNCTION public.check_attack_cooldown(UUID, UUID) SET search_path = public;

-- Referrals
ALTER FUNCTION public.check_referral_qualification(UUID) SET search_path = public;
ALTER FUNCTION public.claim_referral_milestone(UUID, UUID) SET search_path = public;

-- Achievements & Rewards
ALTER FUNCTION public.claim_achievement(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.claim_daily_reward(UUID) SET search_path = public;

-- Notifications
ALTER FUNCTION public.clear_all_notifications(UUID) SET search_path = public;
ALTER FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) SET search_path = public;

-- Jobs
ALTER FUNCTION public.complete_job(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.continue_job_chain(UUID) SET search_path = public;

-- Tasks
ALTER FUNCTION public.complete_task(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.train_stat(UUID, TEXT, BIGINT) SET search_path = public;

-- Family generic
ALTER FUNCTION public.contribute_to_treasury(UUID, BIGINT) SET search_path = public;
-- Note: create_family has overloads, securing all variants found
ALTER FUNCTION public.create_family(UUID, TEXT, TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.create_family(UUID, TEXT, TEXT, TEXT, TEXT) SET search_path = public;

