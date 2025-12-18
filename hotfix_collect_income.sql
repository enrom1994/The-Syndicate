-- =====================================================
-- HOTFIX: collect_business_income return field mismatch
-- =====================================================
-- BUG: Frontend expects 'amount' but RPC was returning 'income'
-- Result: "Nothing to collect" message even when income was available
-- =====================================================

SET search_path = public;

-- Drop existing function
DROP FUNCTION IF EXISTS collect_business_income(UUID, UUID);

-- Recreate with correct return fields (amount + income for compatibility)
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
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = player_id_input 
        AND booster_type = '2x_income' 
        AND expires_at > NOW()
    ) INTO has_income_boost;
    
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

    -- Return with BOTH 'amount' (for frontend) and 'income' (for compatibility)
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Income collected!',
        'amount', final_income,
        'income', final_income,
        'base_income', base_income,
        'boosted', has_income_boost,
        'hours_accumulated', ROUND(hours_elapsed, 1)
    );
END;
$$;

COMMENT ON FUNCTION collect_business_income(UUID, UUID) IS 'Gameplay: Collects income with cooldowns and boosters. Returns amount for frontend compatibility.';
