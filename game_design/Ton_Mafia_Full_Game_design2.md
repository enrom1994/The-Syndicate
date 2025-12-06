Alright — if we’re going **beyond MVP**, then we’re not building a tiny “numbers game.”
We’re building a **TON-native Mafia MMO-lite**, fully optimized for:

* **Retention**
* **Competition**
* **Social dominance**
* **TON sinks**
* **Seasonal resets**
* **High replay value**
* **Minimal art**
* **Fast development**

This is where **TON Mafia** becomes something users genuinely grind, strategize over, form alliances for, and brag about.

Below is the **full, battle-tested, expanded vision** — the kind of system that keeps players hooked for months and pushes TON revenue sustainably.

---

## Current Development Status

This document outlines the *expanded vision* for TON Mafia, beyond the Minimum Viable Product (MVP). Our current development efforts are focused on completing the MVP's frontend functionality as detailed in `TON_Mafia_Full_Game_Design.md` and the `Development_Checklist.md`.

As of this update, we have successfully completed:

*   **Phase 1: UI Foundation & Theming**
*   **Phase 2: Core Gameplay Logic (Frontend)**
*   **Major UI/UX Refactoring:** Consolidating 'Businesses' and 'Crew' into a tabbed 'Assets' page, and creating a new tabbed 'Ops' page for future 'Attacking' and 'Jobs' functionality.
*   **Net Worth & Leaderboard:** Implemented client-side calculation and display of player and mock AI net worth.

We are continuing with the remaining frontend MVP features before moving to backend integration (Supabase), which will lay the foundation for many of the advanced systems described in this expanded design document.

---

# 🔥 TON MAFIA — FULL SYSTEM DESIGN (Beyond MVP)

This is the full version, not the “at launch” version.
This shows what the game can grow into — a **proper online mafia strategy game** that fits in a Telegram mini app and prints retention.

---

# ⭐ CORE GAME LOOPS (FULL VERSION)

## **1. Empire Growth Loop**

You grow income-producing criminal businesses:

* Smuggling
* Money laundering
* Loan sharking
* Nightclubs
* Gun running
* Car theft rings
* “Protection” extortion routes

Each business has:

* Tier (1–10)
* Income rate
* Turn cost to collect
* Defense vulnerability
* Upgrade costs
* “Influence Requirement” (prevents players from progressing too fast)

This becomes the **economic spine** of the game.

---

## **2. Crew Management Loop**

Crew becomes a deep system in full version:

### **Crew Types**

* Hitmen
* Brutes
* Enforcers
* Smugglers
* Collectors
* Security
* Drivers
* Accountants (boost income)
* Spies (scouting enemies)

Each unit type has:

* Base stat scaling
* Level
* Training costs
* Gear slots
* Special abilities (in advanced mode)

### **Crew Synergy System**

Mixing certain crew types gives bonuses:

* 1 Driver + 3 Hitmen → Attack Speed +15%
* 2 Accountants + 2 Smugglers → Cash Boost +10%
* 4 Security + 1 Enforcer → Defense Wall +20%

This adds **strategic depth** without graphics.

---

## **3. Territory Control Loop**

After MVP, introduce the addictive mechanic:

### **City Map (Text-Based)**

You create a “city” using simple sections:

* Downtown
* Industrial zone
* Docks
* East side
* Suburbs

Each territory:

* Has limited slots
* Is captured by attacking
* Gives income multipliers
* Can be taxed
* Can be defended by crew
* Is fought over in real-time

This gives mafia game feel **without art**.

---

## **4. Family & Syndicate System (Social Core)**

Guilds = MASSIVE power.

Players can:

* Create a Family (TON cost = TON sink)
* Recruit members
* Pool cash
* Capture and defend territory
* Join Family Wars every season
* Share boosts inside the family

### **Family Ranking**

* Total Net Worth
* Total Territory
* Boss Strength
* Family Crew Size

### **Family Roles**

* Boss (leader)
* Underboss
* Consigliere
* Caporegimes
* Soldiers
* Street Runners

Each role has a **functional perk**:

* Caporegimes can declare attacks
* Consigliere gets +10% intel
* Underboss gets reduced turn costs

This keeps people loyal to their families.

---

## **5. Events & Seasonal Content Loop**

Events are the most powerful retention tool.

### **Event Ideas**

* **Heist Week:**
  Families can run large heists for huge bonus cash.

* **Smuggling Season:**
  Cash from smuggling is doubled.
  Players shift strategies → dynamic meta.

* **Hitlist War:**
  Global leaderboard for most successful kills.

* **Auction House Week:**
  Limited operatives or boosts auctioned using TON.

Players log in DAILY to not fall behind.

---

## **6. TON Economy & Premium Systems (Fully Expanded)**

Here’s where we design **TON sinks** without making the game pay to win.

### **1. Turn Packs**

* Buy 50 / 150 / 500 turns
* Always sells

### **2. Boost Packs**

Temporary buffs:

* +25% business income for 24h
* +15% attack for 12h
* +20% defense for 24h
* +50% turn regen for 2h

Boosts = high-margin TON sink.

### **3. Premium Operatives**

* Unique “legendary crew”
* Limited supply per season
* Can’t be revived if killed

Example:
**“Viper” the Assassin**

* 4× attack efficiency
* Costs TON
* Only 100 exist per season

Players FIGHT over these.

### **4. Seasonal Passes**

* Free track + TON premium track
* Rewards throughout the season
* Late-game monetization goldmine

### **5. Prestige Reset + Permanent Upgrades**

Players use TON to:

* Reset early
* Get small permanent bonuses (e.g., +3% business income every prestige)

Prestige = whale bait.

### **6. Auction House**

Players bid TON for:

* Rare operatives
* Business deeds
* Family perks

TON → Game wallet
Game wallet → Your revenue
This alone prints money.

---

# ⭐ ADVANCED SYSTEMS (Optional But Powerful)

## **1. Player-Owned Businesses (Late Game)**

Players can buy ENTIRE businesses using TON:

* Casino
* Club
* Smuggling route
* LA “Shipping Company”
* Taxi Company (for logistics)

Other players pay fees to use them.

This creates a powerful **TON sink + TON utility**.

---

## **2. Crime Reputation / Notoriety System**

Your reputation changes gameplay:

* **Low notoriety:** safer, stealthy attacks
* **High notoriety:** more cash rewards but more enemies
* **Infamous:** all eyes on you, huge rewards, huge risks

Players can go full villain.

---

## **3. Bounties**

Players place TON bounties on rivals.

Other players kill them and earn the TON.

This creates:

* Politics
* Betrayal
* Social drama
* High engagement

---

## **4. Real-Time Turf Wars (Family vs Family)**

At specific times (event-like):

* Families fight for control of a territory in real-time
* 10-minute war windows
* High pressure, high adrenaline
* Massive bragging rights

Your Telegram bot pushes:

> “East Side territory is under attack! Defend it!”

Players spam into battle immediately.

---

## **5. Limited-Edition Skins & Titles (Simple CSS)**

Minimal art needed:

* Colored nameplates
* Custom borders
* Titles like

  * “The Don”
  * “Godfather”
  * “Shadow Boss”
  * “Kingpin”
  * “East Side Ruler”

Players love cosmetics even more than stats.

---

# ⭐ LONG-TERM RETENTION FOUNDATION

### **Season Resets**

Every 10–14 days:

* Leaderboard resets
* Prizes issued
* New bonuses introduced
* New rare operatives appear
* Families reorganize

This keeps the economy stable and competitive.

---

### **Meta Shift Every Season**

Examples:

* “Collectors get +50% revenue this season”
* “Smugglers weakened by police raids”
* “Defenders buffed in late game”

Players constantly adapt.

---

### **Rarity System**

* Common crew
* Uncommon crew
* Rare operatives
* Legendary operatives
* Mythic family bosses (TON-only)

This supports endless progression.

---

# ⭐ FINAL: THE BIG PICTURE

If MVP is a **basic mafia numbers game**,
the full system becomes a **Telegram mafia MMO**.

You end up with:

* Economy building
* Crew management
* Family warfare
* Territory control
* Events & seasons
* PvP rivalry
* A thriving TON player-driven economy
* Deep strategic meta
* Minimal or zero art
* 80% engagement powered by competition, bragging, and social pressure

This is WAY more durable and addictive than a simple mini-app game.

---

