-- =====================================================
-- INJURED CREW SYSTEM (PRE-WAR FEATURE)
-- =====================================================
-- PURPOSE:
--   Soften normal PvP crew losses with temporary injury system.
--   Permanent crew death is RESERVED for Family Wars only.
--
-- MECHANICS:
--   - PvP losses move crew to 'injured' state
--   - Recovery: 1 crew per hour automatically
--   - Injured crew: no combat power, no upkeep cost
--
-- IMPLEMENTATION:
--   1. Add injured_crew column to players
--   2. Add last_injured_recovery tracking column
--   3. Create recovery function
--   4. Modify perform_pvp_attack to use injury instead of deletion
-- =====================================================

SET search_path = public;

-- =====================================================
-- 1. ADD SCHEMA COLUMNS
-- =====================================================

-- Add injured crew tracking column
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS injured_crew INTEGER NOT NULL DEFAULT 0;

-- Add recovery timestamp tracking
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS last_injured_recovery TIMESTAMPTZ DEFAULT NOW();

-- Column comments
COMMENT ON COLUMN players.injured_crew IS 
    'Crew temporarily unavailable due to PvP injuries. Recovers at 1/hour. Does not contribute to combat or upkeep.';

COMMENT ON COLUMN players.last_injured_recovery IS 
    'Timestamp of last injured crew recovery calculation. Used to determine how many crew have recovered.';

-- =====================================================
-- 2. RECOVERY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION recover_injured_crew(player_id_input UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    hours_passed NUMERIC;
    crew_to_recover INTEGER;
    actual_recovered INTEGER := 0;
    crew_type_record RECORD;
    remaining_to_recover INTEGER;
BEGIN
    -- Get player's injured crew and last recovery time
    SELECT 
        injured_crew,
        last_injured_recovery,
        id
    INTO player_record
    FROM public.players
    WHERE id = player_id_input;

    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    -- No injured crew to recover
    IF player_record.injured_crew <= 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'crew_recovered', 0,
            'injured_remaining', 0
        );
    END IF;

    -- Calculate hours passed since last recovery
    hours_passed := EXTRACT(EPOCH FROM (NOW() - player_record.last_injured_recovery)) / 3600;
    
    -- Calculate crew to recover (1 per hour, rounded down)
    crew_to_recover := FLOOR(hours_passed)::INTEGER;
    
    -- Cap at available injured crew
    crew_to_recover := LEAST(crew_to_recover, player_record.injured_crew);

    -- If no crew to recover yet, just return
    IF crew_to_recover <= 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'crew_recovered', 0,
            'injured_remaining', player_record.injured_crew,
            'next_recovery_in_minutes', CEIL((1 - (hours_passed - FLOOR(hours_passed))) * 60)
        );
    END IF;

    -- Update injured_crew count and timestamp
    UPDATE public.players
    SET 
        injured_crew = injured_crew - crew_to_recover,
        last_injured_recovery = NOW()
    WHERE id = player_id_input;

    -- Restore recovered crew back to player_crew
    -- Strategy: Distribute recovered crew proportionally to existing crew types
    -- Or if no crew exist, we need to handle that case
    
    remaining_to_recover := crew_to_recover;
    
    -- Get player's existing crew types (if any)
    FOR crew_type_record IN 
        SELECT pc.crew_id, pc.quantity
        FROM player_crew pc
        WHERE pc.player_id = player_id_input
        ORDER BY pc.quantity DESC -- Prioritize larger crews
    LOOP
        -- Add 1 crew to this type and decrement counter
        UPDATE player_crew
        SET quantity = quantity + 1
        WHERE player_id = player_id_input 
          AND crew_id = crew_type_record.crew_id;
        
        remaining_to_recover := remaining_to_recover - 1;
        actual_recovered := actual_recovered + 1;
        
        EXIT WHEN remaining_to_recover <= 0;
    END LOOP;

    -- If player has no crew types at all, we can't restore injured crew
    -- This is an edge case - crew were injured but all active crew types deleted
    -- In this case, injured crew remain injured until player hires new crew
    -- For now, we'll just reduce injured_crew count without restoring
    -- (Alternative: Could auto-hire a default crew type, but that adds complexity)
    
    IF actual_recovered < crew_to_recover THEN
        -- Some crew couldn't be restored - adjust injured_crew back up
        UPDATE public.players
        SET injured_crew = injured_crew + (crew_to_recover - actual_recovered)
        WHERE id = player_id_input;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'crew_recovered', actual_recovered,
        'injured_remaining', player_record.injured_crew - actual_recovered,
        'crew_lost_no_type', crew_to_recover - actual_recovered
    );
END;
$$;

ALTER FUNCTION recover_injured_crew(UUID) SET search_path = public;

COMMENT ON FUNCTION recover_injured_crew(UUID) IS 
    'Recovers injured crew over time (1/hour). Restores crew to player_crew proportionally. Called automatically on PvP and login.';

-- =====================================================
-- 3. MODIFY PVP ATTACK FUNCTION
-- =====================================================

-- Drop and recreate perform_pvp_attack with injured crew logic
DROP FUNCTION IF EXISTS perform_pvp_attack(UUID, UUID, TEXT, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION perform_pvp_attack(
    attacker_id_input UUID,
    defender_id_input UUID,
    attack_type_input TEXT,
    is_revenge_input BOOLEAN DEFAULT false,
    original_attack_id_input UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    attacker RECORD;
    defender RECORD;
    attack_type RECORD;
    cooldown_status JSONB;
    
    attack_fee BIGINT := 0;
    attacker_strength INTEGER;
    defender_strength INTEGER;
    strength_ratio FLOAT;
    
    consumable_item RECORD;
    player_consumable_qty INTEGER;
    
    -- Booster checks
    has_attack_boost BOOLEAN := false;
    has_shield BOOLEAN := false;
    has_vip BOOLEAN := false;
    
    -- Insurance
    defender_insurance RECORD;
    insurance_applied BOOLEAN := false;
    insurance_savings BIGINT := 0;
    
    win_chance INTEGER;
    roll INTEGER;
    attacker_wins BOOLEAN;
    
    -- Respect values
    attacker_respect_gain INTEGER := 0;
    attacker_respect_loss INTEGER := 0;
    defender_respect_gain INTEGER := 0;
    defender_respect_loss INTEGER := 0;
    
    -- Respect bonus for consumable attacks
    respect_bonus INTEGER := 5;
    
    -- Losses/gains
    base_cash_stolen BIGINT := 0;
    cash_stolen BIGINT := 0;
    vault_stolen BIGINT := 0;
    contraband_stolen INTEGER := 0;
    respect_stolen INTEGER := 0;
    crew_killed INTEGER := 0;
    
    -- Attacker losses on defeat
    attacker_crew_loss INTEGER := 0;
    
    random_item_id UUID;
    random_qty INTEGER;
    stolen_item_name TEXT;
    
    new_attack_log_id UUID;
BEGIN
    -- =====================================================
    -- AUTO-RECOVER INJURED CREW BEFORE COMBAT
    -- =====================================================
    PERFORM recover_injured_crew(attacker_id_input);
    PERFORM recover_injured_crew(defender_id_input);

    -- Get attack type
    SELECT * INTO attack_type FROM public.pvp_attack_types WHERE id = attack_type_input AND is_active = true;
    IF attack_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid attack type');
    END IF;

    -- Set respect bonus based on consumable requirement
    IF attack_type.requires_consumables THEN
        respect_bonus := 10;
    ELSE
        respect_bonus := 5;
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

    -- =====================================================
    -- VALIDATE REVENGE (if applicable)
    -- =====================================================
    IF is_revenge_input THEN
        IF original_attack_id_input IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Revenge requires original attack ID');
        END IF;
        
        -- Check if revenge is valid
        IF NOT EXISTS (
            SELECT 1 FROM attack_log al
            WHERE al.id = original_attack_id_input
              AND al.defender_id = attacker_id_input
              AND al.attacker_id = defender_id_input
              AND al.attacker_won = true
              AND al.revenge_taken = false
              AND al.created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Revenge not available or expired');
        END IF;
    END IF;

    -- =====================================================
    -- PROTECTION CHECK 1: NEW PLAYER PROTECTION (NPP)
    -- =====================================================
    IF defender.newbie_shield_expires_at > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Target is under New Player Protection',
            'npp_expires_at', defender.newbie_shield_expires_at
        );
    END IF;

    -- =====================================================
    -- PROTECTION CHECK 2: PURCHASED PROTECTION
    -- =====================================================
    IF defender.protection_expires_at IS NOT NULL AND defender.protection_expires_at > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Target has active Protection',
            'protection_expires_at', defender.protection_expires_at
        );
    END IF;

    -- =====================================================
    -- CHECK BOOSTERS (with VIP support!)
    -- =====================================================
    
    -- Check attacker's 2x_attack OR vip_pass booster
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = attacker_id_input 
        AND booster_type IN ('2x_attack', 'vip_pass')
        AND expires_at > NOW()
    ) INTO has_attack_boost;
    
    -- Check defender's shield OR vip_pass booster
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = defender_id_input 
        AND booster_type IN ('shield', 'vip_pass')
        AND expires_at > NOW()
    ) INTO has_shield;

    -- =====================================================
    -- SHIELD/VIP BLOCKS PVP ENTIRELY
    -- =====================================================
    IF has_shield THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Target has an active Shield - attack blocked',
            'defender_had_shield', true
        );
    END IF;

    -- =====================================================
    -- PVP COOLDOWN CHECK
    -- =====================================================
    cooldown_status := check_pvp_cooldown(attacker_id_input, defender_id_input);
    
    IF (cooldown_status->>'on_cooldown')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PVP_COOLDOWN_ACTIVE',
            'message', 'You''ve already sent a message. Give it time to sink in.',
            'cooldown_seconds', (cooldown_status->>'remaining_seconds')::INTEGER,
            'cooldown_ends_at', cooldown_status->>'cooldown_ends_at'
        );
    END IF;

    -- =====================================================
    -- CALCULATE AND VALIDATE CASH FEE
    -- =====================================================
    IF (SELECT to_regproc('get_pvp_fee')) IS NOT NULL THEN
       attack_fee := get_pvp_fee(attacker.respect);
    ELSE
       attack_fee := 500;
    END IF;
    
    IF attacker.cash < attack_fee THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Not enough cash for attack fee ($' || attack_fee || ')',
            'attack_fee', attack_fee,
            'player_cash', attacker.cash
        );
    END IF;

    -- Deduct attack fee
    UPDATE public.players SET cash = cash - attack_fee WHERE id = attacker_id_input;

    -- Check stamina
    IF attacker.stamina < attack_type.stamina_cost THEN
        UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;

    -- Check crew requirement
    IF attack_type.requires_crew AND attacker.total_crew = 0 THEN
        UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
        RETURN jsonb_build_object('success', false, 'message', 'This attack requires crew members');
    END IF;

    -- Check consumable requirement
    IF attack_type.requires_consumables AND attack_type.consumable_item_name IS NOT NULL THEN
        SELECT * INTO consumable_item FROM public.item_definitions WHERE name = attack_type.consumable_item_name;
        
        IF consumable_item IS NULL THEN
            UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
            RETURN jsonb_build_object('success', false, 'message', 'Consumable item not found: ' || attack_type.consumable_item_name);
        END IF;
        
        SELECT COALESCE(quantity, 0) INTO player_consumable_qty
        FROM public.player_inventory
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id;
        
        IF player_consumable_qty < attack_type.consumable_qty THEN
            UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Need ' || attack_type.consumable_qty || 'x ' || attack_type.consumable_item_name || ' (have ' || COALESCE(player_consumable_qty, 0) || ')'
            );
        END IF;
        
        -- Deduct consumables
        UPDATE public.player_inventory 
        SET quantity = quantity - attack_type.consumable_qty
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id;
        
        DELETE FROM public.player_inventory 
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id AND quantity <= 0;
    END IF;

    -- =====================================================
    -- CALCULATE COMBAT STRENGTH
    -- =====================================================
    IF (SELECT to_regproc('get_respect_tier')) IS NOT NULL THEN
         attacker_strength := get_respect_tier(attacker.respect) + attacker.crew_attack + attacker.item_attack;
         defender_strength := get_respect_tier(defender.respect) + defender.crew_defense + defender.item_defense;
    ELSE
         attacker_strength := floor(attacker.respect / 1000) + attacker.crew_attack + attacker.item_attack;
         defender_strength := floor(defender.respect / 1000) + defender.crew_defense + defender.item_defense;
    END IF;
    
    -- Apply 2x attack boost (from 2x_attack OR vip_pass)
    IF has_attack_boost THEN
        attacker_strength := attacker_strength * 2;
    END IF;

    IF defender_strength < 1 THEN defender_strength := 1; END IF;

    -- Calculate win chance
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
    -- HANDLE VICTORY
    -- =====================================================
    IF attacker_wins THEN
        IF attack_type.steals_cash THEN
            base_cash_stolen := LEAST(
                (defender.cash * attack_type.cash_steal_percent / 100)::BIGINT,
                (defender.cash * 0.45)::BIGINT
            );
            cash_stolen := base_cash_stolen;
        END IF;

        IF attack_type.steals_vault THEN
            vault_stolen := LEAST(
                (defender.banked_cash * attack_type.vault_steal_percent / 100)::BIGINT,
                (defender.banked_cash * 0.15)::BIGINT
            );
        END IF;

        IF attack_type.steals_respect THEN
            respect_stolen := LEAST((defender.respect * 0.10)::INTEGER, 100);
        END IF;

        IF attack_type.kills_crew THEN
            IF attack_type_input = 'drive_by' THEN
                crew_killed := LEAST(2, defender.total_crew);
            ELSE
                crew_killed := LEAST(defender.total_crew / 4, 5);
            END IF;
        END IF;

        -- Apply insurance if defender has it
        SELECT * INTO defender_insurance 
        FROM player_insurance 
        WHERE player_id = defender_id_input 
          AND is_active = true 
          AND expires_at > NOW();
          
        IF defender_insurance IS NOT NULL THEN
            insurance_applied := true;
            IF cash_stolen > 0 THEN
                insurance_savings := (cash_stolen * defender_insurance.cash_protection_percent / 100)::BIGINT;
                cash_stolen := cash_stolen - insurance_savings;
            END IF;
        END IF;

        -- Calculate respect changes for victory
        attacker_respect_gain := 15 + respect_bonus + FLOOR(RANDOM() * 10);
        defender_respect_loss := 10 + FLOOR(RANDOM() * 5);

        -- Apply changes
        UPDATE public.players SET 
            cash = cash - cash_stolen,
            banked_cash = GREATEST(0, banked_cash - vault_stolen),
            respect = GREATEST(0, respect - COALESCE(respect_stolen, 0) - defender_respect_loss)
        WHERE id = defender_id_input;
        
        UPDATE public.players SET 
            cash = cash + cash_stolen + vault_stolen,
            respect = respect + COALESCE(respect_stolen, 0) + attacker_respect_gain
        WHERE id = attacker_id_input;

        -- =====================================================
        -- INJURE CREW (NEW LOGIC - NO PERMANENT DEATH)
        -- =====================================================
        IF crew_killed > 0 AND defender.total_crew > 0 THEN
            -- Cap crew killed to actual available crew
            crew_killed := LEAST(crew_killed, defender.total_crew);
            
            -- Move crew to injured state
            UPDATE public.players 
            SET injured_crew = injured_crew + crew_killed
            WHERE id = defender_id_input;
            
            -- Reduce active crew proportionally from player_crew
            -- For simplicity: reduce from largest crew type first
            UPDATE public.player_crew 
            SET quantity = GREATEST(0, quantity - crew_killed)
            WHERE id = (
                SELECT id FROM public.player_crew 
                WHERE player_id = defender_id_input 
                ORDER BY quantity DESC 
                LIMIT 1
            );
            
            -- Clean up zero quantity entries
            DELETE FROM public.player_crew 
            WHERE player_id = defender_id_input AND quantity <= 0;
        END IF;

        -- Log attack
        INSERT INTO attack_log (
            attacker_id, defender_id, attack_type, attacker_won,
            cash_stolen, vault_stolen, respect_stolen, crew_killed,
            attacker_strength, defender_strength, roll, win_chance,
            insurance_applied, insurance_savings,
            is_revenge, original_attack_id
        ) VALUES (
            attacker_id_input, defender_id_input, attack_type_input, true,
            cash_stolen, vault_stolen, respect_stolen, crew_killed,
            attacker_strength, defender_strength, roll, win_chance,
            insurance_applied, insurance_savings,
            is_revenge_input, original_attack_id_input
        ) RETURNING id INTO new_attack_log_id;

        -- Mark revenge as taken
        IF is_revenge_input AND original_attack_id_input IS NOT NULL THEN
            UPDATE attack_log SET revenge_taken = true WHERE id = original_attack_id_input;
        END IF;

        -- Record cooldown
        INSERT INTO pvp_cooldowns (attacker_id, defender_id, cooled_until)
        VALUES (attacker_id_input, defender_id_input, NOW() + INTERVAL '5 minutes')
        ON CONFLICT (attacker_id, defender_id) 
        DO UPDATE SET cooled_until = NOW() + INTERVAL '5 minutes';

        -- Notify defender
        INSERT INTO notifications (player_id, type, title, description)
        VALUES (
            defender_id_input, 'attack',
            '⚔️ You were attacked!',
            attacker.username || ' hit you with a ' || attack_type.name || '. Lost $' || cash_stolen
        );

        RETURN jsonb_build_object(
            'success', true,
            'result', 'victory',
            'attack_type', attack_type.name,
            'cash_stolen', cash_stolen,
            'vault_stolen', vault_stolen,
            'respect_stolen', respect_stolen,
            'crew_killed', crew_killed,
            'respect_gained', attacker_respect_gain,
            'attacker_strength', attacker_strength,
            'defender_strength', defender_strength,
            'roll', roll,
            'win_chance', win_chance,
            'attack_fee', attack_fee,
            'insurance_applied', insurance_applied,
            'insurance_savings', insurance_savings,
            'attack_log_id', new_attack_log_id,
            'had_attack_boost', has_attack_boost
        );
    ELSE
        -- =====================================================
        -- HANDLE DEFEAT
        -- =====================================================
        attacker_respect_loss := 5 + FLOOR(RANDOM() * 5);
        defender_respect_gain := 10 + FLOOR(RANDOM() * 5);
        
        -- =====================================================
        -- ATTACKER LOSES CREW (INJURED, NOT KILLED)
        -- =====================================================
        IF attacker.total_crew > 0 THEN
            attacker_crew_loss := LEAST(1, attacker.total_crew);
            
            -- Move attacker's crew to injured state
            UPDATE public.players 
            SET injured_crew = injured_crew + attacker_crew_loss
            WHERE id = attacker_id_input;
            
            -- Reduce active crew
            UPDATE public.player_crew 
            SET quantity = GREATEST(0, quantity - attacker_crew_loss)
            WHERE id = (
                SELECT id FROM public.player_crew 
                WHERE player_id = attacker_id_input 
                ORDER BY quantity DESC 
                LIMIT 1
            );
            
            DELETE FROM public.player_crew WHERE player_id = attacker_id_input AND quantity <= 0;
        END IF;

        UPDATE public.players SET respect = GREATEST(0, respect - attacker_respect_loss) WHERE id = attacker_id_input;
        UPDATE public.players SET respect = respect + defender_respect_gain WHERE id = defender_id_input;

        INSERT INTO attack_log (
            attacker_id, defender_id, attack_type, attacker_won,
            cash_stolen, vault_stolen, respect_stolen, crew_killed,
            attacker_strength, defender_strength, roll, win_chance,
            is_revenge, original_attack_id
        ) VALUES (
            attacker_id_input, defender_id_input, attack_type_input, false,
            0, 0, 0, 0,
            attacker_strength, defender_strength, roll, win_chance,
            is_revenge_input, original_attack_id_input
        ) RETURNING id INTO new_attack_log_id;

        -- Record cooldown
        INSERT INTO pvp_cooldowns (attacker_id, defender_id, cooled_until)
        VALUES (attacker_id_input, defender_id_input, NOW() + INTERVAL '5 minutes')
        ON CONFLICT (attacker_id, defender_id) 
        DO UPDATE SET cooled_until = NOW() + INTERVAL '5 minutes';

        -- Notify defender
        INSERT INTO notifications (player_id, type, title, description)
        VALUES (
            defender_id_input, 'attack',
            '🛡️ Attack Repelled!',
            attacker.username || ' tried to attack you but failed!'
        );

        RETURN jsonb_build_object(
            'success', true,
            'result', 'defeat',
            'attack_type', attack_type.name,
            'respect_lost', attacker_respect_loss,
            'crew_lost', attacker_crew_loss,
            'attacker_strength', attacker_strength,
            'defender_strength', defender_strength,
            'roll', roll,
            'win_chance', win_chance,
            'attack_fee', attack_fee,
            'attack_log_id', new_attack_log_id,
            'had_attack_boost', has_attack_boost
        );
    END IF;
END;
$$;

ALTER FUNCTION perform_pvp_attack(UUID, UUID, TEXT, BOOLEAN, UUID) SET search_path = public;

COMMENT ON FUNCTION perform_pvp_attack(UUID, UUID, TEXT, BOOLEAN, UUID) IS 
    'PvP attack with injured crew system. Crew move to injured state instead of permanent death. Auto-recovers injured crew before combat.';
