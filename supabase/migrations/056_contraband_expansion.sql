-- =====================================================
-- CONTRABAND EXPANSION: PVP CONSUMABLES + NEW RECIPES
-- =====================================================
-- Adds combat supplies for PvP, new contraband types, and
-- production recipes for all businesses.

-- =====================================================
-- 0. UPDATE CATEGORY CONSTRAINT TO ALLOW CONSUMABLES
-- =====================================================
ALTER TABLE public.item_definitions DROP CONSTRAINT IF EXISTS item_definitions_category_check;
ALTER TABLE public.item_definitions ADD CONSTRAINT item_definitions_category_check 
    CHECK (category IN ('weapon', 'equipment', 'contraband', 'consumable'));

-- =====================================================
-- 1. ADD NEW ITEM DEFINITIONS
-- =====================================================

-- PvP Combat Supplies (production-only, not purchasable)
INSERT INTO public.item_definitions (name, description, category, rarity, buy_price, sell_price, attack_bonus, defense_bonus, icon)
VALUES 
    ('Bootleg Whiskey', 'Liquid courage for your crew. Required for Safe Heist attacks.', 'consumable', 'common', 0, 500, 0, 0, '/images/icons/bootlegwhiskey.png'),
    ('Cocaine Stash', 'High-octane fuel for Drive-By attacks.', 'consumable', 'uncommon', 0, 1000, 0, 0, '/images/icons/cocainestash.png')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    sell_price = EXCLUDED.sell_price,
    icon = EXCLUDED.icon;

-- New Trade Goods
INSERT INTO public.item_definitions (name, description, category, rarity, buy_price, sell_price, attack_bonus, defense_bonus, icon)
VALUES 
    ('Forged Documents', 'Fake passports, IDs, and papers. Always in demand.', 'contraband', 'uncommon', 0, 3000, 0, 0, '/images/icons/forgeddocuments.png'),
    ('Smuggled Weapons', 'Untraceable firearms and explosives.', 'contraband', 'rare', 0, 6000, 0, 0, '/images/icons/smuggledweapons.png')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    sell_price = EXCLUDED.sell_price,
    icon = EXCLUDED.icon;

-- Update existing contraband sell prices for balance
UPDATE public.item_definitions SET sell_price = 1000, category = 'contraband' WHERE name = 'Whiskey Crate';
UPDATE public.item_definitions SET sell_price = 800, category = 'contraband' WHERE name = 'Cuban Cigars';
UPDATE public.item_definitions SET sell_price = 5000, category = 'contraband' WHERE name = 'Counterfeit Bills';
UPDATE public.item_definitions SET sell_price = 8000, category = 'contraband' WHERE name = 'Stolen Jewelry';
UPDATE public.item_definitions SET sell_price = 12000, category = 'contraband' WHERE name = 'Morphine Vials';


-- =====================================================
-- 2. ADD CONSUMABLE REQUIREMENTS TO PVP ATTACK TYPES
-- =====================================================

-- Add columns for consumable requirements
ALTER TABLE public.pvp_attack_types 
ADD COLUMN IF NOT EXISTS consumable_item_name TEXT DEFAULT NULL;

ALTER TABLE public.pvp_attack_types 
ADD COLUMN IF NOT EXISTS consumable_qty INTEGER DEFAULT 0;

-- Set consumable requirements for existing attacks
UPDATE public.pvp_attack_types 
SET consumable_item_name = 'Bootleg Whiskey', consumable_qty = 1
WHERE id = 'safe_heist';

UPDATE public.pvp_attack_types 
SET consumable_item_name = 'Cocaine Stash', consumable_qty = 2
WHERE id = 'drive_by';


-- =====================================================
-- 3. ADD NEW PRODUCTION RECIPES
-- =====================================================
-- Each business produces something useful

-- Protection Racket produces Bootleg Whiskey using Street Thugs
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    5,   -- 5 street thugs
    id.id,
    10,  -- 10 bottles
    12   -- 12 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Protection Racket'
  AND cd.name = 'Street Thug'
  AND id.name = 'Bootleg Whiskey'
ON CONFLICT DO NOTHING;

-- Nightclub produces Cocaine Stash using Bodyguards
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    6,   -- 6 bodyguards
    id.id,
    8,   -- 8 stashes
    12   -- 12 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Nightclub'
  AND cd.name = 'Bodyguard'
  AND id.name = 'Cocaine Stash'
ON CONFLICT DO NOTHING;

-- Casino produces Stolen Jewelry using Professional Hitmen
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    3,   -- 3 hitmen
    id.id,
    5,   -- 5 jewelry pieces
    18   -- 18 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Casino'
  AND cd.name = 'Professional Hitman'
  AND id.name = 'Stolen Jewelry'
ON CONFLICT DO NOTHING;

-- Loan Sharking produces Counterfeit Bills using mixed crew
-- First recipe: Crooked Accountant portion
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    3,   -- 3 accountants
    id.id,
    15,  -- 15 bill bundles
    16   -- 16 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Loan Sharking'
  AND cd.name = 'Crooked Accountant'
  AND id.name = 'Counterfeit Bills'
ON CONFLICT DO NOTHING;

-- Smuggling Route produces Forged Documents using Getaway Drivers
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    4,   -- 4 drivers
    id.id,
    12,  -- 12 document sets
    14   -- 14 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Smuggling Route'
  AND cd.name = 'Getaway Driver'
  AND id.name = 'Forged Documents'
ON CONFLICT DO NOTHING;

-- Black Market produces Morphine Vials using Professional Hitmen
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    2,   -- 2 hitmen
    id.id,
    3,   -- 3 vials
    24   -- 24 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Black Market'
  AND cd.name = 'Professional Hitman'
  AND id.name = 'Morphine Vials'
ON CONFLICT DO NOTHING;

-- Black Market also produces Smuggled Weapons using Enforcers
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    1,   -- 1 enforcer captain
    id.id,
    4,   -- 4 weapon caches
    20   -- 20 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Black Market'
  AND cd.name = 'Enforcer Captain'
  AND id.name = 'Smuggled Weapons'
ON CONFLICT DO NOTHING;


-- =====================================================
-- 4. UPDATE PVP ATTACK TO ENFORCE CONSUMABLES
-- =====================================================

CREATE OR REPLACE FUNCTION perform_pvp_attack(
    attacker_id_input UUID,
    defender_id_input UUID,
    attack_type_input TEXT
)
RETURNS JSONB AS $$
DECLARE
    attack_type RECORD;
    attacker RECORD;
    defender RECORD;
    attacker_strength INTEGER;
    defender_strength INTEGER;
    strength_ratio FLOAT;
    
    -- Consumable check
    consumable_item RECORD;
    player_consumable_qty INTEGER;
    
    -- Booster checks
    has_attack_boost BOOLEAN := false;
    has_shield BOOLEAN := false;
    
    win_chance INTEGER;
    roll INTEGER;
    attacker_wins BOOLEAN;
    
    -- Losses/gains
    cash_stolen BIGINT := 0;
    vault_stolen BIGINT := 0;
    contraband_stolen INTEGER := 0;
    respect_stolen INTEGER := 0;
    crew_killed INTEGER := 0;
    
    -- Attacker losses on defeat
    attacker_consumable_loss INTEGER := 0;
    attacker_crew_loss INTEGER := 0;
    attacker_respect_loss INTEGER := 0;
    
    random_item_id UUID;
    random_qty INTEGER;
BEGIN
    -- Get attack type
    SELECT * INTO attack_type FROM public.pvp_attack_types WHERE id = attack_type_input AND is_active = true;
    IF attack_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid attack type');
    END IF;

    -- Can't attack self
    IF attacker_id_input = defender_id_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot attack yourself');
    END IF;

    -- Get attacker with crew stats and items
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER as crew_defense,
           COALESCE(SUM(pc.quantity), 0)::INTEGER as total_crew,
           COALESCE((SELECT SUM(id.attack_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_attack,
           COALESCE((SELECT SUM(id.defense_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_defense
    INTO attacker
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = attacker_id_input
    GROUP BY p.id;

    -- Get defender with crew stats and items
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER as crew_defense,
           COALESCE(SUM(pc.quantity), 0)::INTEGER as total_crew,
           COALESCE((SELECT SUM(id.attack_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_attack,
           COALESCE((SELECT SUM(id.defense_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_defense
    INTO defender
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = defender_id_input
    GROUP BY p.id;

    IF attacker IS NULL OR defender IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    -- Check stamina
    IF attacker.stamina < attack_type.stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;

    -- Check crew requirement
    IF attack_type.requires_crew AND attacker.total_crew = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'This attack requires crew members');
    END IF;

    -- =====================================================
    -- CHECK CONSUMABLE REQUIREMENT (NEW!)
    -- =====================================================
    IF attack_type.requires_consumables AND attack_type.consumable_item_name IS NOT NULL THEN
        -- Get consumable item
        SELECT * INTO consumable_item FROM public.item_definitions WHERE name = attack_type.consumable_item_name;
        
        IF consumable_item IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Consumable item not found: ' || attack_type.consumable_item_name);
        END IF;
        
        -- Check player has enough
        SELECT COALESCE(quantity, 0) INTO player_consumable_qty
        FROM public.player_inventory
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id;
        
        IF player_consumable_qty < attack_type.consumable_qty THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Need ' || attack_type.consumable_qty || 'x ' || attack_type.consumable_item_name || ' (have ' || COALESCE(player_consumable_qty, 0) || ')'
            );
        END IF;
        
        -- Deduct consumables
        UPDATE public.player_inventory 
        SET quantity = quantity - attack_type.consumable_qty
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id;
        
        -- Clean up zero quantities
        DELETE FROM public.player_inventory 
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id AND quantity <= 0;
    END IF;

    -- Check for boosters
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = attacker_id_input 
        AND booster_type = '2x_attack' 
        AND expires_at > NOW()
    ) INTO has_attack_boost;
    
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = defender_id_input 
        AND booster_type = 'shield' 
        AND expires_at > NOW()
    ) INTO has_shield;

    -- Calculate strengths (include item bonuses)
    attacker_strength := (attacker.level * 10) + attacker.crew_attack + attacker.item_attack + (attacker.respect / 10);
    defender_strength := (defender.level * 10) + defender.crew_defense + defender.item_defense + (defender.respect / 10);
    
    -- Apply boosters
    IF has_attack_boost THEN
        attacker_strength := attacker_strength * 2;
    END IF;
    
    IF has_shield THEN
        defender_strength := defender_strength * 2;
    END IF;

    -- Minimum strength to prevent division by zero
    IF defender_strength < 1 THEN defender_strength := 1; END IF;

    -- Calculate win chance based on strength ratio
    strength_ratio := attacker_strength::FLOAT / defender_strength::FLOAT;
    
    IF strength_ratio >= 2.0 THEN
        win_chance := 85;
    ELSIF strength_ratio >= 1.5 THEN
        win_chance := 70;
    ELSIF strength_ratio >= 1.0 THEN
        win_chance := 55;
    ELSIF strength_ratio >= 0.75 THEN
        win_chance := 40;
    ELSIF strength_ratio >= 0.5 THEN
        win_chance := 25;
    ELSE
        win_chance := 15;
    END IF;

    -- Deduct stamina
    UPDATE public.players SET stamina = stamina - attack_type.stamina_cost WHERE id = attacker_id_input;

    -- Roll for victory
    roll := floor(random() * 100) + 1;
    attacker_wins := roll <= win_chance;

    -- =====================================================
    -- ATTACKER WINS
    -- =====================================================
    IF attacker_wins THEN
        IF attack_type.steals_cash THEN
            cash_stolen := LEAST(
                (defender.cash * attack_type.cash_steal_percent / 100)::BIGINT,
                (defender.cash * 0.45)::BIGINT
            );
        END IF;

        IF attack_type.steals_vault THEN
            vault_stolen := LEAST(
                (defender.bank * attack_type.vault_steal_percent / 100)::BIGINT,
                (defender.bank * 0.15)::BIGINT
            );
        END IF;

        IF attack_type.steals_respect THEN
            respect_stolen := LEAST((defender.respect * 0.10)::INTEGER, 100);
        END IF;

        IF attack_type.kills_crew THEN
            crew_killed := LEAST(defender.total_crew / 4, 5);
        END IF;

        -- Apply gains/losses
        UPDATE public.players SET 
            cash = cash + cash_stolen + vault_stolen,
            respect = respect + respect_stolen + 5
        WHERE id = attacker_id_input;

        UPDATE public.players SET 
            cash = GREATEST(0, cash - cash_stolen),
            bank = GREATEST(0, bank - vault_stolen),
            respect = GREATEST(0, respect - respect_stolen - 3)
        WHERE id = defender_id_input;

        -- Kill defender crew
        IF crew_killed > 0 THEN
            WITH random_crew AS (
                SELECT id FROM public.player_crew 
                WHERE player_id = defender_id_input AND quantity > 0
                ORDER BY random() LIMIT 1
            )
            UPDATE public.player_crew pc
            SET quantity = GREATEST(0, quantity - crew_killed)
            FROM random_crew rc
            WHERE pc.id = rc.id;
        END IF;

        -- Steal contraband
        IF attack_type.steals_contraband THEN
            SELECT pi.item_id, LEAST(pi.quantity, 2) INTO random_item_id, random_qty
            FROM public.player_inventory pi
            JOIN public.item_definitions id ON pi.item_id = id.id
            WHERE pi.player_id = defender_id_input AND id.category = 'contraband' AND pi.quantity > 0
            ORDER BY random() LIMIT 1;

            IF random_item_id IS NOT NULL THEN
                contraband_stolen := random_qty;
                
                UPDATE public.player_inventory SET quantity = quantity - random_qty 
                WHERE player_id = defender_id_input AND item_id = random_item_id;
                
                INSERT INTO public.player_inventory (player_id, item_id, quantity)
                VALUES (attacker_id_input, random_item_id, random_qty)
                ON CONFLICT (player_id, item_id)
                DO UPDATE SET quantity = player_inventory.quantity + random_qty;
            END IF;
        END IF;

    -- =====================================================
    -- ATTACKER LOSES
    -- =====================================================
    ELSE
        IF strength_ratio < 0.5 THEN
            attacker_respect_loss := 10;
        ELSIF strength_ratio < 1.0 THEN
            attacker_respect_loss := 5;
        ELSE
            attacker_respect_loss := 2;
        END IF;

        IF attack_type.requires_crew AND attacker.total_crew > 0 THEN
            attacker_crew_loss := LEAST(2, attacker.total_crew / 5);
            
            WITH random_crew AS (
                SELECT id FROM public.player_crew 
                WHERE player_id = attacker_id_input AND quantity > 0
                ORDER BY random() LIMIT 1
            )
            UPDATE public.player_crew pc
            SET quantity = GREATEST(0, quantity - attacker_crew_loss)
            FROM random_crew rc
            WHERE pc.id = rc.id;
        END IF;

        UPDATE public.players SET respect = GREATEST(0, respect - attacker_respect_loss) WHERE id = attacker_id_input;
        UPDATE public.players SET respect = respect + 3 WHERE id = defender_id_input;
    END IF;

    -- Log the attack
    INSERT INTO public.attack_log (attacker_id, defender_id, attack_type, attacker_won, cash_stolen, respect_change)
    VALUES (
        attacker_id_input, 
        defender_id_input, 
        attack_type_input,
        attacker_wins, 
        COALESCE(cash_stolen + vault_stolen, 0)::INTEGER,
        CASE WHEN attacker_wins THEN respect_stolen + 5 ELSE -attacker_respect_loss END
    );

    -- Notifications
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES 
        (attacker_id_input, 'attack', 
         CASE WHEN attacker_wins THEN 'Attack Successful!' ELSE 'Attack Failed!' END,
         CASE WHEN attacker_wins 
            THEN 'Hit ' || defender.username || ' with ' || attack_type.name || '. Stole $' || (cash_stolen + vault_stolen)
            ELSE 'Failed ' || attack_type.name || ' on ' || defender.username || '. Lost ' || attacker_respect_loss || ' respect'
         END),
        (defender_id_input, 'attack',
         CASE WHEN attacker_wins THEN 'You Were Attacked!' ELSE 'Attack Defended!' END,
         CASE WHEN attacker_wins 
            THEN attacker.username || ' hit you with ' || attack_type.name || '. Lost $' || (cash_stolen + vault_stolen)
            ELSE 'Successfully defended against ' || attacker.username || '''s ' || attack_type.name
         END);

    RETURN jsonb_build_object(
        'success', true,
        'result', CASE WHEN attacker_wins THEN 'victory' ELSE 'defeat' END,
        'attack_type', attack_type.name,
        'defender_name', defender.username,
        'win_chance', win_chance,
        'roll', roll,
        'cash_stolen', cash_stolen + vault_stolen,
        'respect_stolen', respect_stolen,
        'contraband_stolen', contraband_stolen,
        'crew_killed', crew_killed,
        'attacker_crew_loss', attacker_crew_loss,
        'attacker_respect_loss', attacker_respect_loss,
        'consumable_used', attack_type.consumable_item_name,
        'consumable_qty_used', attack_type.consumable_qty,
        'had_attack_boost', has_attack_boost,
        'defender_had_shield', has_shield
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 5. UPDATE GET_PVP_ATTACK_TYPES TO INCLUDE CONSUMABLES
-- =====================================================

CREATE OR REPLACE FUNCTION get_pvp_attack_types()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    description TEXT,
    stamina_cost INTEGER,
    requires_crew BOOLEAN,
    requires_consumables BOOLEAN,
    consumable_item_name TEXT,
    consumable_qty INTEGER,
    steals_cash BOOLEAN,
    steals_vault BOOLEAN,
    steals_contraband BOOLEAN,
    steals_respect BOOLEAN,
    kills_crew BOOLEAN,
    cash_steal_percent INTEGER,
    vault_steal_percent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.name, t.description, t.stamina_cost, 
        t.requires_crew, t.requires_consumables,
        t.consumable_item_name, t.consumable_qty,
        t.steals_cash, t.steals_vault, t.steals_contraband, 
        t.steals_respect, t.kills_crew,
        t.cash_steal_percent, t.vault_steal_percent
    FROM public.pvp_attack_types t
    WHERE t.is_active = true
    ORDER BY t.stamina_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Add comments
COMMENT ON COLUMN public.pvp_attack_types.consumable_item_name IS 'Name of item required to perform this attack (from item_definitions)';
COMMENT ON COLUMN public.pvp_attack_types.consumable_qty IS 'Quantity of consumable required per attack';
