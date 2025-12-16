TON Mafia Codebase Audit
1. Codebase Map
Directory Structure & Purpose
/src: Frontend Application (React 18, Vite, TypeScript).

hooks/useGameStore.ts: The "God Store". 1400+ lines managing ALL global state and interfacing with Supabase RPCs.
pages/: Route handlers ensuring 1:1 mapping with feature sets (e.g., OpsPage, BusinessPage, FamilyPage).
components/: UI building blocks (Shadcn/UI based).
/supabase/migrations: Backend Logic & Schema.

Contains 80+ SQL files acting as the system's "operating system".
001_initial_schema.sql: Core definition (Players, Items, Businesses).
039_economy_v2_foundation.sql: Massive update to combat calculations and crew stats.
010_attack_system.sql & 037_pvp_attack_overhaul.sql: Complex PvP logic.
045_crew_upkeep.sql: Hourly sinking mechanism.
Architecture Overview
Thick Backend / Thin Frontend: Almost all business logic resides in PostgreSQL functions (RPCs). The frontend is primarily a view layer and state synchronizer.
Security: Relies heavily on Supabase RLS (Row Level Security) and SECURITY DEFINER functions to bypass RLS for specific authorized actions (like increment_cash).
State Management: useGameStore acts as a client-side cache, but "Read" operations often refetch entire datasets (loadAllData), creating a heavy network footprint on start.
### 2. Feature Inventory
| Limit | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| Core Loop | Jobs (PvE) | ✅ Active | Energy-based. Includes "Streaks" & "High Stakes". |
| Core Loop | Businesses | ✅ Active | Idle generation. Includes "Rush Mode" (Diamond Sink). |
| Core Loop | PvP Combat | ✅ Active | Complex rock-paper-scissors with crew types. |
| Economy | Black Market | ✅ Active | Sell items for cash. |
| Economy | Auction House | ✅ Active | P2P trading. |
| Economy | Safe/Vault | ✅ Active | Protected cash storage. Paid with TON? |
| Economy | Insurance | ✅ Active | Paid mitigation (TON) for PvP losses (30-50%). |
| Social | Family (Gang) | ✅ Active | Shared treasury, roles, chat (external?). |
| Social | Bounties | ✅ Active | Pay to mark players. |
| Social | Referrals | ✅ Active | Multi-tier rewards. |
| Protection | NPP | ✅ Active | New Player Protection (36h). Fixed. |
| Meta | Tasks | ✅ Active | Daily/Weekly goals. |
| Meta | Achievements | ✅ Active | Long-term progression. |
| Meta | Wheel | ✅ Active | Daily luck mechanic. |

### 3. Gameplay Loops
...

### 4. Economy Analysis
...
**Balance & Risks**
*   **Inflation Alert**: Business income is infinite. Counter-balance: Crew Upkeep.
*   **Deflationary Mechanics**: PvP (Crew/Items die). Insurance (TON Sink).
*   **The "Dead Loop" Risk**: SOLVED via "Lazy Upkeep" (`106_lazy_upkeep.sql`). Even if cron fails, login triggers deduction.

### 5. Technical Risks & Gaps
#### 1. pg_cron Dependency [SOLVED]
*   **Risk**: High. If unpaid/disabled, the sink fails.
*   **Fix**: ✅ "Lazy Upkeep" implemented. `apply_pending_upkeep` runs on every login to catch up missed hours.

#### 2. Monolithic Store
*   **Risk**: Medium. `useGameStore.ts` handles too much. Hard to debug race conditions between `loadAllData` and optimistic updates.
*   **Impact**: UI glitches where money appears/disappears temporarily.

#### 3. PvP Complexity
*   **Risk**: Low/Medium. The logic is very complex (14 distinct steps in `perform_pvp_attack`).
*   **Gap**: "Steal Percent" caps are hardcoded in SQL.
*   **Update**: Insurance logic added more complexity (`107`), but isolated well.

#### 4. Client Trust
*   **Validation**: Generally good. RPCs check quantity > 0 and ownership.
*   **Gap**: `loadAllData` is heavy. As userbase grows, this will fetch massive JSON blobs.

### 6. Findings Summary
#### Resolved
*   **Upkeep Verification**: ✅ Implemented Lazy Upkeep.
*   **NPP Enforcement**: ✅ Fixed in `107`.

#### Critical (Must Fix)
*   **Error Handling**: Database migrations show many hotfixes. Suggests fragile schema evolution.

#### Medium (Should Fix)
*   **Store Refactor**: Split `useGameStore` into slices (`usePlayerStore`, `useEconomyStore`).
*   **Dynamic Config**: Move hardcoded constants (Job rewards, PvP caps) to a `game_config` table for live-ops tuning.
Error Handling: Database migrations show many hotfixes (FIX_...). Suggests fragile schema evolution.
Medium (Should Fix)
Store Refactor: Split useGameStore into slices (usePlayerStore, useEconomyStore).
Dynamic Config: Move hardcoded constants (Job rewards, PvP caps) to a game_config table for live-ops tuning.
Low (Nice to Fix)
Testing: No automated tests found for RPCs. Economy tuning is currently "guess and check".
Documentation: AI_RULES.md is good, but technical docs for the RPC catalog are missing.