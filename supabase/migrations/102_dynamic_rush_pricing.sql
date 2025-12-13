-- =====================================================
-- DYNAMIC RUSH PRICING SYSTEM
-- =====================================================
-- Replace flat 5-diamond rush fee with time-based dynamic pricing
-- Cost scales with remaining cooldown time (max 10 diamonds)

CREATE OR REPLACE FUNCTION rush_business_collect(
    player_id_input UUID,
    player_business_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    player_record RECORD;
    business_record RECORD;
    income_amount BIGINT;
    has_income_boost BOOLEAN := false;
    time_remaining_minutes NUMERIC;
    cooldown_minutes INTEGER;
    diamond_cost INTEGER;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = player_id_input;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Get business with definition
    SELECT pb.*, bd.name as business_name, bd.base_income_per_hour, bd.collect_cooldown_minutes
    INTO business_record
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.id = player_business_id_input AND pb.player_id = player_id_input;
    
    IF business_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found');
    END IF;
    
    -- Calculate time remaining in minutes
    cooldown_minutes := business_record.collect_cooldown_minutes;
    time_remaining_minutes := cooldown_minutes - EXTRACT(EPOCH FROM (NOW() - business_record.last_collected)) / 60;
    
    -- If already ready to collect, no need to rush
    IF time_remaining_minutes <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business is ready to collect. No rush needed!');
    END IF;
    
    -- Calculate dynamic diamond cost
    -- Formula: (time_remaining / cooldown) * 10, minimum 1 diamond
    diamond_cost := GREATEST(1, CEIL((time_remaining_minutes / cooldown_minutes::NUMERIC) * 10));
    
    -- Check diamonds
    IF player_record.diamonds < diamond_cost THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Not enough diamonds (need ' || diamond_cost || ')',
            'required_diamonds', diamond_cost
        );
    END IF;
    
    -- Calculate income (1 hour worth)
    income_amount := business_record.base_income_per_hour;
    
    -- Check for 2x income booster
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = player_id_input 
        AND booster_type = '2x_income' 
        AND expires_at > NOW()
    ) INTO has_income_boost;
    
    IF has_income_boost THEN
        income_amount := income_amount * 2;
    END IF;
    
    -- Deduct diamonds
    UPDATE players 
    SET diamonds = diamonds - diamond_cost,
        cash = cash + income_amount
    WHERE id = player_id_input;
    
    -- Update last_collected to now (so normal collect resets cooldown)
    UPDATE player_businesses 
    SET last_collected = NOW()
    WHERE id = player_business_id_input;
    
    -- Log transactions
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES 
        (player_id_input, 'rush_collect', 'diamonds', -diamond_cost, 'Rush collected ' || business_record.business_name),
        (player_id_input, 'business_income', 'cash', income_amount, 'Rush income from ' || business_record.business_name);
    
    -- Create notification
    PERFORM create_notification(
        player_id_input,
        'business',
        'Rush Collect!',
        'Collected $' || income_amount::TEXT || ' from ' || business_record.business_name || ' (' || diamond_cost || '💎)'
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rush collected $' || income_amount || '!',
        'income_collected', income_amount,
        'diamonds_spent', diamond_cost,
        'had_boost', has_income_boost,
        'time_saved_minutes', ROUND(time_remaining_minutes)
    );
END;
$$;

COMMENT ON FUNCTION rush_business_collect IS 'Rush collect business income with dynamic diamond pricing based on time remaining';
