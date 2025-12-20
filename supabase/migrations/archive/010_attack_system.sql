-- =====================================================
-- SECURE PVP ATTACK SYSTEM
-- =====================================================

-- 1. Helper: Calculate Total Stats (Base + Items + Crew)
CREATE OR REPLACE FUNCTION get_player_stats(target_player_id UUID)
RETURNS TABLE (
    total_attack INTEGER,
    total_defense INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    base_atk INTEGER;
    base_def INTEGER;
    item_atk INTEGER;
    item_def INTEGER;
    crew_atk INTEGER;
    crew_def INTEGER;
BEGIN
    -- Base Stats
    SELECT attack, defense INTO base_atk, base_def
    FROM players
    WHERE id = target_player_id;

    -- Item Bonuses (Equipped Only)
    SELECT 
        COALESCE(SUM(id.attack_bonus * pi.quantity), 0),
        COALESCE(SUM(id.defense_bonus * pi.quantity), 0)
    INTO item_atk, item_def
    FROM player_inventory pi
    JOIN item_definitions id ON pi.item_id = id.id
    WHERE pi.player_id = target_player_id AND pi.is_equipped = true;

    -- Crew Bonuses
    SELECT 
        COALESCE(SUM(cd.attack_bonus * pc.quantity), 0),
        COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)
    INTO crew_atk, crew_def
    FROM player_crew pc
    JOIN crew_definitions cd ON pc.crew_id = cd.id
    WHERE pc.player_id = target_player_id;

    total_attack := COALESCE(base_atk, 10) + item_atk + crew_atk;
    total_defense := COALESCE(base_def, 10) + item_def + crew_def;

    RETURN QUERY SELECT total_attack, total_defense;
END;
$$;


-- 2. Main Attack RPC
CREATE OR REPLACE FUNCTION perform_attack(
    attacker_id_input UUID,
    defender_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    attacker_stats RECORD;
    defender_stats RECORD;
    attacker_final_power INTEGER;
    defender_final_power INTEGER;
    is_victory BOOLEAN;
    loot_amount BIGINT;
    respect_gain INTEGER;
    defender_cash BIGINT;
    STAMINA_COST CONSTANT INTEGER := 10;
    current_stamina INTEGER;
BEGIN
    -- 1. Check Stamina
    SELECT stamina INTO current_stamina FROM players WHERE id = attacker_id_input;
    
    IF current_stamina < STAMINA_COST THEN
         RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;

    -- Deduct Stamina
    UPDATE players 
    SET stamina = stamina - STAMINA_COST, updated_at = NOW() 
    WHERE id = attacker_id_input;

    -- 2. Calculate Power
    SELECT * INTO attacker_stats FROM get_player_stats(attacker_id_input);
    SELECT * INTO defender_stats FROM get_player_stats(defender_id_input);

    -- Add Randomness (+/- 20% variance effectively)
    -- We add a random roll from 0 to 20 to the raw stat
    attacker_final_power := attacker_stats.total_attack + FLOOR(RANDOM() * 20);
    defender_final_power := defender_stats.total_defense + FLOOR(RANDOM() * 20);

    is_victory := attacker_final_power > defender_final_power;

    -- 3. Handle Result
    IF is_victory THEN
        -- Get Defender Cash to steal
        SELECT cash INTO defender_cash FROM players WHERE id = defender_id_input;
        
        -- Steal 10-20% of liquid cash
        loot_amount := FLOOR(defender_cash * (0.10 + (RANDOM() * 0.10)));
        respect_gain := 25 + FLOOR(RANDOM() * 25); -- 25-50 Respect

        -- Transfer Cash (Safe math)
        UPDATE players SET cash = cash - loot_amount WHERE id = defender_id_input;
        UPDATE players SET 
            cash = cash + loot_amount,
            respect = respect + respect_gain,
            total_kills = total_kills + 1,
            total_attacks_won = total_attacks_won + 1
        WHERE id = attacker_id_input;

        -- Log
        INSERT INTO attack_log (attacker_id, defender_id, result, cash_stolen, respect_gained)
        VALUES (attacker_id_input, defender_id_input, 'win', loot_amount, respect_gain);

        -- Transaction Log
        INSERT INTO transactions (player_id, amount, currency, transaction_type, description)
        VALUES (attacker_id_input, loot_amount, 'cash', 'pvp_attack', 'Attacked and robbed a rival.');

        RETURN jsonb_build_object(
            'success', true,
            'result', 'victory',
            'cash_stolen', loot_amount,
            'respect_gained', respect_gain,
            'attacker_power', attacker_final_power,
            'defender_power', defender_final_power
        );
    ELSE
        -- Loss Penalty (Lose 5% cash, Lose Respect)
        DECLARE
            attacker_cash BIGINT;
            loss_amount BIGINT;
            respect_loss INTEGER;
        BEGIN
            SELECT cash INTO attacker_cash FROM players WHERE id = attacker_id_input;
            loss_amount := FLOOR(attacker_cash * 0.05);
            respect_loss := 10 + FLOOR(RANDOM() * 10); -- 10-20 Respect Loss

            UPDATE players SET 
                cash = GREATEST(0, cash - loss_amount),
                respect = GREATEST(0, respect - respect_loss)
            WHERE id = attacker_id_input;

            -- Log
            INSERT INTO attack_log (attacker_id, defender_id, result, cash_stolen, respect_gained)
            VALUES (attacker_id_input, defender_id_input, 'loss', 0, -respect_loss);

             RETURN jsonb_build_object(
                'success', true,
                'result', 'defeat',
                'cash_lost', loss_amount,
                'respect_lost', respect_loss,
                'attacker_power', attacker_final_power,
                'defender_power', defender_final_power
            );
        END;
    END IF;
END;
$$;
