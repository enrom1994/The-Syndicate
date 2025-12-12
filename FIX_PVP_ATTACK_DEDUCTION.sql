-- =====================================================
-- FIX: PvP Attack Not Deducting Money from Defender
-- Run this in Supabase SQL Editor
-- =====================================================
-- Issue: Money stolen shows in attack log but isn't actually deducted
-- Root Cause: perform_pvp_attack uses 'bank' column which doesn't exist
--             The correct column name is 'banked_cash'

-- Also the reference to defender.bank needs to be defender.banked_cash


-- =====================================================
-- FIX perform_pvp_attack function
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

    -- Check if defender has shield or VIP protection
    IF EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = defender_id_input 
        AND booster_type IN ('shield', 'vip_pass') 
        AND expires_at > NOW()
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Target is protected by a shield!'
        );
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
            -- FIX: Use banked_cash instead of bank
            vault_stolen := LEAST(
                (COALESCE(defender.banked_cash, 0) * attack_type.vault_steal_percent / 100)::BIGINT,
                (COALESCE(defender.banked_cash, 0) * 0.15)::BIGINT  -- Safe heist capped at 15%
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
        -- FIX: Use banked_cash instead of bank
        UPDATE public.players SET 
            cash = GREATEST(0, cash - cash_stolen),
            banked_cash = GREATEST(0, COALESCE(banked_cash, 0) - vault_stolen),
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
            THEN 'Hit ' || COALESCE(defender.username, 'player') || ' with ' || attack_type.name || '. Stole $' || (cash_stolen + vault_stolen)
            ELSE 'Failed ' || attack_type.name || ' on ' || COALESCE(defender.username, 'player') || '. Lost ' || attacker_respect_loss || ' respect'
         END),
        (defender_id_input, 'attack',
         CASE WHEN attacker_wins THEN 'You Were Attacked!' ELSE 'Attack Defended!' END,
         CASE WHEN attacker_wins 
            THEN COALESCE(attacker.username, 'Someone') || ' hit you with ' || attack_type.name || '. Lost $' || (cash_stolen + vault_stolen)
            ELSE 'Successfully defended against ' || COALESCE(attacker.username, 'someone') || '''s ' || attack_type.name
         END);

    RETURN jsonb_build_object(
        'success', true,
        'result', CASE WHEN attacker_wins THEN 'victory' ELSE 'defeat' END,
        'attack_type', attack_type.name,
        'defender_name', COALESCE(defender.username, 'Unknown'),
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
-- Verify the fix was applied
-- =====================================================
SELECT 'perform_pvp_attack function updated successfully!' as status;
