-- =====================================================
-- ECONOMY V2: PVP CREW THEFT MECHANICS
-- =====================================================
-- Updates PvP attack to include:
-- - 24hr cooldown check
-- - Crew survival/death mechanics
-- - Weapon + armor drops from dead crew
-- - Inventory theft chance

-- =====================================================
-- UPDATED PERFORM_PVP_ATTACK WITH CREW THEFT
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

    -- Calculate strengths (include equipped items)
    SELECT 
        COALESCE(SUM(id.attack_bonus * pi.quantity), 0)::INTEGER,
        COALESCE(SUM(id.defense_bonus * pi.quantity), 0)::INTEGER
    INTO attacker_strength, attacker_strength  -- Just using for temp calc
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON id.id = pi.item_id
    WHERE pi.player_id = attacker_id_input AND pi.is_equipped = true;
    
    attacker_strength := (attacker.level * 10) + attacker.crew_attack + 
                         COALESCE((SELECT COALESCE(SUM(id.attack_bonus * pi.quantity), 0)::INTEGER 
                                   FROM public.player_inventory pi
                                   JOIN public.item_definitions id ON id.id = pi.item_id
                                   WHERE pi.player_id = attacker_id_input AND pi.is_equipped = true), 0) + 
                         (attacker.respect / 10);
                         
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

        -- =====================================================
        -- CREW DEATH MECHANICS (New Economy v2 feature)
        -- =====================================================
        IF attack_type.kills_crew AND defender.total_crew > 0 THEN
            -- Loop through each crew type defender has
            FOR crew_record IN 
                SELECT pc.id, pc.crew_id, pc.quantity, cd.survival_chance, cd.name as crew_name
                FROM public.player_crew pc
                JOIN public.crew_definitions cd ON cd.id = pc.crew_id
                WHERE pc.player_id = defender_id_input AND pc.quantity > 0
            LOOP
                -- Roll survival for each crew member (simplified: check for group)
                crew_survival_roll := floor(random() * 100) + 1;
                
                -- Modify survival chance based on victory margin
                -- Stronger victory = more deaths
                IF strength_ratio >= 2.0 THEN
                    crew_survival_roll := crew_survival_roll + 20; -- Harder to survive
                ELSIF strength_ratio >= 1.5 THEN
                    crew_survival_roll := crew_survival_roll + 10;
                END IF;
                
                IF crew_survival_roll > crew_record.survival_chance THEN
                    -- This crew type loses 1 member
                    UPDATE public.player_crew 
                    SET quantity = quantity - 1 
                    WHERE id = crew_record.id AND quantity > 0;
                    
                    crew_killed := crew_killed + 1;
                    
                    -- =====================================================
                    -- WEAPON + ARMOR DROP FROM DEAD CREW
                    -- =====================================================
                    -- Find a random equipped weapon from defender and transfer to attacker
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
                    
                    -- Find a random equipped armor/equipment and transfer
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

        -- =====================================================
        -- INVENTORY THEFT (3-8% chance per item NOT in safe)
        -- =====================================================
        FOR random_item_id IN 
            SELECT pi.id
            FROM public.player_inventory pi
            WHERE pi.player_id = defender_id_input 
            AND pi.location = 'inventory' -- NOT safe, NOT equipped
            AND random() < 0.05 -- 5% base chance per item
            LIMIT 2 -- Max 2 items stolen from inventory
        LOOP
            -- Transfer item to attacker
            UPDATE public.player_inventory 
            SET player_id = attacker_id_input
            WHERE id = random_item_id;
            
            inventory_stolen_count := inventory_stolen_count + 1;
        END LOOP;

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

        -- Steal random contraband (legacy behavior)
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

    -- =====================================================
    -- RECORD 24 HOUR COOLDOWN
    -- =====================================================
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

    -- Notifications
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES 
        (attacker_id_input, 'attack', 
         CASE WHEN attacker_wins THEN 'Attack Successful!' ELSE 'Attack Failed!' END,
         CASE WHEN attacker_wins 
            THEN 'Hit ' || defender.username || '. Stole $' || (cash_stolen + vault_stolen) || 
                 CASE WHEN crew_killed > 0 THEN ', killed ' || crew_killed || ' crew, looted gear!' ELSE '' END
            ELSE 'Failed attack on ' || defender.username || '. Lost ' || attacker_respect_loss || ' respect'
         END),
        (defender_id_input, 'attack',
         CASE WHEN attacker_wins THEN 'You Were Attacked!' ELSE 'Attack Defended!' END,
         CASE WHEN attacker_wins 
            THEN attacker.username || ' attacked you! Lost $' || (cash_stolen + vault_stolen) ||
                 CASE WHEN crew_killed > 0 THEN ', ' || crew_killed || ' crew killed, gear stolen!' ELSE '' END
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
        'attacker_respect_loss', attacker_respect_loss
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
