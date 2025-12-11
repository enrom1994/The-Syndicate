-- =====================================================
-- BOUNTY PRICE ADJUSTMENT
-- =====================================================
-- Reduces bounty placement cost from 1000 to 150 diamonds
-- for better game balance and accessibility.

CREATE OR REPLACE FUNCTION place_bounty(
    placer_id UUID,
    target_id UUID,
    amount BIGINT,
    hours_duration INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    diamond_cost INTEGER := 150;  -- Changed from 1000
    min_bounty BIGINT := 10000;
    max_active INTEGER := 2;
    placer_diamonds INTEGER;
    placer_cash BIGINT;
    active_bounties INTEGER;
    target_player RECORD;
BEGIN
    -- Validate hours (3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48)
    IF hours_duration < 3 OR hours_duration > 48 OR (hours_duration % 3) != 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid duration. Choose 3-48 hours in 3-hour intervals.');
    END IF;
    
    -- Check minimum bounty
    IF amount < min_bounty THEN
        RETURN jsonb_build_object('success', false, 'message', 'Minimum bounty is $10,000.');
    END IF;
    
    -- Can't place bounty on yourself
    IF placer_id = target_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You cannot place a bounty on yourself.');
    END IF;
    
    -- Check target exists
    SELECT * INTO target_player FROM players WHERE id = target_id;
    IF target_player IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target player not found.');
    END IF;
    
    -- Check if target already has active bounty on them
    IF EXISTS (SELECT 1 FROM bounties WHERE target_player_id = target_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'message', 'This player already has an active bounty on them.');
    END IF;
    
    -- Check placer's resources
    SELECT diamonds, cash INTO placer_diamonds, placer_cash FROM players WHERE id = placer_id;
    
    IF placer_diamonds < diamond_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'You need 150 diamonds to place a bounty.');
    END IF;
    
    IF placer_cash < amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient cash for bounty amount.');
    END IF;
    
    -- Check active bounty limit
    SELECT COUNT(*) INTO active_bounties 
    FROM bounties 
    WHERE placed_by_player_id = placer_id AND status = 'active';
    
    IF active_bounties >= max_active THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only have 2 active bounties at a time.');
    END IF;
    
    -- Deduct resources
    UPDATE players 
    SET diamonds = diamonds - diamond_cost, cash = cash - amount, updated_at = NOW()
    WHERE id = placer_id;
    
    -- Create bounty
    INSERT INTO bounties (target_player_id, placed_by_player_id, bounty_amount, bounty_type, expires_at)
    VALUES (target_id, placer_id, amount, 'player', NOW() + (hours_duration * INTERVAL '1 hour'));
    
    -- Log transactions
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES 
        (placer_id, 'bounty_fee', 'diamonds', -diamond_cost, 'Bounty placement fee'),
        (placer_id, 'bounty_placed', 'cash', -amount, 'Bounty on ' || COALESCE(target_player.username, target_player.first_name));
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Bounty placed on ' || COALESCE(target_player.username, target_player.first_name) || ' for $' || amount
    );
END;
$$;
