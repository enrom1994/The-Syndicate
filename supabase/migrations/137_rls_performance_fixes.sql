-- =====================================================
-- FIX RLS PERFORMANCE ISSUES
-- =====================================================
-- Fixes 88 Supabase lints:
-- 1. auth_rls_initplan: wrap auth.uid() in (select ...)
-- 2. multiple_permissive_policies: remove duplicate Dev policies
-- =====================================================

SET search_path = public;

-- =====================================================
-- PART 1: FIX auth_rls_initplan ISSUES
-- Wrap auth.uid() calls in subselects for performance
-- =====================================================

-- PLAYERS
DROP POLICY IF EXISTS "Players can update own data" ON players;
CREATE POLICY "Players can update own data" ON players
    FOR UPDATE USING (id = (select auth.uid()));

-- PLAYER_INVENTORY
DROP POLICY IF EXISTS "Players can modify own inventory" ON player_inventory;
CREATE POLICY "Players can modify own inventory" ON player_inventory
    FOR ALL USING (player_id = (select auth.uid()));

-- PLAYER_CREW
DROP POLICY IF EXISTS "Players can modify own crew" ON player_crew;
CREATE POLICY "Players can modify own crew" ON player_crew
    FOR ALL USING (player_id = (select auth.uid()));

-- PLAYER_BUSINESSES
DROP POLICY IF EXISTS "Players can modify own businesses" ON player_businesses;
CREATE POLICY "Players can modify own businesses" ON player_businesses
    FOR ALL USING (player_id = (select auth.uid()));

-- PLAYER_ACHIEVEMENTS
DROP POLICY IF EXISTS "Players can modify own achievements" ON player_achievements;
CREATE POLICY "Players can modify own achievements" ON player_achievements
    FOR ALL USING (player_id = (select auth.uid()));

-- PLAYER_TASKS
DROP POLICY IF EXISTS "Players can view own tasks" ON player_tasks;
CREATE POLICY "Players can view own tasks" ON player_tasks
    FOR SELECT USING (player_id = (select auth.uid()));

-- PLAYER_DAILY_REWARDS
DROP POLICY IF EXISTS "Players can modify own daily rewards" ON player_daily_rewards;
CREATE POLICY "Players can modify own daily rewards" ON player_daily_rewards
    FOR ALL USING (player_id = (select auth.uid()));

-- PLAYER_BOOSTERS
DROP POLICY IF EXISTS "Players can view own boosters" ON player_boosters;
DROP POLICY IF EXISTS "Players can modify own boosters" ON player_boosters;
CREATE POLICY "Players can access own boosters" ON player_boosters
    FOR ALL USING (player_id = (select auth.uid()));

-- FAMILIES
DROP POLICY IF EXISTS "Boss can update family" ON families;
CREATE POLICY "Boss can update family" ON families
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM family_members 
            WHERE family_id = families.id 
            AND player_id = (select auth.uid()) 
            AND role IN ('Don', 'boss')
        )
    );

-- FAMILY_MEMBERS
DROP POLICY IF EXISTS "Members can modify own membership" ON family_members;
CREATE POLICY "Members can modify own membership" ON family_members
    FOR ALL USING (player_id = (select auth.uid()));

-- AD_VIEWS
DROP POLICY IF EXISTS "Players can view own ad views" ON ad_views;
CREATE POLICY "Players can view own ad views" ON ad_views
    FOR SELECT USING (player_id = (select auth.uid()));

-- PLAYER_BOUNTY_COOLDOWNS
DROP POLICY IF EXISTS "Players can view own cooldowns" ON player_bounty_cooldowns;
CREATE POLICY "Players can view own cooldowns" ON player_bounty_cooldowns
    FOR SELECT USING (player_id = (select auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Players can view own notifications" ON notifications;
CREATE POLICY "Players can view own notifications" ON notifications
    FOR SELECT USING (player_id = (select auth.uid()));

-- PLAYER_PRODUCTION_COOLDOWNS
DROP POLICY IF EXISTS "Players can view own cooldowns" ON player_production_cooldowns;
DROP POLICY IF EXISTS "Players can manage own cooldowns" ON player_production_cooldowns;
CREATE POLICY "Players can access own cooldowns" ON player_production_cooldowns
    FOR ALL USING (player_id = (select auth.uid()));

-- AUCTION_LISTINGS
DROP POLICY IF EXISTS "Anyone can view active auctions" ON auction_listings;
DROP POLICY IF EXISTS "Players can insert their own listings" ON auction_listings;
DROP POLICY IF EXISTS "Players can update their own active listings" ON auction_listings;
CREATE POLICY "Anyone can view active auctions" ON auction_listings
    FOR SELECT USING (status = 'active' OR seller_id = (select auth.uid()));
CREATE POLICY "Players can manage own listings" ON auction_listings
    FOR ALL USING (seller_id = (select auth.uid()));

-- AUCTION_BIDS
DROP POLICY IF EXISTS "Players can insert their own bids" ON auction_bids;
CREATE POLICY "Players can insert their own bids" ON auction_bids
    FOR INSERT WITH CHECK (bidder_id = (select auth.uid()));

-- PVE_ATTACK_COOLDOWNS
DROP POLICY IF EXISTS "Players can see their own cooldowns" ON pve_attack_cooldowns;
CREATE POLICY "Players can see their own cooldowns" ON pve_attack_cooldowns
    FOR SELECT USING (player_id = (select auth.uid()));

-- ATTACK_COOLDOWNS
DROP POLICY IF EXISTS "Players can view their own attack cooldowns" ON attack_cooldowns;
CREATE POLICY "Players can view their own attack cooldowns" ON attack_cooldowns
    FOR SELECT USING (attacker_id = (select auth.uid()));

-- PLAYER_SAFE_SLOTS
DROP POLICY IF EXISTS "Players can view their own safe slots" ON player_safe_slots;
CREATE POLICY "Players can view their own safe slots" ON player_safe_slots
    FOR SELECT USING (player_id = (select auth.uid()));

-- BOOSTER_TELEMETRY
DROP POLICY IF EXISTS "Players can view their own telemetry" ON booster_telemetry;
CREATE POLICY "Players can view their own telemetry" ON booster_telemetry
    FOR SELECT USING (player_id = (select auth.uid()));

-- REFERRALS
DROP POLICY IF EXISTS "Players can view their referrals" ON referrals;
CREATE POLICY "Players can view their referrals" ON referrals
    FOR SELECT USING (referrer_id = (select auth.uid()) OR referred_id = (select auth.uid()));

-- PLAYER_REFERRAL_MILESTONES
DROP POLICY IF EXISTS "Players can view own milestone claims" ON player_referral_milestones;
CREATE POLICY "Players can view own milestone claims" ON player_referral_milestones
    FOR SELECT USING (player_id = (select auth.uid()));

-- FAMILY_INVITES
DROP POLICY IF EXISTS "Users can view their own invites" ON family_invites;
CREATE POLICY "Users can view their own invites" ON family_invites
    FOR SELECT USING (invitee_id = (select auth.uid()));

-- FAMILY_JOIN_REQUESTS
DROP POLICY IF EXISTS "Users can view their family requests" ON family_join_requests;
CREATE POLICY "Users can view their family requests" ON family_join_requests
    FOR SELECT USING (player_id = (select auth.uid()));

-- HIGH_STAKES_COOLDOWNS
DROP POLICY IF EXISTS "Users can read own cooldowns" ON high_stakes_cooldowns;
CREATE POLICY "Users can read own cooldowns" ON high_stakes_cooldowns
    FOR SELECT USING (player_id = (select auth.uid()));

-- PLAYER_INSURANCE
DROP POLICY IF EXISTS "Players can view own insurance" ON player_insurance;
CREATE POLICY "Players can view own insurance" ON player_insurance
    FOR SELECT USING (player_id = (select auth.uid()));

-- PROCESSED_TON_TRANSACTIONS
DROP POLICY IF EXISTS "Players can view own ton transactions" ON processed_ton_transactions;
CREATE POLICY "Players can view own ton transactions" ON processed_ton_transactions
    FOR SELECT USING (player_id = (select auth.uid()));

-- FAMILY_CONTRIBUTIONS
DROP POLICY IF EXISTS "Players can view own contributions" ON family_contributions;
DROP POLICY IF EXISTS "Players can view family contributions" ON family_contributions;
CREATE POLICY "Players can view contributions" ON family_contributions
    FOR SELECT USING (
        player_id = (select auth.uid()) 
        OR family_id IN (
            SELECT family_id FROM family_members WHERE player_id = (select auth.uid())
        )
    );

-- =====================================================
-- PART 2: REMOVE DUPLICATE DEV POLICIES
-- These cause multiple_permissive_policies warnings
-- =====================================================

DROP POLICY IF EXISTS "Dev public view achievements" ON player_achievements;
DROP POLICY IF EXISTS "Dev public view businesses" ON player_businesses;
DROP POLICY IF EXISTS "Dev public view crew" ON player_crew;
DROP POLICY IF EXISTS "Dev public view daily rewards" ON player_daily_rewards;
DROP POLICY IF EXISTS "Dev public view inventory" ON player_inventory;
DROP POLICY IF EXISTS "Dev public view tasks" ON player_tasks;

-- =====================================================
-- PART 3: CONSOLIDATE DUPLICATE PLAYERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Players can view all profiles" ON players;
DROP POLICY IF EXISTS "Players can view other players for game" ON players;
-- Recreate single policy for viewing players
CREATE POLICY "Anyone can view players" ON players
    FOR SELECT USING (true);

-- =====================================================
-- VERIFICATION COMMENT
-- =====================================================
COMMENT ON SCHEMA public IS 'RLS policies optimized for performance (migration 137). auth.uid() wrapped in subselects.';
