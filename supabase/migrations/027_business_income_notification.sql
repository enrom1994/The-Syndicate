-- =====================================================
-- ADD NOTIFICATION FOR BUSINESS INCOME COLLECTION
-- =====================================================
-- Updates the collect_business_income RPC to also create
-- a notification so it appears in the Activity page.

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
    minutes_passed DOUBLE PRECISION;
    hours_passed DOUBLE PRECISION;
    collected_income BIGINT;
    min_minutes_required INTEGER := 1; -- Minimum 1 minute between collections
BEGIN
    -- 1. Get the player's business with definition details
    SELECT 
        pb.id,
        pb.player_id,
        pb.level,
        pb.last_collected,
        bd.name as business_name,
        bd.base_income_per_hour,
        bd.collect_cooldown_minutes
    INTO business_record
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.id = player_business_id_input AND pb.player_id = player_id_input;

    -- Check if business exists and is owned by player
    IF business_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Business not found or not owned'
        );
    END IF;

    -- 2. Calculate time since last collection
    minutes_passed := EXTRACT(EPOCH FROM (NOW() - business_record.last_collected)) / 60;
    hours_passed := minutes_passed / 60;

    -- 3. Enforce minimum cooldown (at least 1 minute between collections)
    IF minutes_passed < min_minutes_required THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Please wait before collecting again',
            'minutes_remaining', CEIL(min_minutes_required - minutes_passed)
        );
    END IF;

    -- 4. Calculate income based on time passed
    -- Income formula: base_income * level_multiplier * hours_passed
    -- Level multiplier: 1.15^(level-1)
    collected_income := FLOOR(
        business_record.base_income_per_hour * 
        POWER(1.15, business_record.level - 1) * 
        hours_passed
    );

    -- 5. Ensure we have something to collect
    IF collected_income <= 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'No income to collect yet',
            'minutes_passed', FLOOR(minutes_passed)
        );
    END IF;

    -- 6. Credit the player's cash
    UPDATE players 
    SET cash = cash + collected_income 
    WHERE id = player_id_input;

    -- 7. Update the last_collected timestamp
    UPDATE player_businesses 
    SET last_collected = NOW() 
    WHERE id = player_business_id_input;

    -- 8. Log the transaction
    INSERT INTO transactions (player_id, amount, currency, transaction_type, description)
    VALUES (
        player_id_input, 
        collected_income, 
        'cash', 
        'business_income', 
        'Collected from ' || business_record.business_name
    );

    -- 9. Create notification for Activity page
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        player_id_input,
        'income',
        'Business Income',
        'Collected $' || collected_income::TEXT || ' from ' || business_record.business_name
    );

    -- Return success with collection details
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Income collected successfully',
        'amount', collected_income,
        'business_name', business_record.business_name,
        'hours_passed', ROUND(hours_passed::NUMERIC, 2)
    );
END;
$$;
