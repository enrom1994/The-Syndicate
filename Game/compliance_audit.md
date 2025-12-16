# Specification Compliance Audit

**Date:** 2025-12-15
**Auditor:** Agent Antigravity
**Version:** 1.0

## 📊 Compliance Matrix

| System / Feature | Documented Behavior | Actual Code Behavior | Status | Impact | Code References |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Currencies** | Cash, Diamonds, TON, **Stars** | Cash, Diamonds, TON implemented. **Stars are completely missing.** | **Missing** | **High** | [001_initial_schema.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/001_initial_schema.sql) (No `stars` column) |
| **Crew Upkeep** | Hourly deduction; failure leads to crew leaving. | `process_crew_upkeep` exists but relies on `pg_cron`. If `pg_cron` is not enabled, **automation fails silently**. | **Partial** | **High** | [045_crew_upkeep.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/045_crew_upkeep.sql) |
| **Production** | "Production Time" (Implies Input -> Wait -> Output) | **Inverted Flow**: Input -> Instant Output -> Cooldown. | **Divergent** | Low | [032_contraband_production.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/032_contraband_production.sql): `produce_contraband` |
| **Production Chains** | Input -> Output recipes | Fully implemented via `contraband_recipes` table. | **Match** | - | [032_contraband_production.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/032_contraband_production.sql), `033_seed.sql` |
| **Contraband** | Sinks (Heists), Sales, Usage | Sinks implemented in PvP (`037_pvp`) & Heists. Production implemented. | **Match** | - | [037_pvp_attack_overhaul.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/037_pvp_attack_overhaul.sql), `056_expansion.sql` |
| **PvP Combat** | Loot Transfer, Crew Death, Item Theft | Fully implemented. Complex logic for steal %, crew death chances, and inventory theft. | **Match** | - | [037_pvp_attack_overhaul.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/037_pvp_attack_overhaul.sql), `040_crew_theft.sql` |
| **Banking** | Deposit/Withdraw, **Insurance** | Basic Bank exists. **Insurance system is missing.** | **Partial** | Medium | [001_initial_schema.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/001_initial_schema.sql) (No insurance logic) |
| **Families** | Treasury, Power, Roles | Treasury exists (`contribute`). Roles exist. "Power" is implemented as `total_respect`. | **Match** | - | [014_family_system.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/014_family_system.sql) |
| **Premium** | Rush Mode, Job Chains, Boosters | Implemented. Job Chains include streak logic. Rush Mode pays for instant cooldowns. | **Match** | - | [055_diamond_sinks.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/055_diamond_sinks.sql) |
| **Diamond Sinks** | High Stakes Jobs | Implemented (`execute_high_stakes_job`). | **Match** | - | [055_diamond_sinks.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/055_diamond_sinks.sql) |
| **PvE Heists** | NPC Targets | Implemented as `pve_targets` with cooldowns. | **Match** | - | [036_pve_attack_system.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/036_pve_attack_system.sql) |

---

## 🚨 Top 3 Critical Mismatches

1.  **Missing "Stars" Currency**: Documented as a core currency but does not exist in the database schema (`players` table) or any functions.
2.  **Missing Insurance System**: Banking exists, but the "Insurance" mechanic (protecting % of loot from theft) is completely absent.
3.  **Fragile Upkeep Automation**: The economy relies on hourly upkeep to drain cash, but it strictly depends on the optional `pg_cron` extension. In many local/free environments, this job will never run, causing infinite cash accumulation.

## 🔎 Undocumented but Implemented Features
1.  **Job Chain Streaks**: The code implements a complex "Streak" system with bonus XP/Cash and a "Continue" window (2 mins) to save streaks with Diamonds. This is deeper than typically documented.
2.  **Crew Death & Weapon Loss**: The upkeep failure logic ([045_crew_upkeep.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/045_crew_upkeep.sql)) explicitly deletes a *random* weapon if a crew member leaves. This is a punishing "Double Loss" mechanic not clearly detailed in high-level docs.
3.  **Inverted Production**: Production gives items *instantly* and then sets a cooldown. This is "Action -> Reward -> Wait", whereas most idle games use "Action -> Wait -> Reward". This makes the game faster-paced.

## 💀 Dead Code / Unreachable Paths

*   **[032_contraband_production.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/032_contraband_production.sql)**: The `contraband_recipes` table is queried, but checks ownership. If a player owns a business but has zero crew, they might perceive the feature as broken because the error message `Not enough crew` is the only feedback. (UX issue, not dead code).
