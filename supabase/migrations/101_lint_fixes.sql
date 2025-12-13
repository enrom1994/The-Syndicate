-- =====================================================
-- FIX FUNCTION SEARCH PATH MUTABLE LINTS
-- =====================================================
-- Addresses ~90 security lints by setting explicit search_path=public
-- for SECURITY DEFINER functions.

-- 1. Family System (Role & Invite fixes)
ALTER FUNCTION public.set_member_role(UUID, UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.update_family_settings(UUID, TEXT, TEXT, TEXT, BOOLEAN, INTEGER) SET search_path = public;
ALTER FUNCTION public.get_family_settings(UUID) SET search_path = public;
ALTER FUNCTION public.join_family(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.leave_family(UUID) SET search_path = public;
ALTER FUNCTION public.kick_member(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.transfer_don(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.transfer_boss(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.disband_family(UUID) SET search_path = public;
ALTER FUNCTION public.invite_to_family(UUID, TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.process_family_invite(UUID, UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.get_my_family_invites(UUID) SET search_path = public;
ALTER FUNCTION public.get_family_invite_info(UUID) SET search_path = public;
ALTER FUNCTION public.join_family_by_code(UUID, TEXT) SET search_path = public;

-- CORRECTED: request_to_join_family has DEFAULT parameter for message
ALTER FUNCTION public.request_to_join_family SET search_path = public;
ALTER FUNCTION public.get_family_join_requests(UUID) SET search_path = public;
ALTER FUNCTION public.process_join_request(UUID, UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.search_families(TEXT, INTEGER) SET search_path = public; -- Verified (TEXT, INTEGER) in 067_family_improvements_foundation.sql
ALTER FUNCTION public.get_player_family(UUID) SET search_path = public;

-- 2. Economy & Business
ALTER FUNCTION public.increment_cash(UUID, BIGINT, TEXT) SET search_path = public;
ALTER FUNCTION public.increment_diamonds(UUID, INTEGER, TEXT) SET search_path = public;
ALTER FUNCTION public.spend_cash(UUID, BIGINT, TEXT) SET search_path = public;
ALTER FUNCTION public.spend_diamonds(UUID, INTEGER, TEXT) SET search_path = public;
ALTER FUNCTION public.purchase_auto_collect(UUID) SET search_path = public;
ALTER FUNCTION public.run_auto_collect_for_all() SET search_path = public;
ALTER FUNCTION public.repair_business(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.upgrade_business(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.rush_business_collect(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.produce_contraband(UUID, UUID) SET search_path = public; -- Verified (UUID, UUID) in 032_contraband_production.sql
ALTER FUNCTION public.get_production_recipes(UUID) SET search_path = public;

-- 3. Combat & PvP
ALTER FUNCTION public.perform_attack(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.perform_pvp_attack(UUID, UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.get_pve_targets(UUID) SET search_path = public;
ALTER FUNCTION public.rush_pve_cooldown(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.get_pvp_attack_types() SET search_path = public;
ALTER FUNCTION public.get_player_combat_stats(UUID) SET search_path = public;
ALTER FUNCTION public.notify_attack_result(UUID, UUID, BOOLEAN, BIGINT) SET search_path = public;
ALTER FUNCTION public.hire_crew(UUID, UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.process_crew_upkeep() SET search_path = public;
ALTER FUNCTION public.get_player_upkeep(UUID) SET search_path = public;

-- 4. Bounties
ALTER FUNCTION public.place_bounty(UUID, UUID, BIGINT, INTEGER) SET search_path = public;
ALTER FUNCTION public.get_bounties(UUID) SET search_path = public;
ALTER FUNCTION public.debug_bounties() SET search_path = public;
ALTER FUNCTION public.search_players_for_bounty(UUID, TEXT, INTEGER) SET search_path = public; -- Verified (UUID, TEXT, INTEGER) in 072_fix_bounty_search_rpc.sql

-- 5. Jobs & Missions
ALTER FUNCTION public.complete_job(UUID, UUID) SET search_path = public; 
ALTER FUNCTION public.execute_high_stakes_job(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.get_high_stakes_jobs(UUID) SET search_path = public;
ALTER FUNCTION public.get_job_chain_status(UUID) SET search_path = public;
ALTER FUNCTION public.get_tasks_with_progress(UUID) SET search_path = public;
ALTER FUNCTION public.get_task_period_start(INTEGER) SET search_path = public;

-- 6. Items, Auction & Safe
ALTER FUNCTION public.sell_item(UUID, UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.place_auction_bid(UUID, UUID, BIGINT) SET search_path = public;
ALTER FUNCTION public.get_active_auctions(UUID) SET search_path = public;
ALTER FUNCTION public.get_auction_analytics() SET search_path = public;
ALTER FUNCTION public.get_recent_sales(INTEGER) SET search_path = public;
ALTER FUNCTION public.get_item_avg_price(TEXT) SET search_path = public;
ALTER FUNCTION public.move_item_to_safe(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.move_item_from_safe(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.purchase_safe_slots(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.get_safe_packages() SET search_path = public;
ALTER FUNCTION public.get_safe_info(UUID) SET search_path = public;
ALTER FUNCTION public.get_assignment_limits(UUID) SET search_path = public;

-- 7. Energy & Stats
ALTER FUNCTION public.use_energy(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.regenerate_energy(UUID) SET search_path = public;
ALTER FUNCTION public.use_stamina(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.regenerate_stamina(UUID) SET search_path = public;
ALTER FUNCTION public.get_player_stats(UUID) SET search_path = public;
ALTER FUNCTION public.level_up_player(UUID) SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;

-- 8. Boosters & Lucky Wheel
ALTER FUNCTION public.activate_booster(UUID, TEXT, INTEGER) SET search_path = public;
ALTER FUNCTION public.get_active_boosters(UUID) SET search_path = public;
ALTER FUNCTION public.log_booster_usage(UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.get_booster_telemetry_summary() SET search_path = public;
ALTER FUNCTION public.spin_lucky_wheel(UUID, BOOLEAN) SET search_path = public;
ALTER FUNCTION public.get_spin_status(UUID) SET search_path = public;
ALTER FUNCTION public.get_wheel_prizes() SET search_path = public;
ALTER FUNCTION public.get_vip_status(UUID) SET search_path = public;
ALTER FUNCTION public.is_vip_active(UUID) SET search_path = public;

-- 9. Achievements, Rewards & Notifications
ALTER FUNCTION public.init_player_achievements(UUID) SET search_path = public;
ALTER FUNCTION public.get_player_achievements(UUID) SET search_path = public;
ALTER FUNCTION public.update_achievement_progress(UUID, TEXT, INTEGER) SET search_path = public;
ALTER FUNCTION public.get_daily_reward_status(UUID) SET search_path = public;
ALTER FUNCTION public.restore_streak(UUID) SET search_path = public;
ALTER FUNCTION public.get_referral_stats(UUID) SET search_path = public;
ALTER FUNCTION public.generate_referral_code(UUID) SET search_path = public;
ALTER FUNCTION public.get_notifications(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.mark_notification_read(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.mark_all_notifications_read(UUID) SET search_path = public;
ALTER FUNCTION public.get_current_season() SET search_path = public;
ALTER FUNCTION public.get_leaderboard(TEXT, INTEGER) SET search_path = public;
ALTER FUNCTION public.get_respect_bonus(UUID) SET search_path = public;
ALTER FUNCTION public.get_offline_summary(UUID) SET search_path = public;
