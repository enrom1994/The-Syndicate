# Active Migrations Changelog (101-154)

Recent migrations that represent the **current active development** of the game.

---

## Quick Reference

| # | Migration | Purpose |
|---|-----------|---------|
| 101 | lint_fixes | Security linting & function search path |
| 102 | dynamic_rush_pricing | Business rush cost based on income |
| 103 | economy_loop_fixes | Economy balancing |
| 104 | cleanup_duplicate_policies | RLS deduplication |
| 105 | fix_referral_notification_types | Notification enum fix |
| 106 | lazy_upkeep | Apply crew upkeep on login |
| 107 | insurance_system | Crew death protection |
| 108 | contraband_prestige | Contraband crafting tiers |
| 109 | xp_removal | Removed XP, kept Respect only |
| 110 | fix_icon_paths | Asset path corrections |
| 111 | pvp_respect_alignment | PvP respect rewards tuning |
| 112 | remove_kill_counters | Cleaned up unused metrics |
| 113 | drive_by_nerf | Reduced drive-by effectiveness |
| 114 | ops_cleanup | OpsPage simplification |
| 115 | economy_rebalance | Major economy tuning |
| 116 | black_market_sellers | NPC contraband buyers |
| 117 | pvp_fee_revenge | Attack fees + revenge system |
| 118 | made_man_visibility | Made Man badge in PvP |
| 119 | made_man_notification | Notification on Made Man |
| 120 | family_treasury_contraband | Family can receive contraband |
| 121 | pvp_attack_cooldown | Cooldown between attacks |
| 122 | payment_verification | TON payment verification |
| **123-133** | **Auth Session** | Security lockdown & rollbacks |
| 134 | fix_contribution_limits | Family contribution caps |
| 135 | fix_contraband_display_rpc | Contraband display bug |
| 136 | fix_booster_protection_checks | Shield/NPP checks |
| 137 | rls_performance_fixes | RLS optimization |
| 138 | family_leaderboard | Family rankings |
| 139 | fix_rls_regression | RLS fix from 137 |
| 140 | family_made_man_badge | Badge in family list |
| 141 | fix_family_respect_calc | Family respect formula |
| 142 | injured_crew_system | Crew injury vs death |
| 143 | fix_activate_booster | Booster RPC fix |
| 144 | fix_pvp_attack_types_column | Column name fix |
| 145 | item_market_fixes | Market pricing |
| 146 | fix_attack_log_missing_columns | Attack log schema |
| 147 | fix_pvp_cooldown_system | Comprehensive cooldown fix |
| 148 | fix_bank_column_name | Bank column rename |
| 148b | fix_player_deletion_cascades | Cascade deletes |
| 149 | schema_truth_cleanup | Deprecated column comments |
| 150 | loyalty_points_system | Loyalty rewards |
| 151 | fix_family_inventory_display | Family armory display |
| 152 | telegram_notifications | Telegram bot messages |
| 153 | fix_referral_qualification_respect | Referral respect threshold |
| 154 | fix_rush_pricing_scope | Rush pricing variable fix |

---

## Auth Session Notes (123-133)

These 11 migrations were part of a **security hardening session** that required several rollbacks:
- 123: Initial lockdown (too aggressive)
- 124-127: Partial fixes
- 128-131: RPC signature restorations
- 132-133: Final lint cleanup

All are required for the current auth state to work correctly.

---

*Last updated: 2025-12-20*
