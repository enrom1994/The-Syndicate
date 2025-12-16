# Current System Description: Page-by-Page Analysis

This document provides a comprehensive analysis of the current state of the application. It details the functionality, interactions, and economic role of every accessible page in the game.

## 1. Home / Dashboard
- **Route / File:** `/` -> [Index.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/Index.tsx)
- **Primary Purpose:** Main hub for player status, navigation, and quick access to core loops.

**PLAYER ACTIONS:**
- **Navigation:** Access all other major game sections (Ops, Business, Inventory, etc.) via grid menu.
- **Quick Actions:** One-tap access to Shop (Buy Stats), Bank (Safe), and Daily Log.
- **Onboarding:** View "How to Play" tutorial (new players).
- **Status Check:** View current Cash, Health, Energy, Stamina, Level, Respect, and active buffs (VIP, Shield).
- **Notifications:** View "Recent Activity" feed summaries.

**SYSTEM DEPENDENCIES:**
- `get_player_profile`: Fetches core stats.
- `get_offline_summary`: Checks for offline earnings/losses on load.
- `get_active_buffs`: Checks for active protection or VIP status.

**GAME LOOP ROLE:**
- **Core Loop (Grind):** Starting point for all loops.
- **Retention:** "Daily Login" streak reminders and "Offline Earnings" hooks.
- **Status:** Essential dashboard for monitoring progress.

**ECONOMY IMPACT:**
- **Neutral:** No direct transactions, but facilitates all spending and earning.
- **Sink (Indirect):** Funnels players to Shop and Upgrades.

**NOTES:**
- The "Energy" and "Stamina" bars act as the primary session pacers.
- "Recent Activity" feed drives revenge loops (PvP).

---

## 2. Operations (PvE/PvP/Jobs)
- **Route / File:** `/ops` -> [OpsPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/OpsPage.tsx)
- **Primary Purpose:** The core gameplay engine. Where players spend Energy and Stamina to earn resources.

**PLAYER ACTIONS:**
- **PvE (Heists):** Attack AI targets (Liquor Store, Bank, etc.). Costs Stamina. Gains Cash, XP, Respect.
- **PvP (Combat):** Attack other players. Costs Stamina. Steals: Cash, Vault Money (Safe Cracking), Contraband, or Respect. Risks: Health loss, retaliation.
- **Jobs:** Execute time-based or instant tasks. Costs Energy. Gains Cash, XP. 
- **High Stakes:** Pay Diamonds to enter high-risk/high-reward missions.
- **Job Chains:** Maintain a streak of job completions for bonus multipliers.

**SYSTEM DEPENDENCIES:**
- `perform_heist`: Calculates PvE outcome.
- `perform_attack`: Complex PvP logic (stat vs stat resolution, theft amount).
- `perform_job`: Job execution and rewards.
- `get_targets`: Fetches list of attackable profiles.

**GAME LOOP ROLE:**
- **Core Grind (Jobs/PvE):** The reliable income source.
- **Secondary Loop (PvP):** The conflict engine. Zero-sum resource transfer (mostly).
- **Sink:** High Stakes consumes Diamonds.

**ECONOMY IMPACT:**
- **Source:** Jobs, Heists, and High Stakes generate *new* Cash and Items.
- **Transfer:** PvP moves Cash/Items between players (with a small "burn" or tax usually implicit in friction).
- **Sink:** High Stakes burns Diamonds.

**NOTES:**
- PvP is the primary driver of "Loss Aversion" (checking app to ensure safety).
- Job Chains add a retention mechanic (don't break the chain).

---

## 3. Business Management
- **Route / File:** `/business` -> [BusinessPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/BusinessPage.tsx)
- **Primary Purpose:** Passive income generation and crafting (Production).

**PLAYER ACTIONS:**
- **Manage:** Buy businesses (e.g., Speakeasy, Brewery). Costs Cash.
- **Upgrade:** Level up businesses to increase income/hour. Costs Cash.
- **Collect:** Claim accumulated income. Free execution or "Rush" (Diamonds) to skip cooldown.
- **Produce:** Convert raw capacity + Crew + Time into Contraband Items.

**SYSTEM DEPENDENCIES:**
- `get_player_businesses`: Fetches owned assets.
- `collect_income`: RPC to claim earnings.
- `upgrade_business`: Deducts cash, increments level.
- `start_production`: Initiates crafting timers.

**GAME LOOP ROLE:**
- **Core Grind (Passive):** Reliable, scalable income source.
- **Progression:** "Empire Building" visualization.

**ECONOMY IMPACT:**
- **Source:** Generates new Cash (Inflationary).
- **Sink:** Upgrades remove massive amounts of Cash (Deflationary).
- **Source (Items):** Production creates Contraband for the market.

**NOTES:**
- "Rush" feature is a direct monetization hook (Diamonds for Time).
- Without "Auto-Collector" (VIP), requires frequent logins.

---

## 4. Inventory
- **Route / File:** `/inventory` -> [InventoryPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/InventoryPage.tsx)
- **Primary Purpose:** Asset management. View and manage Weapons, Equipment, Contraband, and assigned Crew.

**PLAYER ACTIONS:**
- **Equip/Unequip:** Assign items to Crew members to boost stats.
- **Secure:** Move items to "Safe Storage" (requires Safe Slots).
- **Sell:** Liquidate items for Cash (NPC sell price).
- **Contribute:** Donate items to Family Armory/Treasury.

**SYSTEM DEPENDENCIES:**
- `get_player_inventory`: Fetches all owned items.
- `equip_item` / `unequip_item`: Updates database associations.
- `move_to_safe`: Interaction with Bank systems.

**GAME LOOP ROLE:**
- **Progression:** Where "Power" is managed and optimized.
- **Risk Management:** Moving valuable loot to safety before logging off.

**ECONOMY IMPACT:**
- **Sink:** Selling items to NPCs usually gives less than Market value (soft sink).
- **Transfer:** Contributing to Family moves assets to group ownership.

**NOTES:**
- The "Equip" flow is the main RPG element (min-maxing stats).

---

## 5. Family (Social)
- **Route / File:** `/family` -> [FamilyPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/FamilyPage.tsx)
- **Primary Purpose:** Organization hub. Chat, Member Management, Treasury.

**PLAYER ACTIONS:**
- **Donate:** Give Cash to Family Treasury.
- **Manage Members:** Promote, Demote, Kick (if Boss/Mod).
- **View Stats:** See total Influence (Respect), Member count.
- **Armory:** View shared assets (often used for Wars).

**SYSTEM DEPENDENCIES:**
- `get_family_details`: Loads all group data.
- `donate_to_treasury`: Moves Cash from Player to Family.
- `manage_member`: RPCs for roles.

**GAME LOOP ROLE:**
- **Social / Meta:** High-level organization.
- **Retention:** Peer pressure and social obligation to contribute.

**ECONOMY IMPACT:**
- **Sink/Transfer:** Large amounts of Cash are parked in Treasuries (often for future "War" updates or upgrades).

**NOTES:**
- Essential for long-term retention.
- Treasury acts as a massive "Score" for the group.

---

## 6. Family Discovery
- **Route / File:** `/family/browse` -> [BrowseFamiliesPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/BrowseFamiliesPage.tsx)
- **Primary Purpose:** Finding and joining a community.

**PLAYER ACTIONS:**
- **Search:** Find families by Name or Tag.
- **Join/Request:** Apply to join a family.
- **Create:** Navigate to creation flow.

**SYSTEM DEPENDENCIES:**
- `search_families`: Querying the database.
- `join_family` / `request_to_join`: RPCs dealing with membership logic.

**GAME LOOP ROLE:**
- **Onboarding (Social):** Getting solo players into the group loop.

**ECONOMY IMPACT:**
- **Neutral.**

**NOTES:**
- Critical funnel for ensuring players don't play alone (which has higher churn).

---

## 7. Family Creation
- **Route / File:** `/family/create` -> [CreateFamilyPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/CreateFamilyPage.tsx)
- **Primary Purpose:** Establish a new organization.

**PLAYER ACTIONS:**
- **Input:** Name, Tag, Description, Join Type (Open/Request).
- **Pay:** Cost in Diamonds + TON (Crypto fee).

**SYSTEM DEPENDENCIES:**
- `create_family`: Critical RPC creating a new entity.
- **TON Connect:** Verifies real crypto transaction.

**GAME LOOP ROLE:**
- **Social Leader:** For players who want to lead.

**ECONOMY IMPACT:**
- **Sink:** Removes Diamonds.
- **Monetization:** Requires real TON payment (Revenue).

**NOTES:**
- High barrier to entry (TON cost) ensures Families are "serious" endeavors, reducing spam.

---

## 8. Family Settings
- **Route / File:** `/family/settings` -> [FamilySettingsPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/FamilySettingsPage.tsx)
- **Primary Purpose:** Administration for Family Leaders.

**PLAYER ACTIONS:**
- **Edit Profile:** Name, Description, Tag.
- **Recruitment:** Toggle Open/Closed, set Min Level.
- **Requests:** Accept/Reject pending join applications.
- **Disband:** Destroy the family (destroys Treasury).

**SYSTEM DEPENDENCIES:**
- `update_family_settings`: Updates table rows.
- `process_join_request`: Handles membership logic.

**GAME LOOP ROLE:**
- **Social Management.**

**ECONOMY IMPACT:**
- **Neutral.**

**NOTES:**
- "Disband" is a destructive action that can wipe wealth (Treasury).

---

## 9. Bank
- **Route / File:** `/bank` -> [BankPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/BankPage.tsx)
- **Primary Purpose:** Protect resources from PvP theft.

**PLAYER ACTIONS:**
- **Deposit:** Move Cash from Wallet (Unsafe) to Vault (Safe). Interest/tax may apply.
- **Withdraw:** Move Cash to Wallet for spending.
- **Safe Storage:** Store Items in purchased slots to prevent theft.
- **Expand Vault:** Buy more Item Slots with TON.

**SYSTEM DEPENDENCIES:**
- `bank_transaction`: RPC handling atomic transfers.
- `purchase_safe_slots`: Unlocks inventory protection.

**GAME LOOP ROLE:**
- **Risk Management:** The core counter-play to PvP theft.

**ECONOMY IMPACT:**
- **Sink:** Withdrawal fees (if any, common in such games) or Deposit fees.
- **Monetization:** Selling Safe Slots for TON is a direct revenue stream.

**NOTES:**
- The friction of depositing/withdrawing adds strategic depth (do I run with cash to save fees, or play safe?).

---

## 10. Market (Black Market)
- **Route / File:** `/market` -> [MarketPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/MarketPage.tsx)
- **Primary Purpose:** NPC Shop for base gear.

**PLAYER ACTIONS:**
- **Buy:** Purchase Weapons, Armor, Vehicles from system. Costs Cash.

**SYSTEM DEPENDENCIES:**
- `buy_item`: Deducts cash, adds item to inventory.

**GAME LOOP ROLE:**
- **Progression:** Converting Cash into Stats (Attack/Defense).

**ECONOMY IMPACT:**
- **Sink:** Major deflationary mechanism. Removes Cash from the economy permanently in exchange for Power.

**NOTES:**
- "Base Prices" here set the floor for the player economy.

---

## 11. Auction House
- **Route / File:** `/auction` -> [AuctionPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/AuctionPage.tsx)
- **Primary Purpose:** Player-to-Player trading of scarce items.

**PLAYER ACTIONS:**
- **List:** Sell items. Set Start Bid, Buy Now, Duration.
- **Bid:** Commit Cash/Diamonds to an auction.
- **Buy Now:** Instant purchase.
- **Claim:** Retrieve won items or unsold listings.

**SYSTEM DEPENDENCIES:**
- `create_listing`, `place_bid`, `buy_now`: Complex transactional RPCs.
- `get_market_listings`: Filtering and sorting.

**GAME LOOP ROLE:**
- **Economy (Meta):** Allows specialization (Trader vs. Fighter).
- **Price Discovery:** Determines real value of Loot.

**ECONOMY IMPACT:**
- **Transfer:** Moves wealth between players.
- **Sink:** Listing fees or Sales Tax remove a % from every transaction.

**NOTES:**
- Essential for a "living" economy.

---

## 12. Ranks (Leaderboard)
- **Route / File:** `/ranks` -> [RanksPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/RanksPage.tsx)
- **Primary Purpose:** Competitive motivation.

**PLAYER ACTIONS:**
- **View:** Check ranking in Net Worth, Kills, Respect.
- **Season Info:** See time remaining and prize pool.

**SYSTEM DEPENDENCIES:**
- `get_leaderboard`: Aggregates player data.

**GAME LOOP ROLE:**
- **Meta / End-game:** The ultimate goal for power users.

**ECONOMY IMPACT:**
- **Neutral** (though drives spending to compete).

**NOTES:**
- "Social Proof" engine.

---

## 13. Hire Crew
- **Route / File:** `/hire` -> [HirePage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/HirePage.tsx)
- **Primary Purpose:** expand army size.

**PLAYER ACTIONS:**
- **Hire:** Buy generic units (Thugs, etc.). Costs Cash + Upkeep.
- **View Stats:** See total upkeep cost.

**SYSTEM DEPENDENCIES:**
- `hire_crew`: Deducts cash, increments count.

**GAME LOOP ROLE:**
- **Progression (Scaling):** More crew = more business capacity = more income (but higher upkeep).

**ECONOMY IMPACT:**
- **Sink:** Upkeep (Hourly burn) is a constant drain on Cash, preventing infinite accumulation without play.

**NOTES:**
- Balancing Upkeep vs. Income is a key strategy.

---

## 14. Profile
- **Route / File:** `/profile` -> [ProfilePage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/ProfilePage.tsx)
- **Primary Purpose:** Self-check and Stat Training.

**PLAYER ACTIONS:**
- **Train Stats:** Spend Cash to permanently increase Strength/Defense.
- **View:** User ID, Referral Link, Stats.

**SYSTEM DEPENDENCIES:**
- `train_stat`: Deducts cash, increments stat points.

**GAME LOOP ROLE:**
- **Progression (Infinite):** Stat training is usually an exponential cost sink for late game.

**ECONOMY IMPACT:**
- **Sink:** Infinite sink for Cash.

**NOTES:**
- The "Referral Link" is here, driving growth.

---

## 15. Notifications
- **Route / File:** `/notifications` -> [NotificationsPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/NotificationsPage.tsx)
- **Primary Purpose:** Asynchronous event log.

**PLAYER ACTIONS:**
- **Read:** See who attacked, what sold, job results.
- **Revenge:** "Attack Back" button on defense logs.
- **Claim:** Some notifications might have attached rewards.

**SYSTEM DEPENDENCIES:**
- `get_notifications`: Fetches log.
- `mark_read`.

**GAME LOOP ROLE:**
- **Retention (Trigger):** "You were attacked" is the strongest push notification trigger.

**ECONOMY IMPACT:**
- **Neutral.**

**NOTES:**
- The "Revenge" flow is critical for PvP engagement.

---

## 16. Daily Rewards
- **Route / File:** `/daily-rewards` -> [DailyRewardsPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/DailyRewardsPage.tsx)
- **Primary Purpose:** Retention (Log in every day).

**PLAYER ACTIONS:**
- **Claim:** Get free resources (increasing value over 7 days).
- **Restore Streak:** Pay TON to fix a broken streak.

**SYSTEM DEPENDENCIES:**
- `claim_daily_reward`.
- **TON Connect:** For streak restoration.

**GAME LOOP ROLE:**
- **Retention:** Habit formation.

**ECONOMY IMPACT:**
- **Source:** Inputs free "Stimulus" into the economy daily.
- **Monetization:** Streak repair.

**NOTES:**
- "Streak Saver" is a clever monetization mechanic.

---

## 17. Shop (Premium)
- **Route / File:** `/shop` -> [ShopPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/ShopPage.tsx)
- **Primary Purpose:** Monetization.

**PLAYER ACTIONS:**
- **Buy Diamonds:** Exchange TON for Hard Currency.
- **Buy Boosts:** Spend Diamonds for temporary buffs (2x Income, Shield).
- **VIP:** Subscription (Auto-collect, etc.).
- **Starter Packs:** One-time bundles.

**SYSTEM DEPENDENCIES:**
- **TON Connect:** Real payments.
- `purchase_pack`: Granting items.

**GAME LOOP ROLE:**
- **Meta:** Pay-to-Progress / Pay-for-Convenience.

**ECONOMY IMPACT:**
- **Source (Hard Currency):** The entry point for external value entering the game.
- **Sink (Hard Currency):** Boosts burn Diamonds.

**NOTES:**
- The existence of "Shields" (Protection) directly impacts the PvP loop availability.

---

## 18. Bounty Board
- **Route / File:** `/bounty-board` -> [BountyBoardPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/BountyBoardPage.tsx)
- **Primary Purpose:** PvP direction and revenge market.

**PLAYER ACTIONS:**
- **Place:** Pay Diamonds/Cash to put a "Hit" on a player.
- **Hunt:** Accept a contract to attack a specific player for a reward.
- **View:** See active hits.

**SYSTEM DEPENDENCIES:**
- `place_bounty`: Escrows the reward.
- `claim_bounty`: Awards the killer.

**GAME LOOP ROLE:**
- **PvP (Directed):** Focusing aggression on specific targets.
- **Social:** Tool for harassment or justice.

**ECONOMY IMPACT:**
- **Sink:** Listing fees (usually).
- **Transfer:** Reward moves from Placer to Hunter.

**NOTES:**
- "Contracts" (NPC Bounties) provide PvE content in the same UI.

---

## 19. Achievements
- **Route / File:** `/achievements` -> [AchievementsPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/AchievementsPage.tsx)
- **Primary Purpose:** Long-term goals.

**PLAYER ACTIONS:**
- **View:** Progress tracking (Kill 100 enemies, Earn $1M, etc.).
- **Claim:** Get distinct rewards for milestones.

**SYSTEM DEPENDENCIES:**
- `get_achievements`.
- `claim_achievement`.

**GAME LOOP ROLE:**
- **Retention:** intrinsic motivation system.

**ECONOMY IMPACT:**
- **Source:** One-time injections of large resource amounts.

**NOTES:**
- Badges/Titles earned here are social currency.

---

## 20. Tasks
- **Route / File:** `/tasks` -> [TasksPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/TasksPage.tsx)
- **Primary Purpose:** Engagement and Cross-promo.

**PLAYER ACTIONS:**
- **Social Tasks:** "Join Telegram Channel", "Follow X".
- **Game Tasks:** "Attack 5 times today".
- **Claim:** Get small rewards.

**SYSTEM DEPENDENCIES:**
- `check_task_completion`.

**GAME LOOP ROLE:**
- **Marketing/Growth:** Promoting community channels.
- **Daily Loop:** Giving structure to a session.

**ECONOMY IMPACT:**
- **Source:** Minor resource drip.

**NOTES:**
- "Social Tasks" are the primary engine for growing the Telegram Channel/Chat associated with the game.

---

## 21. Lucky Wheel
- **Route / File:** `/lucky-wheel` -> [LuckyWheelPage.tsx](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/pages/LuckyWheelPage.tsx)
- **Primary Purpose:** Gambling / Daily sink.

**PLAYER ACTIONS:**
- **Spin:** Random reward. Free daily, then costs Diamonds.

**SYSTEM DEPENDENCIES:**
- `spin_wheel`: RNG logic (backend).

**GAME LOOP ROLE:**
- **Retention:** Fun daily ritual.
- **Sink:** Diamond dump for gamblers.

**ECONOMY IMPACT:**
- **Source/Sink:** Net negative (House always wins) usually, acting as a sink.

**NOTES:**
- Visual spectacle (animations) is key here.

---
