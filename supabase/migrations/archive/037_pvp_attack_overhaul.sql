-- =====================================================
-- PVP ATTACK SYSTEM OVERHAUL
-- =====================================================
-- Multiple attack types with item loss mechanics
-- Max 45% loss cap, consumables used by both sides

-- =====================================================
-- PVP ATTACK TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pvp_attack_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    stamina_cost INTEGER NOT NULL DEFAULT 10,
    requires_crew BOOLEAN DEFAULT false,
    requires_consumables BOOLEAN DEFAULT false,
    
    -- What is at stake
    steals_cash BOOLEAN DEFAULT false,
    steals_vault BOOLEAN DEFAULT false,
    steals_contraband BOOLEAN DEFAULT false,
    steals_respect BOOLEAN DEFAULT false,
    kills_crew BOOLEAN DEFAULT false,
    
    -- Steal percentages
    cash_steal_percent INTEGER DEFAULT 0,  -- % of pocket cash
    vault_steal_percent INTEGER DEFAULT 0, -- % of vault (max 15 for safe heist)
    
    is_active BOOLEAN DEFAULT true
);

-- Seed attack types
INSERT INTO public.pvp_attack_types (id, name, description, stamina_cost, requires_crew, requires_consumables, steals_cash, steals_vault, steals_contraband, steals_respect, kills_crew, cash_steal_percent, vault_steal_percent)
VALUES 
    ('mugging', 'Mugging', 'Quick hit for pocket cash', 5, false, false, true, false, false, false, false, 20, 0),
    ('business_raid', 'Business Raid', 'Raid their income stream', 10, true, false, true, false, true, false, false, 30, 0),
    ('safe_heist', 'Safe Heist', 'Break into their vault', 15, true, true, false, true, true, false, false, 0, 15),
    ('drive_by', 'Drive-By', 'Violent strike for respect', 12, false, true, false, false, false, true, true, 0, 0)
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- ENHANCED PERFORM ATTACK RPC
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
    
    win_chance INTEGER;
    roll INTEGER;
    attacker_wins BOOLEAN;
    
    -- Losses/gains
    loss_multiplier FLOAT := 0.45; -- 45% max cap
    cash_stolen BIGINT := 0;
    vault_stolen BIGINT := 0;
    contraband_stolen INTEGER := 0;
    respect_stolen INTEGER := 0;
    crew_killed INTEGER := 0;
    
    -- Attacker losses on defeat
    attacker_consumable_loss INTEGER := 0;
    attacker_crew_loss INTEGER := 0;
    attacker_respect_loss INTEGER := 0;
    
    -- Defender losses on defeat
    defender_consumable_loss INTEGER := 0;
    
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

    -- Get attacker with crew stats
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER as crew_defense,
           COALESCE(SUM(pc.quantity), 0)::INTEGER as total_crew
    INTO attacker
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = attacker_id_input
    GROUP BY p.id;

    -- Get defender with crew stats
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER as crew_defense,
           COALESCE(SUM(pc.quantity), 0)::INTEGER as total_crew
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

    -- Calculate strengths
    attacker_strength := (attacker.level * 10) + attacker.crew_attack + (attacker.respect / 10);
    defender_strength := (defender.level * 10) + defender.crew_defense + (defender.respect / 10);

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
        -- Calculate what attacker steals (capped at 45%)
        
        IF attack_type.steals_cash THEN
            cash_stolen := LEAST(
                (defender.cash * attack_type.cash_steal_percent / 100)::BIGINT,
                (defender.cash * 0.45)::BIGINT
            );
        END IF;

        IF attack_type.steals_vault THEN
            vault_stolen := LEAST(
                (defender.bank * attack_type.vault_steal_percent / 100)::BIGINT,
                (defender.bank * 0.15)::BIGINT  -- Safe heist capped at 15%
            );
        END IF;

        IF attack_type.steals_respect THEN
            respect_stolen := LEAST(
                (defender.respect * 0.10)::INTEGER,  -- 10% respect
                100  -- Cap at 100
            );
        END IF;

        IF attack_type.kills_crew THEN
            crew_killed := LEAST(defender.total_crew / 4, 5);  -- Kill up to 25% or max 5
        END IF;

        -- Apply attacker gains
        UPDATE public.players SET 
            cash = cash + cash_stolen + vault_stolen,
            respect = respect + respect_stolen + 5  -- Bonus respect for winning
        WHERE id = attacker_id_input;

        -- Apply defender losses
        UPDATE public.players SET 
            cash = GREATEST(0, cash - cash_stolen),
            bank = GREATEST(0, bank - vault_stolen),
            respect = GREATEST(0, respect - respect_stolen - 3)
        WHERE id = defender_id_input;

        -- Kill defender crew
        IF crew_killed > 0 THEN
            -- Remove from random crew type
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

        -- Steal random contraband
        IF attack_type.steals_contraband THEN
            SELECT pi.item_id, LEAST(pi.quantity, 2) INTO random_item_id, random_qty
            FROM public.player_inventory pi
            JOIN public.item_definitions id ON pi.item_id = id.id
            WHERE pi.player_id = defender_id_input AND id.category = 'contraband' AND pi.quantity > 0
            ORDER BY random() LIMIT 1;

            IF random_item_id IS NOT NULL THEN
                contraband_stolen := random_qty;
                
                -- Remove from defender
                UPDATE public.player_inventory SET quantity = quantity - random_qty 
                WHERE player_id = defender_id_input AND item_id = random_item_id;
                
                -- Give to attacker
                INSERT INTO public.player_inventory (player_id, item_id, quantity)
                VALUES (attacker_id_input, random_item_id, random_qty)
                ON CONFLICT (player_id, item_id)
                DO UPDATE SET quantity = player_inventory.quantity + random_qty;
            END IF;
        END IF;

        -- Defender uses consumables (loses them in defense)
        defender_consumable_loss := LEAST(2, (SELECT COALESCE(SUM(quantity), 0)::INTEGER FROM public.player_inventory pi 
            JOIN public.item_definitions id ON pi.item_id = id.id 
            WHERE pi.player_id = defender_id_input AND id.category = 'equipment'));

    -- =====================================================
    -- ATTACKER LOSES
    -- =====================================================
    ELSE
        -- Attacker loses consumables/equipment (10-30% based on strength mismatch)
        IF strength_ratio < 0.5 THEN
            attacker_consumable_loss := 3;  -- Heavily outmatched
            attacker_respect_loss := 10;
        ELSIF strength_ratio < 1.0 THEN
            attacker_consumable_loss := 2;
            attacker_respect_loss := 5;
        ELSE
            attacker_consumable_loss := 1;
            attacker_respect_loss := 2;
        END IF;

        -- Attacker may lose crew
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

        -- Apply attacker losses
        UPDATE public.players SET 
            respect = GREATEST(0, respect - attacker_respect_loss)
        WHERE id = attacker_id_input;

        -- Defender gains respect for successful defense
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
        'attacker_respect_loss', attacker_respect_loss
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- GET PVP ATTACK TYPES RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_pvp_attack_types()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    description TEXT,
    stamina_cost INTEGER,
    requires_crew BOOLEAN,
    requires_consumables BOOLEAN,
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
        t.steals_cash, t.steals_vault, t.steals_contraband, 
        t.steals_respect, t.kills_crew,
        t.cash_steal_percent, t.vault_steal_percent
    FROM public.pvp_attack_types t
    WHERE t.is_active = true
    ORDER BY t.stamina_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
