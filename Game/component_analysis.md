# Component Analysis

This document details the React components found in `src/components`, categorized by their role in the application.

## 1. Layout & Shell
These components provide the structural frame for the application.

### `MainLayout.tsx`
- **Purpose:** The primary wrapper for all authenticated pages.
- **Props:** `children`, `showHeader` (bool), `showNav` (bool).
- **Structure:** Renders `Header` (top), `children` (content), and `BottomNav` (bottom).
- **Dependencies:** `Header`, `BottomNav`.

### `Header.tsx`
- **Purpose:** Top navigation bar showing game title and user avatar.
- **Data:** Uses `useTelegramPhoto` hook to display user's Telegram profile picture.
- **Style:** Glassmorphism effect, fixed position.

### `BottomNav.tsx`
- **Purpose:** Main navigation bar for mobile app.
- **Items:** Home, Market, Ops, Family, Ranks.
- **Features:**
    - Active state highlighting.
    - Notification Badges (red dots) via `useNotifications` hook.
    - Supports Telegram Back Button integration.

### `Hero.tsx`
- **Purpose:** Landing screen for unauthenticated or first-time users.
- **Interactions:** "Rise to Power" button triggers entry callback.
- **Visuals:** High-quality background, animations, "The Syndicate" branding.

### `TelegramGuard.tsx`
- **Purpose:** Security wrapper. Blocks access if not running inside Telegram WebApp (unless localhost).
- **Behavior:** Checks `window.Telegram.WebApp` and User Agent. Shows "Open in Telegram" blocker screen on failure.

---

## 2. Game Logic & Features
Components that handle specific gameplay features or data visualization.

### `PlayerStats.tsx`
- **Purpose:** The main dashboard display. Shows:
    - **Header:** "Your Empire" + Rank #.
    - **Badges:** Attack, Defense, Crew size.
    - **Cards:** Cash, Diamonds, Net Worth, Rank Title.
    - **Bars:** Respect Progress, Energy (Auto-Regen), Stamina (Auto-Regen), XP Progress.
- **State:**
    - Real-time Energy/Stamina countdowns (using `useEnergyRegen`, `useStaminaRegen`).
    - Periodic Leaderboard Rank fetching (`get_leaderboard` RPC).
    - Computes total Attack/Defense dynamically based on Inventory + Crew + Base stats.

### `Operations.tsx`
- **Purpose:** Navigation grid for core game loops (Ops, Business, Inventory, etc.).
- **Features:**
    - **Badge Logic:** Checks `player_businesses` to see if income is ready to collect (shows red dot if >1 hr since collection).
    - **Navigation:** Routes to `/ops`, `/business`, etc.

### `QuickActions.tsx`
- **Purpose:** Secondary navigation grid for daily/retention loops.
- **Items:** Tasks, Achievements, Bounties, Lucky Wheel.
- **Visuals:** Colored cards with icons.

### `RecentActivity.tsx`
- **Purpose:** Feed showing recent events (Income, Attacks, Jobs).
- **Data:** Fetches from `get_notifications` RPC (same backend source as NotificationsPage).
- **Visuals:** Maps notification types to specific icons and colors.

### `ReferralSection.tsx`
- **Purpose:** Manages the Referral System (Invite Friends).
- **Modes:** Full View (Tasks Page) vs. Compact View (Profile Page).
- **Features:**
    - Shows stats (Total, Qualified, Pending).
    - Generates Telegram Share Links with `startapp` param.
    - **Milestone System:** visual progress bar and "Claim" button for referral rewards.
    - **Visuals:** List of recent referrals with qualification status logic.

### `SeasonBanner.tsx`
- **Purpose:** Shows current Season info and Round Timer.
- **Props:** `season`, `round`, `timeRemaining`.
- **Sub-components:** Exports `EnergyBar` and `StaminaBar` which are used by `PlayerStats`.

### `WalletButton.tsx`
- **Purpose:** TON Connect integration button.
- **Behavior:**
    - If disconnected: Opens TON Connect modal.
    - If connected: Shows formatted address (e.g., `UQ...1234`) and allows disconnect.

---

## 3. Modals & Feedback
Overlays for user interaction and feedback.

### `CombatResultModal.tsx`
- **Purpose:** The "Game Over" / "Victory" screen after PvP or PvE.
- **Props:** Huge list of results (`cashGained`, `itemsStolen`, `crewLost`, etc.).
- **Visuals:**
    - Victory: Gold theme, Trophy icon.
    - Defeat: Red theme, Skull icon.
    - Animated "Gained" and "Lost" grids.

### `LevelUpModal.tsx`
- **Purpose:** Celebration screen when player levels up.
- **Visuals:** Confetti animation, stat increase summary.
- **Trigger:** Controlled by parent/page logic.

### `OfflineSummaryModal.tsx`
- **Purpose:** "Welcome Back" screen showing offline progress.
- **Data:** Cash earned (Business), Cash lost (Attacks), Hours away.
- **Visuals:** Net Earnings calculation.

### `ConfirmDialog.tsx`
- **Purpose:** Generic verification dialog (Are you sure?).
- **Style:** Styled with game aesthetics (Noir card) instead of browser default.
- **Usage:** Used in Training, Buying, etc.

### `RewardAnimation.tsx`
- **Purpose:** Particle effects for claiming rewards.
- **Logic:** Global event emitter (`emitReward`). Can be called from anywhere (`rewardCash()`, `rewardDiamonds()`) to spawn floating icons that fly up and fade out.

### `ErrorBoundary.tsx`
- **Purpose:** React Error Boundary to catch crashes.
- **Visuals:** "Something went wrong" screen with "Try Again" button.

---

## 4. UI Primitives & Helpers
Small, reusable visual elements.

### `GameIcon.tsx`
- **Purpose:** Centralized image component for currency/resource icons.
- **Types:** `cash`, `diamond`, `ton`, `energy`, etc.
- **Path source:** Maps string types to `/public/images/icons/...`

### `RankBadge.tsx`
- **Purpose:** Displays player rank insignia (Street Thug -> Godfather).
- **Logic:** Maps rank name to specific Icon, Colors, and Border styles.

### `Onboarding.tsx`
- **Purpose:** Multi-step wizard validation for new players.
- **State:** Uses `localStorage` to track completion status.
- **Content:** 5 slides explaining Empire, Businesses, Operations, Family.

### `Skeleton.tsx`
- **Purpose:** Loading state placeholder.

### `ScrollToTop.tsx`
- **Purpose:** Utility component that scrolls window to (0,0) on route change.

---

## 5. Deprecated / Unused Components
These define UI or logic that does not appear to be used in the current `Index.tsx` or main routing flow.

### `Dashboard.tsx`
- **Status:** **Likely Unused.**
- **Details:** Appears to be an old version of the Home Page. `Index.tsx` re-implements this logic directly. It imports `FamilyHierarchy` which is also unused.

### `FamilyHierarchy.tsx`
- **Status:** **Likely Unused / Mock Data.**
- **Details:** Contains hardcoded names ("Don Vito", "Sonny"). Probably a placeholder or a concept for a future "Family Tree" visualization that isn't connected to real data yet.

## Notes & Recommendations
1.  **Duplicate Logic:** `PlayerStats` contains its own leaderboard fetching logic (`get_leaderboard`). This might be better moved to a store or context to avoid refetching if multiple components need it.
2.  **Notification Polling:** Both `RecentActivity` and `BottomNav` (badges) poll for notifications independently. This could be consolidated.
3.  **Cleanup:** `Dashboard.tsx` and `FamilyHierarchy.tsx` should be removed to avoid confusion if they are truly unused.
