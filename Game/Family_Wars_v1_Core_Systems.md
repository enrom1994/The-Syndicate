# Family Wars v1 — Core Systems Spec

> **Status**: Implementation-Ready  
> **Version**: 1.0  
> **Last Updated**: 2025-12-19

This document defines the locked systems for Family Wars v1. All philosophical decisions are finalized. This is a dev-handoff spec.

---

## 🔒 Locked Decisions (Reference Only)

| System | Decision |
|--------|----------|
| **Contraband** | Converts to cash. No direct war use. |
| **Armory** | Readiness score, not storage. Items counted, not consumed. |
| **Loyalty** | Eligibility + weighting. Not a currency. No ATK/DEF bonus. |
| **Turf Map** | Server-driven. 12–18 abstract turfs. SVG rules locked. |

---

# Part 1: War Action Resolution Math

## 1.1 Overview

Territory actions (e.g., "Assault Territory") resolve via a **deterministic probability calculation** followed by a single random roll.

**Core Principle:**
> Preparation wins wars. No single player decides outcomes. Results are explainable.

---

## 1.2 Inputs

### A. Attacker Inputs

| Input | Symbol | Source |
|-------|--------|--------|
| Total Family Respect | `A_respect` | Sum of all family members' respect |
| Eligible Participants | `A_count` | Members with `loyalty >= LOYALTY_THRESHOLD` |
| Loyalty Pool | `A_loyalty` | Sum of eligible members' loyalty |
| Armory Readiness | `A_ready` | Boolean: all action requirements met |

### B. Defender Inputs

| Input | Symbol | Source |
|-------|--------|--------|
| Total Family Respect | `D_respect` | Sum of all family members' respect |
| Eligible Participants | `D_count` | Members with `loyalty >= LOYALTY_THRESHOLD` |
| Loyalty Pool | `D_loyalty` | Sum of eligible members' loyalty |
| Owner Bonus | `D_owner` | Fixed multiplier for holding territory |
| Lock State | `D_locked` | Boolean: territory currently locked |

---

## 1.3 Eligibility Gate (Pre-Roll)

Before any calculation, verify:

```
IF A_ready == FALSE → REJECT action (Armory not ready)
IF D_locked == TRUE → REJECT action (Territory locked)
IF A_count < MIN_PARTICIPANTS → REJECT action (Not enough eligible members)
```

**Constants (v1 defaults):**
- `LOYALTY_THRESHOLD = 100` (minimum loyalty to participate)
- `MIN_PARTICIPANTS = 3` (minimum eligible attackers)

---

## 1.4 Power Score Calculation

### Step 1: Raw Power

```
A_power = A_respect × (1 + A_loyalty / LOYALTY_SCALE)
D_power = D_respect × (1 + D_loyalty / LOYALTY_SCALE) × DEFENDER_BONUS
```

**Constants:**
- `LOYALTY_SCALE = 10000` (normalizes loyalty contribution)
- `DEFENDER_BONUS = 1.25` (25% home-turf advantage)

### Step 2: Participation Modifier

Larger families are stronger, but not linearly dominant.

```
A_participation = sqrt(A_count)
D_participation = sqrt(D_count)
```

### Step 3: Effective Power

```
A_effective = A_power × A_participation
D_effective = D_power × D_participation
```

---

## 1.5 Success Probability Formula

```
P_success = A_effective / (A_effective + D_effective)
```

This produces a value between 0.0 and 1.0.

### Clamping (Anti-Stomp)

To prevent guaranteed outcomes:

```
P_success = CLAMP(P_success, MIN_CHANCE, MAX_CHANCE)
```

**Constants:**
- `MIN_CHANCE = 0.10` (10% minimum — underdogs always have hope)
- `MAX_CHANCE = 0.90` (90% maximum — no guaranteed wins)

---

## 1.6 Resolution

```
roll = random(0.0, 1.0)
IF roll < P_success → ATTACKER WINS
ELSE → DEFENDER WINS
```

---

## 1.7 Outcome Effects (v1)

| Outcome | Effect |
|---------|--------|
| **Attacker Wins** | Territory ownership transfers. Cooldown applied. Treasury cost deducted. |
| **Attacker Loses** | No territory change. Treasury cost still deducted. Cooldown applied. |

**Treasury Cost**: Fixed per-action (e.g., `$50,000` for Assault). Deducted regardless of outcome.

**Cooldown**: Territory becomes `locked` for a fixed duration (e.g., 24 hours) after any action resolves.

---

## 1.8 Worked Examples

### Example 1: Even Match

| Stat | Attacker | Defender |
|------|----------|----------|
| Respect | 50,000 | 50,000 |
| Loyalty Pool | 5,000 | 5,000 |
| Eligible Members | 9 | 9 |

**Calculation:**
```
A_power = 50000 × (1 + 5000/10000) = 50000 × 1.5 = 75,000
D_power = 50000 × 1.5 × 1.25 = 93,750

A_participation = sqrt(9) = 3
D_participation = sqrt(9) = 3

A_effective = 75000 × 3 = 225,000
D_effective = 93750 × 3 = 281,250

P_success = 225000 / (225000 + 281250) = 0.444 (44.4%)
```

**Result**: Defender has the edge (~55.6%) due to home-turf bonus.

---

### Example 2: Underdog Attack

| Stat | Attacker | Defender |
|------|----------|----------|
| Respect | 20,000 | 100,000 |
| Loyalty Pool | 8,000 | 2,000 |
| Eligible Members | 5 | 15 |

**Calculation:**
```
A_power = 20000 × (1 + 8000/10000) = 20000 × 1.8 = 36,000
D_power = 100000 × (1 + 2000/10000) × 1.25 = 100000 × 1.2 × 1.25 = 150,000

A_participation = sqrt(5) = 2.24
D_participation = sqrt(15) = 3.87

A_effective = 36000 × 2.24 = 80,640
D_effective = 150000 × 3.87 = 580,500

P_success = 80640 / (80640 + 580500) = 0.122 → CLAMPED to 0.10 (10%)
```

**Result**: Underdog still has 10% chance (anti-stomp floor).

---

### Example 3: Prepared Strike

| Stat | Attacker | Defender |
|------|----------|----------|
| Respect | 80,000 | 60,000 |
| Loyalty Pool | 12,000 | 3,000 |
| Eligible Members | 12 | 8 |

**Calculation:**
```
A_power = 80000 × (1 + 12000/10000) = 80000 × 2.2 = 176,000
D_power = 60000 × (1 + 3000/10000) × 1.25 = 60000 × 1.3 × 1.25 = 97,500

A_participation = sqrt(12) = 3.46
D_participation = sqrt(8) = 2.83

A_effective = 176000 × 3.46 = 609,000
D_effective = 97500 × 2.83 = 276,000

P_success = 609000 / (609000 + 276000) = 0.688 (68.8%)
```

**Result**: Prepared attacker has significant advantage. Loyalty investment matters.

---

## 1.9 Player-Facing Explanation

When displaying results:

```
┌─────────────────────────────────────┐
│ ASSAULT RESULT: VICTORY             │
│                                     │
│ Your Family Power: 609,000          │
│ Enemy Defense: 276,000              │
│ Success Chance: 68.8%               │
│                                     │
│ The Vipers now control DOWNTOWN.    │
└─────────────────────────────────────┘
```

Players see:
- Their effective power
- Enemy effective power
- The probability (before roll)
- Clear outcome

---

## 1.10 Balance Tuning Knobs

| Constant | Default | Effect of Increase |
|----------|---------|-------------------|
| `LOYALTY_THRESHOLD` | 100 | Fewer eligible participants |
| `LOYALTY_SCALE` | 10,000 | Loyalty matters less |
| `DEFENDER_BONUS` | 1.25 | Harder to capture territory |
| `MIN_CHANCE` | 0.10 | More upset potential |
| `MAX_CHANCE` | 0.90 | Less guaranteed wins |
| `MIN_PARTICIPANTS` | 3 | Solo attacks blocked |

All constants are server-side. No client changes needed to rebalance.

---

# Part 2: Family Armory v1 Data Model

## 2.1 Conceptual Model

The Armory is a **family-wide capability meter** built from sacrificed items.

- Items are contributed (burned from player inventory)
- Contributions increment family-level counters
- Counters gate war action eligibility
- Counters never decrease in v1

---

## 2.2 Database Schema

### Table: `family_armory`

Tracks per-family, per-category readiness.

```sql
CREATE TABLE family_armory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,  -- e.g., 'weapons', 'armor', 'vehicles'
  item_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(family_id, category)
);

-- Index for fast lookups
CREATE INDEX idx_family_armory_family ON family_armory(family_id);
```

### Table: `armory_contributions`

Audit log of all contributions (for loyalty attribution, analytics, disputes).

```sql
CREATE TABLE armory_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES item_definitions(id),
  category        TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  contributed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for player contribution history
CREATE INDEX idx_armory_contributions_player ON armory_contributions(player_id);
CREATE INDEX idx_armory_contributions_family ON armory_contributions(family_id);
```

### Table: `war_action_requirements`

Defines what each war action requires.

```sql
CREATE TABLE war_action_requirements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type     TEXT NOT NULL UNIQUE,  -- e.g., 'assault', 'reinforce', 'scout'
  min_treasury    INTEGER NOT NULL,
  min_loyalty     INTEGER NOT NULL,
  min_participants INTEGER NOT NULL DEFAULT 3,
  
  -- Armory requirements (JSON for flexibility)
  armory_requirements JSONB NOT NULL DEFAULT '{}'
  -- Example: {"weapons": 100, "armor": 50}
);
```

---

## 2.3 Item Categorization Rules

### Categories (v1)

| Category | Qualifies | Does NOT Qualify |
|----------|-----------|------------------|
| `weapons` | Tommy Gun, Revolver, Brass Knuckles | Fedora Hat, Getaway Car |
| `armor` | Armored Vest, Bulletproof Suit | Safehouse |
| `vehicles` | Getaway Car, Armored Sedan | (none currently) |

### Categorization Logic

Items are categorized via `item_definitions.armory_category`:

```sql
ALTER TABLE item_definitions
ADD COLUMN armory_category TEXT DEFAULT NULL;

-- Example values
UPDATE item_definitions SET armory_category = 'weapons' WHERE name IN ('Tommy Gun', 'Revolver');
UPDATE item_definitions SET armory_category = 'armor' WHERE name IN ('Armored Vest');
UPDATE item_definitions SET armory_category = 'vehicles' WHERE name = 'Getaway Car';
```

**Rule**: If `armory_category IS NULL`, item cannot be contributed to Armory.

---

## 2.4 Readiness Threshold Logic

### RPC: `check_armory_readiness`

```sql
CREATE OR REPLACE FUNCTION check_armory_readiness(
  p_family_id UUID,
  p_action_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_requirements JSONB;
  v_category TEXT;
  v_required INTEGER;
  v_actual INTEGER;
BEGIN
  -- Get requirements for this action
  SELECT armory_requirements INTO v_requirements
  FROM war_action_requirements
  WHERE action_type = p_action_type;

  IF v_requirements IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check each category requirement
  FOR v_category, v_required IN SELECT * FROM jsonb_each_text(v_requirements)
  LOOP
    SELECT COALESCE(item_count, 0) INTO v_actual
    FROM family_armory
    WHERE family_id = p_family_id AND category = v_category;

    IF v_actual < v_required::INTEGER THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2.5 Contribution RPC

```sql
CREATE OR REPLACE FUNCTION contribute_to_armory(
  p_player_id UUID,
  p_item_id UUID,
  p_quantity INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  v_family_id UUID;
  v_category TEXT;
  v_owned INTEGER;
BEGIN
  -- Get player's family
  SELECT family_id INTO v_family_id FROM players WHERE id = p_player_id;
  IF v_family_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not in a family');
  END IF;

  -- Get item category
  SELECT armory_category INTO v_category FROM item_definitions WHERE id = p_item_id;
  IF v_category IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item cannot be contributed');
  END IF;

  -- Check player owns enough
  SELECT quantity INTO v_owned FROM player_items 
  WHERE player_id = p_player_id AND item_id = p_item_id;
  
  IF COALESCE(v_owned, 0) < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough items');
  END IF;

  -- Deduct from player inventory
  UPDATE player_items 
  SET quantity = quantity - p_quantity
  WHERE player_id = p_player_id AND item_id = p_item_id;

  -- Increment family armory
  INSERT INTO family_armory (family_id, category, item_count)
  VALUES (v_family_id, v_category, p_quantity)
  ON CONFLICT (family_id, category) 
  DO UPDATE SET item_count = family_armory.item_count + p_quantity,
                updated_at = NOW();

  -- Log contribution
  INSERT INTO armory_contributions (family_id, player_id, item_id, category, quantity)
  VALUES (v_family_id, p_player_id, p_item_id, v_category, p_quantity);

  RETURN jsonb_build_object('success', true, 'contributed', p_quantity, 'category', v_category);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2.6 Intel-Ready Structure (Future-Proofing)

The schema supports future Intel generation without changes:

| Future Feature | How Schema Supports It |
|----------------|------------------------|
| Intel generation rate | Query `SUM(item_count)` from `family_armory` |
| Intel cap scaling | Same query with different multiplier |
| Per-member attribution | `armory_contributions` tracks who contributed what |
| Decay mechanics | Add `last_activity_at` column to `family_armory` |

**No Intel logic is implemented.** Schema is ready when needed.

---

## 2.7 Example War Action Definition

```sql
INSERT INTO war_action_requirements (action_type, min_treasury, min_loyalty, min_participants, armory_requirements)
VALUES (
  'assault',
  50000,        -- $50,000 treasury cost
  500,          -- 500 total loyalty required (from eligible members)
  3,            -- Minimum 3 eligible members
  '{"weapons": 100, "armor": 50}'  -- 100 weapons, 50 armor contributed historically
);
```

---

# Part 3: Constants Reference

All tunable values in one place:

```sql
-- War Resolution Constants
LOYALTY_THRESHOLD = 100
LOYALTY_SCALE = 10000
DEFENDER_BONUS = 1.25
MIN_CHANCE = 0.10
MAX_CHANCE = 0.90
MIN_PARTICIPANTS = 3

-- Action Costs (examples)
ASSAULT_TREASURY_COST = 50000
ASSAULT_COOLDOWN_HOURS = 24

-- Armory
CONTRIBUTION_LOYALTY_REWARD = 5  -- Loyalty per item contributed (if any)
```

---

# Part 4: Implementation Checklist

## Backend

- [ ] Create `family_armory` table
- [ ] Create `armory_contributions` table
- [ ] Create `war_action_requirements` table
- [ ] Add `armory_category` to `item_definitions`
- [ ] Implement `contribute_to_armory` RPC
- [ ] Implement `check_armory_readiness` RPC
- [ ] Implement `execute_war_action` RPC (uses resolution math)

## Frontend

- [ ] Armory contribution UI (in Family page)
- [ ] Armory readiness display
- [ ] War action button (locked until ready)
- [ ] Result display modal

## Data Seeding

- [ ] Seed `war_action_requirements` with v1 actions
- [ ] Seed `armory_category` on existing items

---

# End of Document

This spec is implementation-ready. All philosophical decisions are locked. Balance can be tuned by modifying constants only.
