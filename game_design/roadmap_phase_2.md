# Phase 2 Roadmap: Social & Economy Expansion

This document outlines the technical plan for the next major features of **The Syndicate**.

## 1. Family System (Social) 👨‍👩‍👦‍👦
The "Family" (Clan/Guild) system is the core social driver.

### Database Schema
*   **`families` Table:**
    *   `id` (UUID)
    *   `name` (Text, Unique)
    *   `description` (Text)
    *   `leader_id` (UUID, references players)
    *   `cash_bank` (BigInt) - Shared treasury
    *   `reputation` (Int) - Global ranking
    *   `created_at`

*   **`family_members` Table:**
    *   `family_id` (UUID)
    *   `player_id` (UUID)
    *   `role` (Enum: 'boss', 'underboss', 'capo', 'soldier', 'associate')
    *   `joined_at`

### Core Features to Implement
1.  **Creation:** Costs Diamonds/Cash. Creator becomes 'Boss'.
2.  **Management:** Boss/Underboss can Kick, Promote, Demote.
3.  **Economy:**
    *   **Family Tax:** Percentage of member earnings (Jobs/Attacks) automatically goes to Family Bank.
    *   **Donations:** Members can donate manually.
4.  **Wars (Future):** Families can declare war (PVP bonuses/penalties).

---

## 2. Bank Logic 2.0 (Economy) 🏦
Making the Bank useful beyond just "storage".

### Interest System
*   **Logic:** Users earn interest (e.g., 1% daily) on stored cash.
*   **Implementation:**
    *   *Option A (Passive):* Run a Schedule Edge Function every 24h to update all balances. (Costly at scale).
    *   *Option B (Claim-based):* Store `last_interest_claim_at`. User clicks "Claim Interest". Formula: `Balance * Rate * (TimeDiff / 24h)`. (Scalable, keeps users active).
*   **Constraints:** Max Deposit limit based on "Bank Level" (Upgrade your bank account slot).

### Transaction Logs
*   **UI:** Add a "History" tab to the Bank Page.
*   **Data:** Fetch from the existing `transactions` table. Show `type`, `amount`, `description`, `date`.

---

## 3. Content Expansion 📦
We need more variety to keep the game loop fresh.

### Needs
1.  **Jobs:** 10+ tiers (Street Rat -> Don).
2.  **Items:**
    *   **Weapons:** Glock, Tommy Gun, Molotov.
    *   **Armor:** Kevlar, Heavy Vest.
    *   **Vehicles:** Scooter, Sedan, Armored Truck (Stat boosters).
3.  **Crew:** Specialist crew (e.g., "Hacker" - reduced job energy cost).

### Implementation
*   Create a massive `seed_phase2.sql` file to bulk insert these.

---

## 4. UI Refinements 🎨
Polish the experience to feel "Premium".

1.  **Loading Skeletons:** Replace spinning wheels with shimmering skeletons for cards.
2.  **Toast Polish:** Custom styled Toasts (Gold/Black borders) instead of default Shadcn white/black.
3.  **Haptics:** Fine-tune vibration. Heavy on Attack Win, Light on Button Press.
4.  **Transitions:** Add `AnimatePresence` to page transitions for smooth slides.
5.  **Empty States:** Better "No Items" or "No targets" illustrations.
