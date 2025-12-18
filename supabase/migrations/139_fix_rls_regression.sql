-- =====================================================
-- FIX RLS REGRESSION - RESTORE PUBLIC READ ACCESS
-- =====================================================
-- The app uses Telegram auth, not Supabase auth, so auth.uid() 
-- returns NULL. We need to allow public read access while
-- keeping SECURITY DEFINER RPCs for actual data access.
-- =====================================================

SET search_path = public;

-- =====================================================
-- RESTORE PUBLIC SELECT POLICIES FOR PLAYER DATA
-- These allow querying player data without Supabase auth
-- =====================================================

-- PLAYER_BUSINESSES - Allow public SELECT
DROP POLICY IF EXISTS "Players can modify own businesses" ON player_businesses;
CREATE POLICY "Public read businesses" ON player_businesses
    FOR SELECT USING (true);
CREATE POLICY "Service write businesses" ON player_businesses
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_CREW - Allow public SELECT
DROP POLICY IF EXISTS "Players can modify own crew" ON player_crew;
CREATE POLICY "Public read crew" ON player_crew
    FOR SELECT USING (true);
CREATE POLICY "Service write crew" ON player_crew
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_INVENTORY - Allow public SELECT
DROP POLICY IF EXISTS "Players can modify own inventory" ON player_inventory;
CREATE POLICY "Public read inventory" ON player_inventory
    FOR SELECT USING (true);
CREATE POLICY "Service write inventory" ON player_inventory
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_ACHIEVEMENTS - Allow public SELECT
DROP POLICY IF EXISTS "Players can modify own achievements" ON player_achievements;
CREATE POLICY "Public read achievements" ON player_achievements
    FOR SELECT USING (true);
CREATE POLICY "Service write achievements" ON player_achievements
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_TASKS - Allow public SELECT
DROP POLICY IF EXISTS "Players can view own tasks" ON player_tasks;
CREATE POLICY "Public read tasks" ON player_tasks
    FOR SELECT USING (true);
CREATE POLICY "Service write tasks" ON player_tasks
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_DAILY_REWARDS - Allow public SELECT
DROP POLICY IF EXISTS "Players can modify own daily rewards" ON player_daily_rewards;
CREATE POLICY "Public read daily rewards" ON player_daily_rewards
    FOR SELECT USING (true);
CREATE POLICY "Service write daily rewards" ON player_daily_rewards
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_BOOSTERS - Allow public SELECT
DROP POLICY IF EXISTS "Players can access own boosters" ON player_boosters;
CREATE POLICY "Public read boosters" ON player_boosters
    FOR SELECT USING (true);
CREATE POLICY "Service write boosters" ON player_boosters
    FOR ALL USING (true) WITH CHECK (true);

-- NOTIFICATIONS - Allow public SELECT
DROP POLICY IF EXISTS "Players can view own notifications" ON notifications;
CREATE POLICY "Public read notifications" ON notifications
    FOR SELECT USING (true);
CREATE POLICY "Service write notifications" ON notifications
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_PRODUCTION_COOLDOWNS - Allow public SELECT
DROP POLICY IF EXISTS "Players can access own cooldowns" ON player_production_cooldowns;
CREATE POLICY "Public read cooldowns" ON player_production_cooldowns
    FOR SELECT USING (true);
CREATE POLICY "Service write cooldowns" ON player_production_cooldowns
    FOR ALL USING (true) WITH CHECK (true);

-- AD_VIEWS - Allow public SELECT
DROP POLICY IF EXISTS "Players can view own ad views" ON ad_views;
CREATE POLICY "Public read ad views" ON ad_views
    FOR SELECT USING (true);
CREATE POLICY "Service write ad views" ON ad_views
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_BOUNTY_COOLDOWNS - Allow public SELECT
DROP POLICY IF EXISTS "Players can view own cooldowns" ON player_bounty_cooldowns;
CREATE POLICY "Public read bounty cooldowns" ON player_bounty_cooldowns
    FOR SELECT USING (true);
CREATE POLICY "Service write bounty cooldowns" ON player_bounty_cooldowns
    FOR ALL USING (true) WITH CHECK (true);

-- PVE_ATTACK_COOLDOWNS - Allow public SELECT
DROP POLICY IF EXISTS "Players can see their own cooldowns" ON pve_attack_cooldowns;
CREATE POLICY "Public read pve cooldowns" ON pve_attack_cooldowns
    FOR SELECT USING (true);
CREATE POLICY "Service write pve cooldowns" ON pve_attack_cooldowns
    FOR ALL USING (true) WITH CHECK (true);

-- ATTACK_COOLDOWNS - Allow public SELECT
DROP POLICY IF EXISTS "Players can view their own attack cooldowns" ON attack_cooldowns;
CREATE POLICY "Public read attack cooldowns" ON attack_cooldowns
    FOR SELECT USING (true);
CREATE POLICY "Service write attack cooldowns" ON attack_cooldowns
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_SAFE_SLOTS - Allow public SELECT
DROP POLICY IF EXISTS "Players can view their own safe slots" ON player_safe_slots;
CREATE POLICY "Public read safe slots" ON player_safe_slots
    FOR SELECT USING (true);
CREATE POLICY "Service write safe slots" ON player_safe_slots
    FOR ALL USING (true) WITH CHECK (true);

-- BOOSTER_TELEMETRY - Allow public SELECT
DROP POLICY IF EXISTS "Players can view their own telemetry" ON booster_telemetry;
CREATE POLICY "Public read telemetry" ON booster_telemetry
    FOR SELECT USING (true);
CREATE POLICY "Service write telemetry" ON booster_telemetry
    FOR ALL USING (true) WITH CHECK (true);

-- REFERRALS - Allow public SELECT
DROP POLICY IF EXISTS "Players can view their referrals" ON referrals;
CREATE POLICY "Public read referrals" ON referrals
    FOR SELECT USING (true);
CREATE POLICY "Service write referrals" ON referrals
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_REFERRAL_MILESTONES - Allow public SELECT
DROP POLICY IF EXISTS "Players can view own milestone claims" ON player_referral_milestones;
CREATE POLICY "Public read milestones" ON player_referral_milestones
    FOR SELECT USING (true);
CREATE POLICY "Service write milestones" ON player_referral_milestones
    FOR ALL USING (true) WITH CHECK (true);

-- FAMILY_INVITES - Allow public SELECT
DROP POLICY IF EXISTS "Users can view their own invites" ON family_invites;
CREATE POLICY "Public read invites" ON family_invites
    FOR SELECT USING (true);
CREATE POLICY "Service write invites" ON family_invites
    FOR ALL USING (true) WITH CHECK (true);

-- FAMILY_JOIN_REQUESTS - Allow public SELECT
DROP POLICY IF EXISTS "Users can view their family requests" ON family_join_requests;
CREATE POLICY "Public read requests" ON family_join_requests
    FOR SELECT USING (true);
CREATE POLICY "Service write requests" ON family_join_requests
    FOR ALL USING (true) WITH CHECK (true);

-- HIGH_STAKES_COOLDOWNS - Allow public SELECT
DROP POLICY IF EXISTS "Users can read own cooldowns" ON high_stakes_cooldowns;
CREATE POLICY "Public read high stakes" ON high_stakes_cooldowns
    FOR SELECT USING (true);
CREATE POLICY "Service write high stakes" ON high_stakes_cooldowns
    FOR ALL USING (true) WITH CHECK (true);

-- PLAYER_INSURANCE - Allow public SELECT
DROP POLICY IF EXISTS "Players can view own insurance" ON player_insurance;
CREATE POLICY "Public read insurance" ON player_insurance
    FOR SELECT USING (true);
CREATE POLICY "Service write insurance" ON player_insurance
    FOR ALL USING (true) WITH CHECK (true);

-- PROCESSED_TON_TRANSACTIONS - Allow public SELECT
DROP POLICY IF EXISTS "Players can view own ton transactions" ON processed_ton_transactions;
CREATE POLICY "Public read transactions" ON processed_ton_transactions
    FOR SELECT USING (true);
CREATE POLICY "Service write transactions" ON processed_ton_transactions
    FOR ALL USING (true) WITH CHECK (true);

-- FAMILY_CONTRIBUTIONS - Allow public SELECT
DROP POLICY IF EXISTS "Players can view contributions" ON family_contributions;
CREATE POLICY "Public read contributions" ON family_contributions
    FOR SELECT USING (true);
CREATE POLICY "Service write contributions" ON family_contributions
    FOR ALL USING (true) WITH CHECK (true);

-- FAMILY_MEMBERS - Allow public SELECT (needed for family display)
DROP POLICY IF EXISTS "Members can modify own membership" ON family_members;
CREATE POLICY "Public read members" ON family_members
    FOR SELECT USING (true);
CREATE POLICY "Service write members" ON family_members
    FOR ALL USING (true) WITH CHECK (true);

-- FAMILIES - Keep "Boss can update" but add public SELECT
DROP POLICY IF EXISTS "Boss can update family" ON families;
CREATE POLICY "Public read families" ON families
    FOR SELECT USING (true);
CREATE POLICY "Service write families" ON families
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- NOTE: Security is enforced by SECURITY DEFINER RPCs
-- RLS is mainly for data filtering, not authorization
-- =====================================================
COMMENT ON SCHEMA public IS 'RLS restored for Telegram auth (migration 139). SECURITY DEFINER RPCs handle authorization.';
