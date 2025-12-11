-- =====================================================
-- BUSINESS REPAIR SYSTEM
-- =====================================================
-- Allows players to repair "broken" businesses

CREATE OR REPLACE FUNCTION repair_business(
    repairer_id UUID,
    target_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_cash BIGINT;
    business_status TEXT;
    business_name TEXT;
    repair_cost INTEGER := 5000; -- $5,000 repair cost
BEGIN
    -- Get player's cash balance
    SELECT cash INTO p_cash
    FROM players
    WHERE id = repairer_id;
    
    IF p_cash IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found.');
    END IF;
    
    -- Check if player owns this business and get its status
    SELECT pb.status, bd.name
    INTO business_status, business_name
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.player_id = repairer_id 
      AND pb.id = target_business_id;
    
    IF business_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You do not own this business.');
    END IF;
    
    -- Check if business is actually broken
    IF business_status != 'broken' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This business is already operational.');
    END IF;
    
    -- Check if player has enough cash
    IF p_cash < repair_cost THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Not enough cash. Repair costs $' || repair_cost::TEXT || '.'
        );
    END IF;
    
    -- Deduct repair cost
    UPDATE players
    SET cash = cash - repair_cost,
        updated_at = NOW()
    WHERE id = repairer_id;
    
    -- Repair the business (set status to 'active')
    UPDATE player_businesses
    SET status = 'active',
        last_collected = NOW() -- Reset collection timer
    WHERE id = target_business_id
      AND player_id = repairer_id;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (repairer_id, 'repair_business', 'cash', -repair_cost, 'Repaired ' || business_name);
    
    -- Create notification
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        repairer_id,
        'reward',
        'Business Repaired!',
        'Your ' || business_name || ' is now operational and generating income.'
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', business_name || ' has been repaired and is now operational!',
        'cost', repair_cost,
        'business', business_name
    );
END;
$$;
