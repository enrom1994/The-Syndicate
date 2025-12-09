-- =====================================================
-- ECONOMY V2 FOUNDATION
-- =====================================================
-- Adds crew-based equipment slots and theft system foundation
-- Part 1: Schema changes and survival_chance column

-- =====================================================
-- 1. ADD SURVIVAL_CHANCE TO CREW DEFINITIONS
-- =====================================================
ALTER TABLE public.crew_definitions 
ADD COLUMN IF NOT EXISTS survival_chance INTEGER DEFAULT 70;

-- Update existing crew types with appropriate survival chances
-- Higher survival = tankier, lower = glass cannon
UPDATE public.crew_definitions SET survival_chance = 60 WHERE type = 'Enforcer'; -- Glass cannon
UPDATE public.crew_definitions SET survival_chance = 80 WHERE type = 'Bodyguard'; -- Tanky
UPDATE public.crew_definitions SET survival_chance = 50 WHERE type = 'Hitman'; -- Glass cannon
UPDATE public.crew_definitions SET survival_chance = 65 WHERE type = 'Driver'; -- Medium
UPDATE public.crew_definitions SET survival_chance = 75 WHERE type = 'Accountant'; -- Protected


-- =====================================================
-- 2. ADD LOCATION COLUMN TO PLAYER_INVENTORY
-- =====================================================
-- location: 'inventory' (default), 'equipped', 'safe'
ALTER TABLE public.player_inventory 
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'inventory';

-- Add constraint for valid locations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'player_inventory_location_check'
    ) THEN
        ALTER TABLE public.player_inventory 
        ADD CONSTRAINT player_inventory_location_check 
        CHECK (location IN ('inventory', 'equipped', 'safe'));
    END IF;
END $$;

-- Add column for safe cooldown (10 min delay when moving to safe)
ALTER TABLE public.player_inventory 
ADD COLUMN IF NOT EXISTS safe_until TIMESTAMPTZ;

-- Migrate existing equipped items to have location = 'equipped'
UPDATE public.player_inventory SET location = 'equipped' WHERE is_equipped = true;


-- =====================================================
-- 3. CREATE ATTACK COOLDOWNS TABLE
-- =====================================================
-- Prevents attacking same player for 24 hours
CREATE TABLE IF NOT EXISTS public.attack_cooldowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attacker_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    defender_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    attacked_at TIMESTAMPTZ DEFAULT NOW(),
    cooldown_until TIMESTAMPTZ NOT NULL,
    UNIQUE(attacker_id, defender_id)
);

-- Add indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_attack_cooldowns_attacker ON public.attack_cooldowns(attacker_id);
CREATE INDEX IF NOT EXISTS idx_attack_cooldowns_defender ON public.attack_cooldowns(defender_id);
CREATE INDEX IF NOT EXISTS idx_attack_cooldowns_until ON public.attack_cooldowns(cooldown_until);

-- RLS policies
ALTER TABLE public.attack_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own attack cooldowns"
    ON public.attack_cooldowns FOR SELECT
    USING (auth.uid() = attacker_id);


-- =====================================================
-- 4. CREATE PLAYER SAFE SLOTS TABLE
-- =====================================================
-- Premium safe storage slots (purchased with TON)
CREATE TABLE IF NOT EXISTS public.player_safe_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE UNIQUE,
    total_slots INTEGER DEFAULT 0,
    package TEXT, -- 'bronze', 'silver', 'gold', 'platinum'
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.player_safe_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own safe slots"
    ON public.player_safe_slots FOR SELECT
    USING (auth.uid() = player_id);


-- =====================================================
-- 5. SAFE PACKAGES DEFINITION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.safe_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slots INTEGER NOT NULL,
    price_ton NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Seed safe packages
INSERT INTO public.safe_packages (id, name, slots, price_ton)
VALUES 
    ('bronze', 'Bronze Vault', 3, 0.5),
    ('silver', 'Silver Vault', 7, 1.5),
    ('gold', 'Gold Vault', 15, 4.0),
    ('platinum', 'Platinum Vault', 30, 10.0)
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- 6. CHECK ATTACK COOLDOWN RPC
-- =====================================================
CREATE OR REPLACE FUNCTION check_attack_cooldown(
    attacker_id_input UUID,
    defender_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    cooldown_record RECORD;
    remaining_seconds INTEGER;
BEGIN
    -- Find existing cooldown
    SELECT * INTO cooldown_record
    FROM public.attack_cooldowns
    WHERE attacker_id = attacker_id_input 
    AND defender_id = defender_id_input
    AND cooldown_until > NOW();
    
    IF cooldown_record IS NOT NULL THEN
        remaining_seconds := EXTRACT(EPOCH FROM (cooldown_record.cooldown_until - NOW()))::INTEGER;
        RETURN jsonb_build_object(
            'can_attack', false,
            'cooldown_until', cooldown_record.cooldown_until,
            'remaining_seconds', remaining_seconds,
            'remaining_hours', ROUND(remaining_seconds / 3600.0, 1)
        );
    END IF;
    
    RETURN jsonb_build_object('can_attack', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 7. GET PLAYER COMBAT STATS RPC (includes crew + equipment)
-- =====================================================
CREATE OR REPLACE FUNCTION get_player_combat_stats(
    player_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    base_stats RECORD;
    crew_attack INTEGER;
    crew_defense INTEGER;
    equipped_attack INTEGER;
    equipped_defense INTEGER;
    total_crew INTEGER;
BEGIN
    -- Get base player stats
    SELECT level, respect INTO base_stats
    FROM public.players WHERE id = player_id_input;
    
    IF base_stats IS NULL THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;
    
    -- Get crew bonuses
    SELECT 
        COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER,
        COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER,
        COALESCE(SUM(pc.quantity), 0)::INTEGER
    INTO crew_attack, crew_defense, total_crew
    FROM public.player_crew pc
    JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE pc.player_id = player_id_input;
    
    -- Get equipped item bonuses
    SELECT 
        COALESCE(SUM(id.attack_bonus * pi.quantity), 0)::INTEGER,
        COALESCE(SUM(id.defense_bonus * pi.quantity), 0)::INTEGER
    INTO equipped_attack, equipped_defense
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON id.id = pi.item_id
    WHERE pi.player_id = player_id_input 
    AND pi.is_equipped = true;
    
    RETURN jsonb_build_object(
        'level', base_stats.level,
        'respect', base_stats.respect,
        'crew_attack', crew_attack,
        'crew_defense', crew_defense,
        'equipped_attack', equipped_attack,
        'equipped_defense', equipped_defense,
        'total_attack', (base_stats.level * 10) + crew_attack + equipped_attack,
        'total_defense', (base_stats.level * 10) + crew_defense + equipped_defense,
        'total_crew', total_crew
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 8. GET SAFE ITEMS COUNT RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_safe_info(
    player_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    safe_slots INTEGER;
    items_in_safe INTEGER;
BEGIN
    -- Get total safe slots
    SELECT COALESCE(total_slots, 0) INTO safe_slots
    FROM public.player_safe_slots
    WHERE player_id = player_id_input;
    
    IF safe_slots IS NULL THEN
        safe_slots := 0;
    END IF;
    
    -- Count items in safe
    SELECT COUNT(*) INTO items_in_safe
    FROM public.player_inventory
    WHERE player_id = player_id_input AND location = 'safe';
    
    RETURN jsonb_build_object(
        'total_slots', safe_slots,
        'used_slots', items_in_safe,
        'available_slots', GREATEST(0, safe_slots - items_in_safe)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
