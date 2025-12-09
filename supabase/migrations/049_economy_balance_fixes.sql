-- =====================================================
-- ECONOMY BALANCE FIXES V1
-- =====================================================
-- Based on combined analysis from Economy_Analysis.md and Economy_Numbers.md
-- P0-P1 fixes: Boosters, Crew Upkeep, Job Nerfs, Sell-back

-- =====================================================
-- 1. INTEGRATE BOOSTERS INTO PVP ATTACK
-- =====================================================
-- This modifies the existing perform_pvp_attack function to:
-- - Check for 2x_attack booster on attacker → double attack strength
-- - Check for shield booster on defender → block attack entirely

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
    
    -- BOOSTER CHECK VARIABLES
    attacker_has_2x_attack BOOLEAN := false;
    defender_has_shield BOOLEAN := false;
    
    win_chance INTEGER;
    roll INTEGER;
    attacker_wins BOOLEAN;
    
    -- Losses/gains
    loss_multiplier FLOAT := 0.45; -- 45% max cap
    cash_stolen BIGINT := 0;
    vault_stolen BIGINT := 0;
    contraband_stolen INTEGER := 0;
    respect_stolen INTEGER := 0;
    
    -- Crew death tracking
    crew_killed INTEGER := 0;
    weapons_looted INTEGER := 0;
    armor_looted INTEGER := 0;
    crew_record RECORD;
    crew_survival_roll INTEGER;
    
    -- Attacker losses on defeat
    attacker_consumable_loss INTEGER := 0;
    attacker_crew_loss INTEGER := 0;
    attacker_respect_loss INTEGER := 0;
    
    -- Defender losses on defeat
    defender_consumable_loss INTEGER := 0;
    
    -- Item theft
    random_item_id UUID;
    random_qty INTEGER;
    inventory_stolen_count INTEGER := 0;
    
    -- Cooldown check
    cooldown_check JSONB;
BEGIN
    -- =====================================================
    -- CHECK FOR ACTIVE BOOSTERS
    -- =====================================================
    
    -- Check if attacker has 2x_attack booster
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = attacker_id_input 
        AND booster_type = '2x_attack' 
        AND expires_at > NOW()
    ) INTO attacker_has_2x_attack;
    
    -- Check if defender has shield booster
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = defender_id_input 
        AND booster_type = 'shield' 
        AND expires_at > NOW()
    ) INTO defender_has_shield;
    
    -- SHIELD: Block attack entirely
    IF defender_has_shield THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Target has an active Shield! They are protected from attacks.',
            'blocked_by_shield', true
        );
    END IF;

    -- =====================================================
    -- 24 HOUR COOLDOWN CHECK
    -- =====================================================
    SELECT check_attack_cooldown(attacker_id_input, defender_id_input) INTO cooldown_check;
    
    IF NOT (cooldown_check->>'can_attack')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'You recently attacked this player. Cooldown: ' || 
                       (cooldown_check->>'remaining_hours') || ' hours remaining'
        );
    END IF;

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

    -- Calculate base attacker strength
    attacker_strength := (attacker.level * 10) + attacker.crew_attack + 
                         COALESCE((SELECT COALESCE(SUM(id.attack_bonus * pi.quantity), 0)::INTEGER 
                                   FROM public.player_inventory pi
                                   JOIN public.item_definitions id ON id.id = pi.item_id
                                   WHERE pi.player_id = attacker_id_input AND pi.is_equipped = true), 0) + 
                         (attacker.respect / 10);
    
    -- =====================================================
    -- APPLY 2X ATTACK BOOSTER
    -- =====================================================
    IF attacker_has_2x_attack THEN
        attacker_strength := attacker_strength * 2;
    END IF;
                         
    defender_strength := (defender.level * 10) + defender.crew_defense + 
                         COALESCE((SELECT COALESCE(SUM(id.defense_bonus * pi.quantity), 0)::INTEGER 
                                   FROM public.player_inventory pi
                                   JOIN public.item_definitions id ON id.id = pi.item_id
                                   WHERE pi.player_id = defender_id_input AND pi.is_equipped = true), 0) + 
                         (defender.respect / 10);

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
            respect_stolen := LEAST(
                (defender.respect * 0.10)::INTEGER,
                100
            );
        END IF;

        -- Crew death mechanics
        IF attack_type.kills_crew AND defender.total_crew > 0 THEN
            FOR crew_record IN 
                SELECT pc.id, pc.crew_id, pc.quantity, cd.survival_chance, cd.name as crew_name
                FROM public.player_crew pc
                JOIN public.crew_definitions cd ON cd.id = pc.crew_id
                WHERE pc.player_id = defender_id_input AND pc.quantity > 0
            LOOP
                crew_survival_roll := floor(random() * 100) + 1;
                
                IF strength_ratio >= 2.0 THEN
                    crew_survival_roll := crew_survival_roll + 20;
                ELSIF strength_ratio >= 1.5 THEN
                    crew_survival_roll := crew_survival_roll + 10;
                END IF;
                
                IF crew_survival_roll > crew_record.survival_chance THEN
                    UPDATE public.player_crew 
                    SET quantity = quantity - 1 
                    WHERE id = crew_record.id AND quantity > 0;
                    
                    crew_killed := crew_killed + 1;
                    
                    -- Weapon drop
                    WITH stolen_weapon AS (
                        SELECT pi.id, pi.item_id, pi.quantity
                        FROM public.player_inventory pi
                        JOIN public.item_definitions id ON id.id = pi.item_id
                        WHERE pi.player_id = defender_id_input 
                        AND pi.is_equipped = true
                        AND id.category = 'weapon'
                        ORDER BY random() LIMIT 1
                    )
                    UPDATE public.player_inventory pi
                    SET player_id = attacker_id_input,
                        is_equipped = false,
                        location = 'inventory'
                    FROM stolen_weapon sw
                    WHERE pi.id = sw.id
                    RETURNING 1 INTO weapons_looted;
                    
                    weapons_looted := COALESCE(weapons_looted, 0) + COALESCE(weapons_looted, 0);
                    
                    -- Armor drop
                    WITH stolen_armor AS (
                        SELECT pi.id, pi.item_id
                        FROM public.player_inventory pi
                        JOIN public.item_definitions id ON id.id = pi.item_id
                        WHERE pi.player_id = defender_id_input 
                        AND pi.is_equipped = true
                        AND id.category = 'equipment'
                        ORDER BY random() LIMIT 1
                    )
                    UPDATE public.player_inventory pi
                    SET player_id = attacker_id_input,
                        is_equipped = false,
                        location = 'inventory'
                    FROM stolen_armor sa
                    WHERE pi.id = sa.id
                    RETURNING 1 INTO armor_looted;
                    
                    armor_looted := COALESCE(armor_looted, 0) + COALESCE(armor_looted, 0);
                END IF;
            END LOOP;
        END IF;

        -- Inventory theft
        FOR random_item_id IN 
            SELECT pi.id
            FROM public.player_inventory pi
            WHERE pi.player_id = defender_id_input 
            AND pi.location = 'inventory'
            AND random() < 0.05
            LIMIT 2
        LOOP
            UPDATE public.player_inventory 
            SET player_id = attacker_id_input
            WHERE id = random_item_id;
            
            inventory_stolen_count := inventory_stolen_count + 1;
        END LOOP;

        -- Apply attacker gains
        UPDATE public.players SET 
            cash = cash + cash_stolen + vault_stolen,
            respect = respect + respect_stolen + 5
        WHERE id = attacker_id_input;

        -- Apply defender losses
        UPDATE public.players SET 
            cash = GREATEST(0, cash - cash_stolen),
            bank = GREATEST(0, bank - vault_stolen),
            respect = GREATEST(0, respect - respect_stolen - 3)
        WHERE id = defender_id_input;

        -- Contraband theft
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
            attacker_consumable_loss := 3;
            attacker_respect_loss := 10;
        ELSIF strength_ratio < 1.0 THEN
            attacker_consumable_loss := 2;
            attacker_respect_loss := 5;
        ELSE
            attacker_consumable_loss := 1;
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

        UPDATE public.players SET 
            respect = GREATEST(0, respect - attacker_respect_loss)
        WHERE id = attacker_id_input;

        UPDATE public.players SET respect = respect + 3 WHERE id = defender_id_input;
    END IF;

    -- Record cooldown
    INSERT INTO public.attack_cooldowns (attacker_id, defender_id, cooldown_until)
    VALUES (attacker_id_input, defender_id_input, NOW() + INTERVAL '24 hours')
    ON CONFLICT (attacker_id, defender_id)
    DO UPDATE SET 
        attacked_at = NOW(),
        cooldown_until = NOW() + INTERVAL '24 hours';

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

    -- Notifications with booster info
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES 
        (attacker_id_input, 'attack', 
         CASE WHEN attacker_wins THEN 'Attack Successful!' ELSE 'Attack Failed!' END,
         CASE WHEN attacker_wins 
            THEN 'Hit ' || defender.username || '. Stole $' || (cash_stolen + vault_stolen) || 
                 CASE WHEN attacker_has_2x_attack THEN ' (2x ATTACK boost!)' ELSE '' END ||
                 CASE WHEN crew_killed > 0 THEN ', killed ' || crew_killed || ' crew!' ELSE '' END
            ELSE 'Failed attack on ' || defender.username || '. Lost ' || attacker_respect_loss || ' respect'
         END),
        (defender_id_input, 'attack',
         CASE WHEN attacker_wins THEN 'You Were Attacked!' ELSE 'Attack Defended!' END,
         CASE WHEN attacker_wins 
            THEN attacker.username || ' attacked you! Lost $' || (cash_stolen + vault_stolen) ||
                 CASE WHEN crew_killed > 0 THEN ', ' || crew_killed || ' crew killed!' ELSE '' END
            ELSE 'Successfully defended against ' || attacker.username
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
        'weapons_looted', weapons_looted,
        'armor_looted', armor_looted,
        'inventory_stolen', inventory_stolen_count,
        'attacker_crew_loss', attacker_crew_loss,
        'attacker_respect_loss', attacker_respect_loss,
        'attacker_boosted', attacker_has_2x_attack
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 2. REDUCE CREW UPKEEP (ChatGPT recommended $50 → $12-25)
-- =====================================================
-- Using $25/hr as conservative interim (can go to $12/hr later)

UPDATE public.crew_definitions SET upkeep_per_hour = 25 WHERE name = 'Street Thug';
UPDATE public.crew_definitions SET upkeep_per_hour = 60 WHERE name = 'Bodyguard';
UPDATE public.crew_definitions SET upkeep_per_hour = 80 WHERE name = 'Getaway Driver';
UPDATE public.crew_definitions SET upkeep_per_hour = 200 WHERE name = 'Professional Hitman';
UPDATE public.crew_definitions SET upkeep_per_hour = 50 WHERE name = 'Crooked Accountant';
UPDATE public.crew_definitions SET upkeep_per_hour = 300 WHERE name = 'Enforcer Captain';
UPDATE public.crew_definitions SET upkeep_per_hour = 400 WHERE name = 'Personal Guard';


-- =====================================================
-- 3. NERF CASINO HEIST ($100K → $75K)
-- =====================================================
UPDATE public.job_definitions SET cash_reward = 75000 WHERE name = 'Casino Heist';

-- Also slightly nerf Rob the Bank ($50K → $45K)
UPDATE public.job_definitions SET cash_reward = 45000 WHERE name = 'Rob the Bank';


-- =====================================================
-- 4. ADD SELL ITEM RPC (50% sell-back)
-- =====================================================
CREATE OR REPLACE FUNCTION sell_item(
    player_id_input UUID,
    item_id_input UUID,
    quantity_input INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    item_record RECORD;
    player_inventory_record RECORD;
    sell_price BIGINT;
    total_value BIGINT;
BEGIN
    -- Validate quantity
    IF quantity_input < 1 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;

    -- Get item definition
    SELECT * INTO item_record FROM public.item_definitions WHERE id = item_id_input;
    IF item_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    -- Get player inventory
    SELECT * INTO player_inventory_record 
    FROM public.player_inventory 
    WHERE player_id = player_id_input AND item_id = item_id_input;
    
    IF player_inventory_record IS NULL OR player_inventory_record.quantity < quantity_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough items to sell');
    END IF;

    -- Cannot sell equipped items
    IF player_inventory_record.is_equipped AND quantity_input >= player_inventory_record.quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unequip item before selling');
    END IF;

    -- Cannot sell items in safe
    IF player_inventory_record.location = 'safe' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Remove item from safe before selling');
    END IF;

    -- Calculate sell price (use sell_price if exists, otherwise 50% of buy_price)
    IF item_record.sell_price IS NOT NULL AND item_record.sell_price > 0 THEN
        sell_price := item_record.sell_price;
    ELSE
        sell_price := COALESCE(item_record.buy_price, 0) / 2;
    END IF;

    IF sell_price <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'This item cannot be sold');
    END IF;

    total_value := sell_price * quantity_input;

    -- Remove items from inventory
    IF player_inventory_record.quantity = quantity_input THEN
        DELETE FROM public.player_inventory 
        WHERE player_id = player_id_input AND item_id = item_id_input;
    ELSE
        UPDATE public.player_inventory 
        SET quantity = quantity - quantity_input
        WHERE player_id = player_id_input AND item_id = item_id_input;
    END IF;

    -- Credit cash
    UPDATE public.players SET cash = cash + total_value WHERE id = player_id_input;

    -- Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'item_sale', 'cash', total_value, 
            'Sold ' || quantity_input || 'x ' || item_record.name);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Sold ' || quantity_input || 'x ' || item_record.name || ' for $' || total_value,
        'item_name', item_record.name,
        'quantity', quantity_input,
        'cash_received', total_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 5. IMPROVE BLACK MARKET ROI (10hrs → 8hrs)
-- =====================================================
-- Increase income from $50K/hr to $62.5K/hr (equivalent to 8hr ROI)
UPDATE public.business_definitions 
SET base_income_per_hour = 62500 
WHERE name = 'Black Market';


-- Add comments
COMMENT ON FUNCTION perform_pvp_attack IS 'PvP attack with booster integration (2x_attack, shield)';
COMMENT ON FUNCTION sell_item IS 'Sell items from inventory for 50% of buy price';
