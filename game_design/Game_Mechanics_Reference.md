# The Syndicate - Complete Game Mechanics Reference

> **Last Updated:** December 2024  
> **Purpose:** Definitive technical reference for all game systems. All values extracted directly from database RPCs.

---

## Table of Contents
1. [Player Stats & Resources](#1-player-stats--resources)
2. [Energy & Stamina Regeneration](#2-energy--stamina-regeneration)
3. [Leveling & Experience](#3-leveling--experience)
4. [Jobs (PvE)](#4-jobs-pve)
5. [PvP Combat System](#5-pvp-combat-system)
6. [Businesses](#6-businesses)
7. [Crew System](#7-crew-system)
8. [Item & Inventory System](#8-item--inventory-system)
9. [Safe Storage System](#9-safe-storage-system)
10. [Lucky Wheel / Daily Spin](#10-lucky-wheel--daily-spin)
11. [Family (Gang) System](#11-family-gang-system)
12. [Tasks & Daily Rewards](#12-tasks--daily-rewards)
13. [Banking System](#13-banking-system)
14. [Leaderboards](#14-leaderboards)
15. [Rank Titles](#15-rank-titles)
16. [Boosters](#16-boosters)

---

## 1. Player Stats & Resources

### Currencies
| Currency | Starting Value | Description |
|----------|----------------|-------------|
| Cash | 50,000 | Primary currency, at risk in PvP |
| Banked Cash | 0 | Protected cash in vault |
| Diamonds | 50 | Premium currency |

### Combat Stats (Base Values)
| Stat | Default | Purpose |
|------|---------|---------|
| Strength | 10 | Base attack power |
| Defense | 10 | Damage reduction |
| Agility | 10 | Future: evasion |
| Intelligence | 10 | Future: special abilities |

### Tracking Stats
- `total_attacks` - PvP attacks initiated
- `total_attacks_won` - PvP victories
- `total_jobs_completed` - PvE jobs completed
- `total_kills` - Crew kills

### Protection
- **Newbie Shield:** 48 hours from account creation (cannot be attacked)
- **Protection:** Purchased shield expiry time

---

## 2. Energy & Stamina Regeneration

### Energy
| Property | Value |
|----------|-------|
| Starting | 100 |
| Maximum | 100 |
| Regeneration Rate | **1 energy per minute** |
| Used For | Jobs (PvE) |

### Stamina
| Property | Value |
|----------|-------|
| Starting | 50 |
| Maximum | 50 |
| Regeneration Rate | **1 stamina per 4 minutes** |
| Used For | PvP Attacks |

> **Level Up Bonus:** Energy and Stamina are fully refilled on level up.

---

## 3. Leveling & Experience

### XP Formula
```
XP Needed for Next Level = 100 × (Current Level)^1.5
```

| Level | XP Required |
|-------|-------------|
| 1 | 100 |
| 5 | 559 |
| 10 | 1,000 |
| 20 | 1,789 |
| 50 | 3,536 |

### Level Up Rewards
- Energy refilled to max
- Stamina refilled to max

### Rank Titles by Level (ProfilePage)
| Level | Title |
|-------|-------|
| 1-9 | Associate |
| 10-19 | Made Man |
| 20-29 | Capo |
| 30-39 | Boss |
| 40-49 | Don |
| 50+ | Godfather |

---

## 4. Jobs (PvE)

### Job Execution Flow
1. Check level requirement
2. Check energy availability
3. Deduct energy cost
4. Roll for success (`1-100 vs success_rate`)
5. If success: grant cash, XP, respect
6. If fail: no rewards, energy still consumed

### Job Definition Schema
```sql
job_definitions:
  - name: TEXT
  - tier: INTEGER (1-5)
  - energy_cost: INTEGER
  - cash_reward: INTEGER
  - experience_reward: INTEGER
  - respect_reward: INTEGER
  - success_rate: INTEGER (0-100%)
  - required_level: INTEGER
```

---

## 5. PvP Combat System

### Attack Types
| Attack | Stamina | Requires | Steals | Caps |
|--------|---------|----------|--------|------|
| **Mugging** | 5 | Nothing | 20% pocket cash | 45% |
| **Business Raid** | 10 | Crew | 30% cash + contraband | 45% |
| **Safe Heist** | 15 | Crew + Consumables | 15% vault + contraband | 15% vault |
| **Drive-By** | 12 | Consumables | 10% respect | 100 cap, kills crew |

### Win Chance Calculation
```
Attacker Strength = (Level × 10) + Crew Attack Bonus + (Respect ÷ 10)
Defender Strength = (Level × 10) + Crew Defense Bonus + (Respect ÷ 10)

Strength Ratio = Attacker / Defender

Ratio ≥ 2.0  → 85% win chance
Ratio ≥ 1.5  → 70% win chance
Ratio ≥ 1.0  → 55% win chance
Ratio ≥ 0.75 → 40% win chance
Ratio ≥ 0.5  → 25% win chance
Ratio < 0.5  → 15% win chance
```

### Victory Outcomes
- Steal cash/vault/contraband based on attack type
- Gain respect (+5 bonus + stolen respect)
- Kill defender crew (if Drive-By, up to 25% or max 5)

### Defeat Outcomes
- Lose respect (2-10 based on strength mismatch)
- Lose crew (if attack required crew)
- Defender gains +3 respect

### Loss Caps
- **Maximum theft:** 45% of target's resources
- **Vault heist:** Maximum 15% of vault
- **Respect theft:** Maximum 100 respect per attack
- **Crew kills:** Maximum 5 per attack (or 25% of defender's crew)

---

## 6. Businesses

### Purchase
```sql
Cost = base_purchase_cost
```

### Income
```sql
Income per Collection = base_income_per_hour × level × hours_elapsed
```

### Upgrade Cost
```sql
Upgrade Cost = base_purchase_cost × (upgrade_cost_multiplier ^ current_level)
```
Default multiplier: **1.5**

### Business Definition Schema
```sql
business_definitions:
  - tier: INTEGER (1-5)
  - base_income_per_hour: INTEGER
  - base_purchase_cost: INTEGER
  - upgrade_cost_multiplier: DECIMAL (default 1.5)
  - max_level: INTEGER (default 10)
  - collect_cooldown_minutes: INTEGER (default 60)
  - requires_ton: BOOLEAN
```

---

## 7. Crew System

### Crew Types
| Type | Purpose |
|------|---------|
| Enforcer | Attack bonus |
| Bodyguard | Defense bonus |
| Hitman | Attack bonus |
| Driver | Special: Escape bonus |
| Accountant | Special: Income bonus |

### Crew Definition Schema
```sql
crew_definitions:
  - type: TEXT
  - attack_bonus: INTEGER
  - defense_bonus: INTEGER
  - special_bonus: TEXT
  - hire_cost: INTEGER
  - upkeep_per_hour: INTEGER
```

### Combat Contribution
- Total Attack = Base Strength + Σ(crew_attack_bonus × quantity) + Equipped Weapon Bonuses
- Total Defense = Base Defense + Σ(crew_defense_bonus × quantity) + Equipped Equipment Bonuses

---

## 8. Item & Inventory System

### Item Categories
| Category | Purpose |
|----------|---------|
| Weapon | Attack bonuses |
| Equipment | Defense bonuses |
| Contraband | Can be stolen, sellable |

### Item Rarity
- Common
- Uncommon
- Rare
- Legendary

### Item Location States
- `inventory` - In player's bag
- `equipped` - Active (legacy)
- `safe` - Protected storage

### Equipment Assignment
- Weapons assigned to crew provide attack bonus
- Equipment assigned to crew provides defense bonus
- Items must be unassigned before moving to safe

---

## 9. Safe Storage System

### Safe Mechanics
- Items in safe **cannot be stolen** in PvP
- **10 minute cooldown** when moving items INTO safe (before they can be removed)
- Equipped/assigned items must be unassigned first

### Safe Slot Packages (TON Purchase)
| Package | Slots | Price (TON) |
|---------|-------|-------------|
| Bronze | 5 | TBD |
| Silver | 10 | TBD |
| Gold | 25 | TBD |
| Platinum | 50 | TBD |

> Packages **stack** (add slots, don't replace)

---

## 10. Lucky Wheel / Daily Spin

### Spin Availability
- **Free Spin:** Once every 24 hours
- **Paid Spin:** 10 diamonds per additional spin

### Prize Pool (Weighted)
| Prize | Type | Amount | Weight |
|-------|------|--------|--------|
| $500 | cash | 500 | 25 |
| $2,000 | cash | 2,000 | 15 |
| $5,000 | cash | 5,000 | 8 |
| 5 💎 | diamonds | 5 | 12 |
| 15 💎 | diamonds | 15 | 6 |
| 50 💎 | diamonds | 50 | 2 |
| +20 ⚡ | energy | 20 | 12 |
| +10 🏃 | stamina | 10 | 10 |
| +50 ⭐ | respect | 50 | 5 |
| Try Again | nothing | 0 | 5 |

**Total Weight:** 100

---

## 11. Family (Gang) System

### Creating a Family
- **Cost:** 100 diamonds
- Creator becomes **Boss**

### Family Roles (Hierarchy)
1. **Boss** - Full control, can promote/demote/kick anyone
2. **Underboss** - Can promote/demote/kick (except Boss & other Underboss)
3. **Consigliere** - Advisory role
4. **Caporegime** - Mid-tier leadership
5. **Soldier** - Standard member
6. **Street Runner** - New member (default join role)

### Role Permissions
| Action | Boss | Underboss | Others |
|--------|------|-----------|--------|
| Change roles | ✓ | ✓ (limited) | ✗ |
| Kick members | ✓ | ✓ (not Underboss) | ✗ |
| Assign Underboss | ✓ | ✗ | ✗ |
| Transfer Boss | ✓ | ✗ | ✗ |
| Update settings | ✓ | ✗ | ✗ |
| Disband family | ✓ | ✗ | ✗ |

### Treasury
- Members can **contribute** cash to family treasury
- Contributions are tracked per-member
- Treasury displayed on family page

### Joining a Family
- Must meet `min_level_required`
- Family must have `is_recruiting = true`
- Cannot be in another family

### Leaving a Family
- Members can leave freely
- **Boss cannot leave** if other members exist (must kick all or transfer)
- If Boss leaves empty family, family is **disbanded**

---

## 12. Tasks & Daily Rewards

### Task Types
| Type | Description |
|------|-------------|
| telegram | Social tasks (join channel, etc.) |
| daily | Resets daily |
| weekly | Resets weekly |
| special | One-time events |
| ad | Watch ads for rewards |

### Task Reward Types
- Cash
- Diamonds
- Energy

### Daily Rewards
- 7-day cycle (days 1-7)
- Streak tracking
- Reward types: cash, diamonds, energy, item

---

## 13. Banking System

### Deposit
```sql
Transfer cash from pocket → vault
```

### Withdraw
```sql
Transfer cash from vault → pocket
```

### Vault Protection
- Vault cash is **partially protected** from PvP (max 15% stealable via Safe Heist)
- Pocket cash is **vulnerable** (20-30% stealable based on attack type)

---

## 14. Leaderboards

### Leaderboard Types
| Type | Ranking By |
|------|------------|
| `networth` | Cash + Banked Cash |
| `kills` | Total Kills |
| `respect` | Respect Points |
| `level` | Level + XP (tiebreaker) |

### Net Worth Calculation (Full)
```sql
Net Worth = Cash + Banked Cash + Σ(business_base_cost × business_level)
```

---

## 15. Rank Titles

### Unified Rank System (by Level)
| Level Range | Rank |
|-------------|------|
| 1-4 | Street Thug |
| 5-14 | Enforcer |
| 15-29 | Soldier |
| 30-49 | Caporegime |
| 50-74 | Underboss |
| 75-99 | Boss |
| 100+ | Godfather |

> All rank displays (HomePage, ProfilePage, RankBadge) now use this unified system.

---

## 16. Boosters

### Booster Types
| Booster | Effect |
|---------|--------|
| `2x_income` | Double business income |
| `2x_attack` | Double attack power |
| `shield` | Protection from attacks |
| `vip_pass` | Premium access |

### Booster Schema
```sql
player_boosters:
  - booster_type: TEXT
  - expires_at: TIMESTAMPTZ
  - activated_at: TIMESTAMPTZ
```

---

## Appendix: Database Table Summary

### Core Player Tables
- `players` - Player stats, currencies, protection
- `player_inventory` - Owned items
- `player_crew` - Hired crew
- `player_businesses` - Owned businesses
- `player_achievements` - Achievement progress
- `player_tasks` - Task completion
- `player_daily_rewards` - Daily streak
- `player_boosters` - Active boosters
- `player_safe_slots` - Vault capacity

### Definition Tables
- `item_definitions` - Weapons, equipment, contraband
- `crew_definitions` - Hireable crew
- `business_definitions` - Purchasable businesses
- `job_definitions` - PvE jobs
- `achievement_definitions` - Achievements
- `task_definitions` - Tasks
- `daily_reward_definitions` - Daily reward cycle
- `pvp_attack_types` - Attack types
- `lucky_wheel_prizes` - Wheel prizes
- `safe_packages` - TON purchase options

### Family Tables
- `families` - Gang data
- `family_members` - Membership & roles

### Activity Logs
- `attack_log` - PvP history
- `job_log` - PvE history
- `transactions` - All currency movements
- `ad_views` - Ad reward tracking
- `notifications` - Player notifications

---

*This document reflects the current state of the database schema and RPC functions as of December 2024.*
