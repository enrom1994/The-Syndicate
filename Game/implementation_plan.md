# Minimal Compliance Gap Fixes - Implementation Plan

This document proposes the **minimal required implementation changes** to close the compliance gaps identified in the Specification Compliance Audit. Scope is strictly limited to:
1. Stars currency (schema, balance tracking, sinks)
2. Crew upkeep enforcement (guaranteed, non-optional)
3. Insurance system implementation
4. Documentation updates where behavior is intentional

---

## Executive Summary

| Gap | Impact | Effort | Risk |
|-----|--------|--------|------|
| Stars Currency | Monetization | Medium | Low (additive) |
| Crew Upkeep Enforcement | **Economy Safety** | Low | Medium (touches core loop) |
| Insurance System | Player Retention | Medium | Low (additive) |
| Documentation Updates | Compliance | Low | None |

---

## 1. Stars Currency Implementation

### Current State
The database has **3 currencies**: `cash`, `banked_cash`, `diamonds`. No "Stars" currency exists in the schema or frontend.

### What Must Change

#### [NEW] `supabase/migrations/110_stars_currency.sql`

```sql
-- 1. Add stars column to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0;

-- 2. Update transactions currency constraint to include 'stars'
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_currency_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_currency_check 
CHECK (currency IN ('cash', 'diamonds', 'stars'));

-- 3. Create increment_stars function (atomic)
CREATE OR REPLACE FUNCTION increment_stars(player_id_input UUID, amount INTEGER, source TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.players 
    SET stars = stars + amount, updated_at = NOW()
    WHERE id = player_id_input;
    
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, source, 'stars', amount, source || ': ' || amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create spend_stars function (with validation)
CREATE OR REPLACE FUNCTION spend_stars(player_id_input UUID, amount INTEGER, reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_stars INTEGER;
BEGIN
    SELECT stars INTO current_stars FROM public.players WHERE id = player_id_input;
    
    IF current_stars >= amount AND amount > 0 THEN
        UPDATE public.players 
        SET stars = stars - amount, updated_at = NOW()
        WHERE id = player_id_input;
        
        INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, reason, 'stars', -amount, reason || ': -' || amount);
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### [MODIFY] [src/hooks/useGameStore.ts](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/hooks/useGameStore.ts)
- Add `stars: number` to the player state type
- Include `stars` in `loadPlayerData()` fetch
- Create `incrementStars()` and `spendStars()` actions

#### [MODIFY] Frontend Display
- Add Stars display to homepage currency bar (similar to Diamonds)
- Add Stars to any relevant shop/purchase UI

### Affects Player Balance?
**Yes** - New currency needs sources and sinks to be defined (IAP, rewards, premium purchases).

### Risks & Dependencies
- Low risk - purely additive
- Dependency: Needs Stars sources/sinks defined before it's useful (out of scope per task)

---

## 2. Crew Upkeep Enforcement (Critical)

### Current State
- [045_crew_upkeep.sql](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/supabase/migrations/045_crew_upkeep.sql) creates `process_crew_upkeep()` function
- Relies on `pg_cron` scheduled job (`crew-upkeep-hourly`)
- **If pg_cron fails/disabled, upkeep is NEVER collected** → hyperinflation
- [Plan.md](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/Game/Plan.md) proposes "Lazy Upkeep" but it is **NOT IMPLEMENTED**

### What Must Change

#### [NEW] `supabase/migrations/111_lazy_upkeep_enforcement.sql`

```sql
-- =====================================================
-- LAZY UPKEEP ENFORCEMENT
-- =====================================================
-- Guarantees upkeep is processed on player activity,
-- not just relying on pg_cron

-- 1. Create function to calculate and apply pending upkeep
CREATE OR REPLACE FUNCTION apply_pending_upkeep(player_id_input UUID)
RETURNS JSONB AS $$
DECLARE
    player_rec RECORD;
    hourly_upkeep BIGINT;
    hours_missed INTEGER;
    total_owed BIGINT;
    total_deducted BIGINT := 0;
    crew_lost INTEGER := 0;
BEGIN
    -- Get player's last upkeep time and current cash
    SELECT 
        p.id, p.cash, p.last_upkeep_at,
        COALESCE(SUM(cd.upkeep_per_hour * pc.quantity), 0)::BIGINT as hourly_upkeep
    INTO player_rec
    FROM players p
    LEFT JOIN player_crew pc ON pc.player_id = p.id
    LEFT JOIN crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = player_id_input
    GROUP BY p.id, p.cash, p.last_upkeep_at;

    IF player_rec IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    hourly_upkeep := player_rec.hourly_upkeep;
    
    -- No crew = no upkeep needed
    IF hourly_upkeep = 0 THEN
        RETURN jsonb_build_object(
            'success', true, 
            'hours_processed', 0,
            'total_deducted', 0,
            'crew_lost', 0
        );
    END IF;

    -- Calculate hours since last upkeep (max 24 hours to prevent punishing long-absent players too harshly)
    hours_missed := LEAST(24, FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(player_rec.last_upkeep_at, NOW()))) / 3600));
    
    IF hours_missed <= 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'hours_processed', 0,
            'total_deducted', 0,
            'crew_lost', 0
        );
    END IF;

    total_owed := hourly_upkeep * hours_missed;

    -- Can afford full upkeep
    IF player_rec.cash >= total_owed THEN
        UPDATE players 
        SET cash = cash - total_owed,
            last_upkeep_at = NOW()
        WHERE id = player_id_input;
        
        total_deducted := total_owed;
        
        -- Log transaction
        INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'crew_upkeep', 'cash', -total_owed, 
                'Lazy upkeep: ' || hours_missed || ' hours');
    ELSE
        -- Can't afford - pay what they can, then crew starts leaving
        -- For simplicity in lazy calc: deduct what they have, mark 1 crew loss per unpaid hour
        total_deducted := player_rec.cash;
        crew_lost := GREATEST(1, hours_missed - FLOOR(player_rec.cash::NUMERIC / hourly_upkeep::NUMERIC));
        
        UPDATE players 
        SET cash = 0,
            last_upkeep_at = NOW()
        WHERE id = player_id_input;
        
        -- Remove crew members (simplified: reduce random crew by crew_lost)
        UPDATE player_crew 
        SET quantity = GREATEST(0, quantity - crew_lost)
        WHERE player_id = player_id_input
        AND id = (
            SELECT pc.id FROM player_crew pc 
            WHERE pc.player_id = player_id_input AND pc.quantity > 0
            ORDER BY random() LIMIT 1
        );
        
        -- Log transaction
        INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'crew_upkeep', 'cash', -total_deducted, 
                'Lazy upkeep: ' || hours_missed || ' hours (partial, crew left)');
                
        -- Notify player
        INSERT INTO notifications (player_id, type, title, description)
        VALUES (player_id_input, 'system', 'Crew Left!', 
                'You couldn''t afford upkeep. Some crew members have left.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'hours_processed', hours_missed,
        'total_deducted', total_deducted,
        'crew_lost', crew_lost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create wrapper for frontend use
CREATE OR REPLACE FUNCTION check_and_apply_upkeep(player_id_input UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN apply_pending_upkeep(player_id_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### [MODIFY] [src/hooks/useGameStore.ts](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/src/hooks/useGameStore.ts)
Add upkeep check to `loadAllData()` or `loadPlayerData()`:

```typescript
// In loadAllData or init sequence
const checkUpkeep = async () => {
  const { data, error } = await supabase
    .rpc('check_and_apply_upkeep', { player_id_input: playerId });
  
  if (data?.total_deducted > 0) {
    toast.info(`Crew upkeep: -$${data.total_deducted.toLocaleString()}`);
  }
  if (data?.crew_lost > 0) {
    toast.warning(`${data.crew_lost} crew member(s) left due to unpaid upkeep!`);
  }
};
```

### Affects Player Balance?
**Yes** - This is an economy **safety mechanism**. Without it, businesses can generate infinite cash if pg_cron fails.

### Risks & Dependencies
- **Medium risk** - Touches core economy loop
- Must be tested thoroughly to ensure:
  - First-time players aren't penalized with old upkeep
  - 24-hour cap prevents punishing month-long absences
  - Crew loss logic is fair

---

## 3. Insurance System Implementation

### Current State
- `protection_expires_at` column exists on `players` table
- Shield/VIP boosters provide temporary attack immunity
- **No formal "Insurance" system** for item/crew loss protection exists

### What Must Change

> [!IMPORTANT]
> This section requires clarification. The audit mentions "Insurance" but the current protection system uses boosters. 
> 
> **Option A**: Insurance = existing Shield booster (already implemented)  
> **Option B**: Insurance = new system protecting items/crew from loss on PvP defeat
> 
> Please confirm which interpretation applies before implementation.

#### If Option B is Required: [NEW] `supabase/migrations/112_insurance_system.sql`

```sql
-- 1. Add insurance columns to players
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS insurance_type TEXT CHECK (insurance_type IN ('basic', 'premium', NULL)),
ADD COLUMN IF NOT EXISTS insurance_expires_at TIMESTAMPTZ;

-- 2. Create insurance definitions
CREATE TABLE IF NOT EXISTS public.insurance_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insurance_type TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    protects_crew BOOLEAN DEFAULT false,
    protects_items BOOLEAN DEFAULT false,
    protects_cash_percent INTEGER DEFAULT 0, -- % of cash protected from theft
    diamond_cost INTEGER NOT NULL,
    duration_hours INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.insurance_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read insurance definitions" ON public.insurance_definitions FOR SELECT USING (true);

-- Seed insurance types
INSERT INTO public.insurance_definitions (insurance_type, name, description, protects_crew, protects_items, protects_cash_percent, diamond_cost, duration_hours)
VALUES
    ('basic', 'Basic Insurance', 'Protects 25% of pocket cash from theft', false, false, 25, 25, 24),
    ('premium', 'Premium Insurance', 'Protects crew and items from PvP loss, 50% cash protection', true, true, 50, 100, 24)
ON CONFLICT (insurance_type) DO NOTHING;

-- 3. Purchase insurance RPC
CREATE OR REPLACE FUNCTION purchase_insurance(
    player_id_input UUID,
    insurance_type_input TEXT
)
RETURNS JSONB AS $$
DECLARE
    ins_def RECORD;
    current_diamonds INTEGER;
BEGIN
    SELECT * INTO ins_def FROM insurance_definitions WHERE insurance_type = insurance_type_input;
    IF ins_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid insurance type');
    END IF;
    
    SELECT diamonds INTO current_diamonds FROM players WHERE id = player_id_input;
    IF current_diamonds < ins_def.diamond_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds');
    END IF;
    
    -- Deduct diamonds
    UPDATE players 
    SET diamonds = diamonds - ins_def.diamond_cost,
        insurance_type = insurance_type_input,
        insurance_expires_at = NOW() + (ins_def.duration_hours || ' hours')::INTERVAL,
        updated_at = NOW()
    WHERE id = player_id_input;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'insurance_purchase', 'diamonds', -ins_def.diamond_cost, ins_def.name);
    
    RETURN jsonb_build_object('success', true, 'message', ins_def.name || ' activated!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### [MODIFY] PvP Attack Logic
The `perform_pvp_attack` RPC would need to check `insurance_type` and `insurance_expires_at` before applying crew/item losses.

### Affects Player Balance?
**Yes** - Insurance provides damage mitigation, needs diamond cost tuning.

### Risks & Dependencies
- Low risk if additive
- Requires modification to PvP loss calculations (higher complexity)

---

## 4. Documentation Updates

### Current State
- [AI_RULES.md](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/AI_RULES.md) describes tech stack but not game mechanics
- [Codebase_Audit.md](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/Game/Codebase_Audit.md) and [Plan.md](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/Game/Plan.md) exist but are incomplete
- No RPC documentation catalog

### What Must Change

#### [MODIFY] [Game/Codebase_Audit.md](file:///c:/Users/enrom/dyad-apps/Mafia_Ton/Game/Codebase_Audit.md)
Add section clarifying intentional behaviors:
- Inverted production (if applicable - please clarify)
- Upkeep enforcement mechanism
- Currency definitions (Cash, Diamonds, Stars)

#### [NEW] `Game/RPC_Catalog.md`
Document all public RPCs with:
- Function signature
- Parameters
- Return type
- Purpose
- Example usage

### Affects Player Balance?
**No** - Documentation only.

---

## Verification Plan

### Database Migration Testing
1. Apply migrations to local/staging Supabase instance
2. Verify new columns exist: `stars`, `insurance_type`, `insurance_expires_at`
3. Verify constraint updates: `transactions_currency_check` accepts 'stars'
4. Test `apply_pending_upkeep()` with:
   - Player with 0 crew (should return 0 deducted)
   - Player with crew and old `last_upkeep_at` (should deduct)
   - Player who can't afford upkeep (should lose crew)

### Frontend Integration Testing
1. Load game → verify lazy upkeep toast appears if hours_missed > 0
2. Verify Stars display on homepage (once sources are added)
3. Verify insurance purchase flow (if Option B is implemented)

### Manual Verification
- Set `last_upkeep_at` to 5 hours ago in Supabase dashboard
- Reload app
- Confirm cash decreases by ~5 × hourly_cost
- Confirm `last_upkeep_at` resets to NOW()

---

## User Review Required

> [!WARNING]
> **Stars Currency Sources/Sinks**: The schema is ready, but Stars needs defined sources (how players earn them) and sinks (what they can buy). This is **out of scope** per the task but required for the currency to be useful.

> [!CAUTION]  
> **Insurance Clarification Needed**: Please confirm whether "Insurance" refers to:
> - A) Existing Shield/VIP booster system (already implemented)
> - B) New system protecting items/crew from PvP loss (requires new implementation)

> [!IMPORTANT]
> **Inverted Production**: The task mentions documenting "inverted production" as intentional. Please clarify what this refers to so it can be documented correctly.

---

## Summary of New Files

| File | Type | Purpose |
|------|------|---------|
| `110_stars_currency.sql` | Migration | Stars column + RPCs |
| `111_lazy_upkeep_enforcement.sql` | Migration | Guaranteed upkeep processing |
| `112_insurance_system.sql` | Migration | Insurance schema + RPCs (if Option B) |
| `Game/RPC_Catalog.md` | Documentation | RPC reference |
