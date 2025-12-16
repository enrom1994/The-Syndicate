# Proposal & Implementation Roadmap

## 1. Refinements

### Gameplay Clarity
*   **Ops/Job Streaks**: The backend supports "Job Streaks" and "Chain Repair" (paying diamonds to fix a broken streak), but the UI in `OpsPage.tsx` likely needs a prominent "Streak Broken!" modal with a countdown timer to create urgency.
*   **PvP Feedback**: The backend calculates complex theft logic. The frontend CombatResultModal needs to strictly visualize what was stolen (Cash vs Banked Cash vs Items) to teach players the value of the Bank.

### Loop Completeness & Economy Stability
*   **The "Infinite Money" Fix**: Currently, crew_upkeep relies on `pg_cron`. If this fails, businesses generate infinite cash with no sinks.
    *   **Proposal**: Implement "Lazy Upkeep". When a player loads the game (`useGameStore.loadAllData`), the backend should check `last_upkeep_at`. If > 1 hour has passed, trigger an immediate calculation for all missed hours before returning data.
    *   **Status**: ✅ [COMPLETE] Implemented via `106_lazy_upkeep.sql` and `apply_pending_upkeep` RPC. Verified working.

## 2. System Actions

| System | Action | Rationale |
| :--- | :--- | :--- |
| **Lazy Upkeep** | [COMPLETE] | Critical for economy safety. Moves reliance from server cron to user activity. Implemented in `106`. |
| **New Player Protection** | [COMPLETE] | Fixed enforcement in PvP (36h duration). Implemented in `107`. |
| **Insurance** | [COMPLETE] | Paid protection against PvP losses. Implemented in `107`. |
| **Legacy Inventory** | [REMOVE] | Old `equipped` boolean in `player_inventory` is redundant with location column. Cleanup prevents logical bugs. |
| **High Stakes** | [MERGE] | Integrate tightly with the standard Job list? No, [LEAVE UNTOUCHED]. The separate tab/card style in `OpsPage` works well for premium differentiation. |
| **Task Verification** | [COMPLETE] | Ensure "Telegram Channel Join" tasks actually verify via bot API (currently often just a client-side link click). |

## 3. Safe Next-Step Roadmap

This roadmap enables immediate improvements without data wipes.

### Phase 1: Economy Guardrails (The "Lazy Upkeep") ✅ COMPLETED
**Goal**: Prevent inflation if server cron stops.
*   **Backend**: Created `apply_pending_upkeep(player_id)` RPC (`106_lazy_upkeep.sql`).
*   **Backend**: Modified start-up flow to call this first.
*   **Frontend**: `App.tsx` calls `checkPendingUpkeep` on login, showing "Crew Costs Paid" toast.

### Phase 1.5: Protection Systems ✅ COMPLETED
**Goal**: Fair PvP and Loss Mitigation.
*   **Backend**: Fixed NPP enforcement (`107_insurance_system.sql`).
*   **Backend**: Added `player_insurance` table and purchase RPCs.
*   **Frontend**: Added Insurance section to Shop (Upgrades).

### Phase 2: Engagement Loops (Streak UI)
**Goal**: Increase retention via Job Chains.
*   **Frontend**: Add visual "Streak Fire" indicator to standard jobs.
*   **Frontend**: Implement the "Streak Broken" countdown modal in `OpsPage.tsx` using the `continueJobChain` store action.

### Phase 3: Monetization Friction (Safe Slots)
**Goal**: Normalize utility of Diamonds/TON.
*   **Frontend**: Polish `BankPage` purchase flow. Ensure the "15% PvP Theft Cap" is communicated clearly in the CombatResultModal when a player loses.

## 4. Immediate Implementation Plan (Phase 1 & 1.5)

**Completed Changes:**

*   **[NEW] `106_lazy_upkeep.sql`**: Created strict SQL function to calculate arrears.
*   **[NEW] `107_insurance_system.sql`**: Implemented Insurance System and blocked attacks on New Players (36h).
*   **[MODIFY] `useGameStore.ts`**: Added checking logic.
*   **[MODIFY] `App.tsx`**: Added initialization calls.

**Verification Results:**
*   Lazy Upkeep: Verified cash deduction and crew loss logic.
*   Insurance: Verified purchasing and mitigation logic in PvP.