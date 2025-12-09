# TON Mafia: Economy v2 — Crew-Based Equipment & Theft System

> **Status:** Design Document (PENDING APPROVAL)  
> **Last Updated:** 2025-12-09  
> **Supersedes:** Portions of original economy design related to equipment/items

---

## 📋 Overview

This document defines the new **Crew-Based Equipment System** with integrated **Theft Mechanics** for PvP combat. This replaces the previous "buy infinite items for stacking bonuses" model.

### Key Design Goals:
1. **Prevent stat inflation** — No more stacking 1000 weapons for +25,000 ATK
2. **Create meaningful risk/reward** — Equip powerful items = higher power, higher loss potential
3. **Drive player interaction** — Theft creates item circulation and revenge loops
4. **Monetization opportunity** — Safe storage as premium feature

---

## 🎭 I. Crew System

### Crew Member Types

Each crew type has different base stats and **survival chance** when attacked:

| Crew Type | Base ATK | Base DEF | Survival % | Cost | Description |
|-----------|----------|----------|------------|------|-------------|
| **Thug** | +2 | +1 | 60% | $5,000 | Cheap cannon fodder |
| **Bodyguard** | +1 | +5 | 80% | $15,000 | Tanky protectors |
| **Enforcer** | +5 | +2 | 50% | $25,000 | Glass cannon damage |
| **Lieutenant** | +8 | +8 | 70% | $100,000 | Elite all-rounder |
| **Underboss** | +15 | +15 | 85% | $500,000 | Premium crew (late game) |

### Crew Capacity

- **Base Crew Slots:** 5
- **Max Crew Slots:** 20 (unlocked via level/purchases)
- **Unlock Method:**
  - Level 10: +2 slots
  - Level 25: +3 slots
  - Level 50: +5 slots
  - TON Purchase: +5 slots (one-time)

---

## ⚔️ II. Equipment System

### Equipment & Crew Relationship

```
┌─────────────────────────────────────────────────────────────┐
│  PLAYER STATS                                               │
│                                                             │
│  Total ATK = Base ATK + Σ(Crew ATK) + Σ(Equipped Weapons)   │
│  Total DEF = Base DEF + Σ(Crew DEF) + Σ(Equipped Armor)     │
│                                                             │
│  Equipment Capacity = Number of Crew Members                │
│  (Each crew member can equip 1 weapon + 1 armor)            │
└─────────────────────────────────────────────────────────────┘
```

### Equipment Slots Per Crew Member

| Slot | Type | Example Items |
|------|------|---------------|
| **Weapon** | Offensive | Revolver, Tommy Gun, Brass Knuckles |
| **Armor** | Defensive | Leather Jacket, Bulletproof Vest |

### Example Calculation

```
Player Base Stats: ATK 10, DEF 10

Crew:
├── Bodyguard #1 (ATK +1, DEF +5)
│   └── Weapon: Golden Revolver (+25 ATK)
│   └── Armor: Bulletproof Vest (+20 DEF)
├── Bodyguard #2 (ATK +1, DEF +5)
│   └── Weapon: Tommy Gun (+40 ATK)
│   └── Armor: None
└── Enforcer #1 (ATK +5, DEF +2)
    └── Weapon: Switchblade (+10 ATK)
    └── Armor: Leather Jacket (+5 DEF)

TOTAL ATK = 10 + (1+1+5) + (25+40+10) = 10 + 7 + 75 = 92
TOTAL DEF = 10 + (5+5+2) + (20+0+5)  = 10 + 12 + 25 = 47
```

---

## 💀 III. Attack & Theft System

### Attack Flow

```
┌─────────────────────────────────────────────────────────────┐
│  PVP ATTACK RESOLUTION                                      │
│                                                             │
│  1. Validate: 24hr cooldown on same target                  │
│  2. Check: Attacker has stamina                             │
│  3. Calculate: Attacker ATK vs Defender DEF                 │
│  4. Apply random factor (±15%)                              │
│  5. Determine winner                                        │
│                                                             │
│  IF ATTACKER WINS:                                          │
│  ├── Steal: X% of defender's un-banked cash                 │
│  ├── Gain: Respect points                                   │
│  ├── FOR EACH defender crew member:                         │
│  │    └── Roll survival chance (based on crew type)         │
│  │         ├── SURVIVES: No effect                          │
│  │         └── DIES: Crew removed, weapon drops to attacker │
│  ├── FOR EACH defender inventory item:                      │
│  │    └── Roll theft chance (3-8% per item)                 │
│  │         ├── NOT STOLEN: No effect                        │
│  │         └── STOLEN: Item goes to attacker                │
│  └── Record attack (for cooldown + activity log)            │
│                                                             │
│  IF DEFENDER WINS:                                          │
│  ├── Attacker loses stamina (no refund)                     │
│  ├── Attacker may lose some cash                            │
│  └── Defender gains small respect                           │
└─────────────────────────────────────────────────────────────┘
```

### Theft Probability Table

| Item Location | Base Theft % | Modified By |
|---------------|--------------|-------------|
| **Equipped on Crew** | 100% (if crew dies) | Crew survival chance |
| **In Safe Storage** | 0% | Immune to theft |
| **In Inventory** | 3-8% per item | Attack margin, item rarity |

### Crew Survival Modifiers

The base survival chance can be modified by:

| Factor | Modifier |
|--------|----------|
| Victory margin > 50% | -10% survival |
| Victory margin > 75% | -20% survival |
| Defender has armor equipped | +5% survival per armor |
| Defender is in Family | +5% survival |

---

## 🔒 IV. Safe Storage System (Monetization)

### Free Safe Storage
- **Cash Safe:** Already exists (bank mechanic)
- **Item Safe Slots:** 0 (base)

### Premium Safe (TON Purchase)

| Package | Safe Slots | Price | Duration |
|---------|------------|-------|----------|
| **Bronze Vault** | 3 slots | 0.5 TON | Permanent |
| **Silver Vault** | 7 slots | 1.5 TON | Permanent |
| **Gold Vault** | 15 slots | 4 TON | Permanent |
| **Platinum Vault** | 30 slots | 10 TON | Permanent |

### Safe Storage Rules
- Items in safe **cannot be equipped**
- Items in safe **cannot be stolen**
- Moving item from safe to inventory = instant
- Moving item from inventory to safe = 10 minute cooldown (prevents panic-saving during attack)

---

## 🔄 V. 24-Hour Attack Cooldown

### Rules
1. After attacking a player, you **cannot attack them again for 24 hours**
2. Cooldown is per-attacker, per-defender (A attacks B = A can't attack B, but C can)
3. Cooldown stored in database with timestamps
4. Displayed in UI when viewing potential targets

### Purpose
- Prevents griefing/farming single players
- Allows time for revenge
- Creates healthier PvP ecosystem

---

## 📊 VI. Database Schema Changes

### Modified Tables

```sql
-- player_crew (NEW structure)
CREATE TABLE player_crew (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  crew_type TEXT NOT NULL, -- 'thug', 'bodyguard', 'enforcer', 'lieutenant', 'underboss'
  equipped_weapon_id UUID REFERENCES player_inventory(id),
  equipped_armor_id UUID REFERENCES player_inventory(id),
  hired_at TIMESTAMPTZ DEFAULT NOW()
);

-- player_inventory (MODIFIED)
ALTER TABLE player_inventory ADD COLUMN location TEXT DEFAULT 'inventory'; 
-- location: 'inventory' | 'equipped' | 'safe'
ALTER TABLE player_inventory ADD COLUMN safe_until TIMESTAMPTZ;
-- safe_until: timestamp when item can be moved out (10min cooldown)

-- player_safe_slots (NEW)
CREATE TABLE player_safe_slots (
  player_id UUID PRIMARY KEY REFERENCES players(id),
  total_slots INTEGER DEFAULT 0,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- attack_cooldowns (NEW)
CREATE TABLE attack_cooldowns (
  id UUID PRIMARY KEY,
  attacker_id UUID REFERENCES players(id) ON DELETE CASCADE,
  defender_id UUID REFERENCES players(id) ON DELETE CASCADE,
  attacked_at TIMESTAMPTZ DEFAULT NOW(),
  cooldown_until TIMESTAMPTZ NOT NULL,
  UNIQUE(attacker_id, defender_id)
);
```

### New/Modified RPC Functions

| Function | Purpose |
|----------|---------|
| `calculate_player_stats(player_id)` | Returns total ATK/DEF including crew + equipment |
| `execute_pvp_attack(attacker_id, defender_id)` | Complete attack flow with theft/crew death |
| `equip_item_to_crew(player_id, item_id, crew_id, slot)` | Equip weapon/armor to specific crew member |
| `unequip_item_from_crew(player_id, item_id)` | Return item to inventory |
| `move_item_to_safe(player_id, item_id)` | Move item to safe storage |
| `move_item_from_safe(player_id, item_id)` | Return item to inventory |
| `purchase_safe_upgrade(player_id, package)` | Buy safe slots with TON |
| `check_attack_cooldown(attacker_id, defender_id)` | Check if attack is allowed |

---

## 🎮 VII. UI Changes Required

### New Components/Pages

1. **Crew Management Page**
   - View all crew members
   - See equipped weapons/armor on each
   - Equip/unequip items
   - Hire/fire crew

2. **Safe Storage UI**
   - View items in safe
   - Move items to/from safe
   - Purchase safe upgrades

3. **Attack Page Updates**
   - Show cooldown status for each target
   - Display potential loot preview
   - Show theft risk warning

4. **Inventory Page Updates**
   - Show item location (equipped/inventory/safe)
   - Add "Equip to Crew" action
   - Add "Move to Safe" action

---

## 💡 VIII. Strategic Implications

### Player Strategies

| Strategy | Description | Risk/Reward |
|----------|-------------|-------------|
| **Glass Cannon** | Equip best items on crew | High ATK, high loss risk |
| **Turtle** | Keep items in safe, use cheap crew | Low ATK, protected investments |
| **Balanced** | Mix of good gear + safe storage | Medium power, medium risk |
| **Whale** | Buy large safe + best gear | Best of both (pay to win lite) |

### Economic Effects

1. **Item Sink:** Items leave circulation via theft → less inflation
2. **Active Play:** Players must defend or risk losing equipment
3. **Revenge Loop:** Theft drives retaliation → engagement
4. **Monetization:** Safe storage = real value purchase

---

## ✅ IX. Implementation Checklist

- [ ] Create new database migrations for schema changes
- [ ] Update `player_crew` table with equipment slots
- [ ] Add `location` column to `player_inventory`
- [ ] Create `attack_cooldowns` table
- [ ] Create `player_safe_slots` table
- [ ] Implement `calculate_player_stats` RPC
- [ ] Update `execute_pvp_attack` RPC with theft logic
- [ ] Implement crew death mechanics
- [ ] Implement safe storage RPCs
- [ ] Create Crew Management UI
- [ ] Create Safe Storage UI
- [ ] Update Attack page with cooldowns
- [ ] Update Inventory page with locations
- [ ] Add safe purchase to TON shop

---

## ✅ X. Confirmed Decisions

1. **Armor theft:** ✅ When crew dies, they drop **BOTH weapon AND armor**
2. **Crew survival:** ✅ Add `survival_chance` column to `crew_definitions` table
3. **Safe pricing:** ✅ Bronze 0.5 TON / Silver 1.5 TON / Gold 4 TON / Platinum 10 TON
4. **Crew re-hire:** Player must buy new crew from store (no healing)

---

*This document serves as the design specification. Implementation approved 2025-12-09.*
