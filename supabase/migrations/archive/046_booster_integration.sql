-- =====================================================
-- BOOSTER INTEGRATION
-- =====================================================
-- Add booster checks to key RPCs

-- 1. Helper function to check active boosters
CREATE OR REPLACE FUNCTION has_active_booster(player_id_input UUID, booster_type_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = player_id_input 
        AND booster_type = booster_type_input 
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Get all active boosters for a player
CREATE OR REPLACE FUNCTION get_active_boosters(player_id_input UUID)
RETURNS TABLE (
    booster_type TEXT,
    expires_at TIMESTAMPTZ,
    time_remaining_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pb.booster_type,
        pb.expires_at,
        GREATEST(0, EXTRACT(EPOCH FROM (pb.expires_at - NOW())) / 60)::INTEGER as time_remaining_minutes
    FROM player_boosters pb
    WHERE pb.player_id = player_id_input
    AND pb.expires_at > NOW()
    ORDER BY pb.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Activate a booster (for future shop purchases)
CREATE OR REPLACE FUNCTION activate_booster(
    player_id_input UUID,
    booster_type_input TEXT,
    duration_hours INTEGER DEFAULT 24
)
RETURNS JSONB AS $$
DECLARE
    existing_booster RECORD;
    new_expires TIMESTAMPTZ;
BEGIN
    -- Check for existing booster of same type
    SELECT * INTO existing_booster
    FROM player_boosters
    WHERE player_id = player_id_input
    AND booster_type = booster_type_input
    AND expires_at > NOW();
    
    IF existing_booster IS NOT NULL THEN
        -- Extend existing booster
        new_expires := existing_booster.expires_at + (duration_hours || ' hours')::INTERVAL;
        
        UPDATE player_boosters
        SET expires_at = new_expires
        WHERE id = existing_booster.id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Booster extended!',
            'expires_at', new_expires,
            'extended', true
        );
    ELSE
        -- Create new booster
        new_expires := NOW() + (duration_hours || ' hours')::INTERVAL;
        
        INSERT INTO player_boosters (player_id, booster_type, expires_at)
        VALUES (player_id_input, booster_type_input, new_expires);
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Booster activated!',
            'expires_at', new_expires,
            'extended', false
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Update collect_business to apply 2x_income booster
-- First, find and recreate the collect_business function with booster support
CREATE OR REPLACE FUNCTION collect_business_income(
    player_id_input UUID,
    player_business_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    business_record RECORD;
    hours_elapsed NUMERIC;
    base_income BIGINT;
    final_income BIGINT;
    has_income_boost BOOLEAN;
    cooldown_minutes INTEGER;
    remaining_cooldown INTEGER;
BEGIN
    -- Get business details
    SELECT pb.*, bd.base_income_per_hour, bd.collect_cooldown_minutes, bd.name as business_name
    INTO business_record
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.id = player_business_id_input AND pb.player_id = player_id_input;

    IF business_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found or not owned');
    END IF;

    cooldown_minutes := COALESCE(business_record.collect_cooldown_minutes, 60);
    
    -- Check cooldown
    IF business_record.last_collected > NOW() - (cooldown_minutes || ' minutes')::INTERVAL THEN
        remaining_cooldown := EXTRACT(EPOCH FROM (
            business_record.last_collected + (cooldown_minutes || ' minutes')::INTERVAL - NOW()
        ))::INTEGER / 60;
        
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Cooldown active',
            'minutes_remaining', remaining_cooldown
        );
    END IF;

    -- Calculate hours elapsed (capped at 24 hours)
    hours_elapsed := LEAST(24, EXTRACT(EPOCH FROM (NOW() - business_record.last_collected)) / 3600);
    
    -- Calculate base income
    base_income := (business_record.base_income_per_hour * business_record.level * hours_elapsed)::BIGINT;
    
    -- Check for 2x income booster
    has_income_boost := has_active_booster(player_id_input, '2x_income');
    
    IF has_income_boost THEN
        final_income := base_income * 2;
    ELSE
        final_income := base_income;
    END IF;

    -- Update player cash and last_collected
    UPDATE players SET cash = cash + final_income WHERE id = player_id_input;
    UPDATE player_businesses SET last_collected = NOW() WHERE id = player_business_id_input;

    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'business_income', 'cash', final_income, 
            'Collected from ' || business_record.business_name || 
            CASE WHEN has_income_boost THEN ' (2x BOOST!)' ELSE '' END);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Income collected!',
        'income', final_income,
        'base_income', base_income,
        'boosted', has_income_boost,
        'hours_accumulated', ROUND(hours_elapsed, 1)
    );
END;
$$;


-- 5. Note: PvP attack booster integration would require modifying perform_pvp_attack
-- This is documented but should be done carefully to avoid breaking existing logic
-- Key changes needed:
--   - Check has_active_booster(attacker_id, '2x_attack') → multiply attacker_strength by 2
--   - Check has_active_booster(defender_id, 'shield') → block attack entirely

COMMENT ON FUNCTION has_active_booster IS 'Returns true if player has an active booster of the specified type';
COMMENT ON FUNCTION get_active_boosters IS 'Returns all active boosters for a player with time remaining';
COMMENT ON FUNCTION activate_booster IS 'Activates or extends a booster for the specified duration';
COMMENT ON FUNCTION collect_business_income IS 'Collects business income with 2x_income booster support';
