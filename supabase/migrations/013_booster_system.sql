-- =====================================================
-- BOOSTER DEFINITIONS AND FIX BOOSTER SYSTEM
-- =====================================================

-- Create booster definitions table
CREATE TABLE IF NOT EXISTS public.booster_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booster_type TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    diamond_cost INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.booster_definitions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read booster definitions" ON public.booster_definitions FOR SELECT USING (true);

-- Insert booster definitions (matching ShopPage)
INSERT INTO public.booster_definitions (booster_type, name, description, diamond_cost, duration_minutes, icon)
VALUES
    ('2x_income', '2x Income', 'Double business income for the duration', 50, 1440, '/images/boosters/2x_income.png'),
    ('2x_attack', '2x Attack', 'Double attack power in combat', 30, 720, '/images/boosters/2x_attack.png'),
    ('shield', 'Shield', 'Immune to attacks from other players', 100, 360, '/images/boosters/shield.png'),
    ('vip_pass', 'VIP Pass', 'All bonuses active - 2x income, 2x attack, and shield', 200, 1440, '/images/boosters/vip.png')
ON CONFLICT (booster_type) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    diamond_cost = EXCLUDED.diamond_cost,
    duration_minutes = EXCLUDED.duration_minutes;

-- Function to activate a booster
CREATE OR REPLACE FUNCTION activate_booster(
    player_id_input UUID,
    booster_type_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booster_def RECORD;
    current_diamonds INTEGER;
BEGIN
    -- Get booster definition
    SELECT * INTO booster_def 
    FROM booster_definitions 
    WHERE booster_type = booster_type_input;
    
    IF booster_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid booster type');
    END IF;
    
    -- Check diamonds
    SELECT diamonds INTO current_diamonds 
    FROM players 
    WHERE id = player_id_input;
    
    IF current_diamonds < booster_def.diamond_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds');
    END IF;
    
    -- Deduct diamonds
    UPDATE players 
    SET diamonds = diamonds - booster_def.diamond_cost, updated_at = NOW()
    WHERE id = player_id_input;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'booster_purchase', 'diamonds', -booster_def.diamond_cost, 
            'Activated ' || booster_def.name);
    
    -- Add booster (replace if exists with newer expiry)
    INSERT INTO player_boosters (player_id, booster_type, expires_at)
    VALUES (
        player_id_input, 
        booster_type_input, 
        NOW() + (booster_def.duration_minutes || ' minutes')::INTERVAL
    )
    ON CONFLICT (player_id, booster_type) 
    DO UPDATE SET 
        expires_at = GREATEST(
            player_boosters.expires_at, 
            NOW() + (booster_def.duration_minutes || ' minutes')::INTERVAL
        ),
        activated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', booster_def.name || ' activated!',
        'expires_at', NOW() + (booster_def.duration_minutes || ' minutes')::INTERVAL
    );
END;
$$;

-- Add unique constraint for player+booster_type if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'player_boosters_player_id_booster_type_key'
    ) THEN
        ALTER TABLE player_boosters 
        ADD CONSTRAINT player_boosters_player_id_booster_type_key 
        UNIQUE (player_id, booster_type);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Update get_player_stats to include booster effects
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
    has_attack_boost BOOLEAN;
    has_vip BOOLEAN;
BEGIN
    -- Base Stats (use strength column)
    SELECT COALESCE(strength, 10), COALESCE(defense, 10) INTO base_atk, base_def
    FROM players
    WHERE id = target_player_id;

    -- Item Bonuses (only equipped)
    SELECT 
        COALESCE(SUM(id.attack_bonus), 0),
        COALESCE(SUM(id.defense_bonus), 0)
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

    -- Check for active boosters
    SELECT EXISTS(
        SELECT 1 FROM player_boosters 
        WHERE player_id = target_player_id 
        AND booster_type = '2x_attack' 
        AND expires_at > NOW()
    ) INTO has_attack_boost;
    
    SELECT EXISTS(
        SELECT 1 FROM player_boosters 
        WHERE player_id = target_player_id 
        AND booster_type = 'vip_pass' 
        AND expires_at > NOW()
    ) INTO has_vip;

    -- Calculate totals
    total_attack := COALESCE(base_atk, 10) + COALESCE(item_atk, 0) + COALESCE(crew_atk, 0);
    total_defense := COALESCE(base_def, 10) + COALESCE(item_def, 0) + COALESCE(crew_def, 0);
    
    -- Apply attack boost (2x_attack or VIP)
    IF has_attack_boost OR has_vip THEN
        total_attack := total_attack * 2;
    END IF;

    RETURN QUERY SELECT total_attack, total_defense;
END;
$$;

-- Update perform_attack to respect shield booster
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
    defender_has_shield BOOLEAN;
    defender_has_vip BOOLEAN;
    STAMINA_COST CONSTANT INTEGER := 10;
    current_stamina INTEGER;
BEGIN
    -- 1. Check Stamina
    SELECT stamina INTO current_stamina FROM players WHERE id = attacker_id_input;
    
    IF current_stamina < STAMINA_COST THEN
         RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;

    -- 2. Check if defender has shield or VIP
    SELECT EXISTS(
        SELECT 1 FROM player_boosters 
        WHERE player_id = defender_id_input 
        AND booster_type = 'shield' 
        AND expires_at > NOW()
    ) INTO defender_has_shield;
    
    SELECT EXISTS(
        SELECT 1 FROM player_boosters 
        WHERE player_id = defender_id_input 
        AND booster_type = 'vip_pass' 
        AND expires_at > NOW()
    ) INTO defender_has_vip;
    
    IF defender_has_shield OR defender_has_vip THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Target is protected by a shield!'
        );
    END IF;

    -- Deduct Stamina
    UPDATE players 
    SET stamina = stamina - STAMINA_COST, updated_at = NOW() 
    WHERE id = attacker_id_input;

    -- 3. Calculate Power (get_player_stats now includes booster effects)
    SELECT * INTO attacker_stats FROM get_player_stats(attacker_id_input);
    SELECT * INTO defender_stats FROM get_player_stats(defender_id_input);

    -- Add Randomness (+/- 20% variance)
    attacker_final_power := attacker_stats.total_attack + FLOOR(RANDOM() * 20);
    defender_final_power := defender_stats.total_defense + FLOOR(RANDOM() * 20);

    is_victory := attacker_final_power > defender_final_power;

    -- 4. Handle Result
    IF is_victory THEN
        -- Get Defender Cash to steal
        SELECT cash INTO defender_cash FROM players WHERE id = defender_id_input;
        
        -- Steal 10-20% of liquid cash
        loot_amount := FLOOR(defender_cash * (0.10 + (RANDOM() * 0.10)));
        respect_gain := 25 + FLOOR(RANDOM() * 25); -- 25-50 Respect

        -- Transfer Cash
        UPDATE players SET cash = cash - loot_amount WHERE id = defender_id_input;
        UPDATE players SET 
            cash = cash + loot_amount,
            respect = respect + respect_gain,
            total_kills = total_kills + 1,
            total_attacks = total_attacks + 1,
            total_attacks_won = total_attacks_won + 1
        WHERE id = attacker_id_input;

        -- Log Attack
        INSERT INTO attack_log (attacker_id, defender_id, attacker_won, cash_transferred, respect_gained)
        VALUES (attacker_id_input, defender_id_input, true, loot_amount, respect_gain);

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
        -- Loss - just increment attack counter
        UPDATE players SET total_attacks = total_attacks + 1 WHERE id = attacker_id_input;

        INSERT INTO attack_log (attacker_id, defender_id, attacker_won)
        VALUES (attacker_id_input, defender_id_input, false);

        RETURN jsonb_build_object(
            'success', true,
            'result', 'defeat',
            'cash_stolen', 0,
            'respect_gained', 0,
            'attacker_power', attacker_final_power,
            'defender_power', defender_final_power
        );
    END IF;
END;
$$;

-- Function to get active boosters for a player
CREATE OR REPLACE FUNCTION get_active_boosters(player_id_input UUID)
RETURNS TABLE (
    booster_type TEXT,
    name TEXT,
    expires_at TIMESTAMPTZ,
    minutes_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pb.booster_type,
        bd.name,
        pb.expires_at,
        GREATEST(0, EXTRACT(EPOCH FROM (pb.expires_at - NOW())) / 60)::INTEGER as minutes_remaining
    FROM player_boosters pb
    JOIN booster_definitions bd ON pb.booster_type = bd.booster_type
    WHERE pb.player_id = player_id_input
    AND pb.expires_at > NOW();
END;
$$;
