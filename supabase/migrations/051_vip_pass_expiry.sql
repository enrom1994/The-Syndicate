-- =====================================================
-- VIP PASS (BUSINESS AUTO-COLLECTOR) - 7-DAY EXPIRY
-- =====================================================
-- Converts the permanent auto_collect_businesses boolean to
-- an expiry-based VIP Pass system with stacking support.

-- =====================================================
-- 1. ADD EXPIRY COLUMN TO PLAYERS
-- =====================================================
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS auto_collect_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient expiry checks
CREATE INDEX IF NOT EXISTS idx_players_auto_collect_expires 
ON public.players(auto_collect_expires_at) 
WHERE auto_collect_expires_at IS NOT NULL;


-- =====================================================
-- 2. HELPER FUNCTION: Check if VIP is active
-- =====================================================
CREATE OR REPLACE FUNCTION is_vip_active(target_player_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expires_at TIMESTAMPTZ;
BEGIN
    SELECT auto_collect_expires_at INTO expires_at
    FROM players
    WHERE id = target_player_id;
    
    RETURN expires_at IS NOT NULL AND expires_at > NOW();
END;
$$;


-- =====================================================
-- 3. UPDATE PURCHASE_AUTO_COLLECT RPC
-- =====================================================
-- Now sets 7-day expiry with stacking support
CREATE OR REPLACE FUNCTION purchase_auto_collect(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    current_expiry TIMESTAMPTZ;
    new_expiry TIMESTAMPTZ;
    vip_duration INTERVAL := INTERVAL '7 days';
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    current_expiry := player_record.auto_collect_expires_at;
    
    -- Calculate new expiry with stacking
    IF current_expiry IS NOT NULL AND current_expiry > NOW() THEN
        -- Stack: add 7 days to remaining time
        new_expiry := current_expiry + vip_duration;
    ELSE
        -- New purchase: 7 days from now
        new_expiry := NOW() + vip_duration;
    END IF;
    
    -- Update player with new expiry and set boolean to true
    UPDATE players 
    SET auto_collect_businesses = true,
        auto_collect_expires_at = new_expiry,
        updated_at = NOW()
    WHERE id = target_player_id;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (target_player_id, 'purchase', 'ton', -5, 'Purchased VIP Pass (7-day Auto-Collector)');
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'VIP Pass activated! Your businesses will now auto-collect.',
        'expires_at', new_expiry,
        'days_remaining', EXTRACT(DAY FROM (new_expiry - NOW()))::INTEGER
    );
END;
$$;


-- =====================================================
-- 4. UPDATE AUTO_COLLECT_ALL_BUSINESSES RPC
-- =====================================================
-- Now checks expiry timestamp instead of just boolean
CREATE OR REPLACE FUNCTION auto_collect_all_businesses(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    total_collected BIGINT := 0;
    business RECORD;
    time_diff INTERVAL;
    hours_passed NUMERIC;
    collection_amount BIGINT;
    has_income_boost BOOLEAN;
    boost_multiplier INTEGER := 1;
BEGIN
    -- Get player and check VIP status
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    
    -- Check if VIP is active (using expiry, not just boolean)
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    IF player_record.auto_collect_expires_at IS NULL OR player_record.auto_collect_expires_at <= NOW() THEN
        -- VIP expired - disable the boolean flag
        UPDATE players SET auto_collect_businesses = false WHERE id = target_player_id;
        RETURN jsonb_build_object('success', false, 'message', 'VIP Pass expired');
    END IF;
    
    -- Check for 2x income booster
    SELECT EXISTS(
        SELECT 1 FROM player_boosters 
        WHERE player_id = target_player_id 
        AND booster_type = '2x_income' 
        AND expires_at > NOW()
    ) INTO has_income_boost;
    
    IF has_income_boost THEN
        boost_multiplier := 2;
    END IF;
    
    -- Loop through all player businesses and collect
    FOR business IN 
        SELECT pb.*, bd.base_income_per_hour, bd.collect_cooldown_minutes, bd.name as business_name
        FROM player_businesses pb
        JOIN business_definitions bd ON pb.business_id = bd.id
        WHERE pb.player_id = target_player_id
    LOOP
        time_diff := NOW() - COALESCE(business.last_collected, business.created_at);
        hours_passed := GREATEST(1, EXTRACT(EPOCH FROM time_diff) / 3600);
        
        -- Cap at 24 hours
        hours_passed := LEAST(24, hours_passed);
        
        -- Only collect if cooldown passed (default 60 min if not set)
        IF EXTRACT(EPOCH FROM time_diff) >= (COALESCE(business.collect_cooldown_minutes, 60) * 60) THEN
            collection_amount := (business.base_income_per_hour * hours_passed * business.level * boost_multiplier)::BIGINT;
            total_collected := total_collected + collection_amount;
            
            -- Update last_collected
            UPDATE player_businesses 
            SET last_collected = NOW()
            WHERE id = business.id;
        END IF;
    END LOOP;
    
    -- Add to player cash
    IF total_collected > 0 THEN
        PERFORM increment_cash(target_player_id, total_collected, 
            'VIP Auto-Collected' || CASE WHEN has_income_boost THEN ' (2x BOOST!)' ELSE '' END);
        
        -- Create notification
        INSERT INTO notifications (player_id, type, title, description)
        VALUES (target_player_id, 'income', 'VIP Auto-Collect', 
            'Collected $' || to_char(total_collected, 'FM999,999,999') || ' from your businesses');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'collected', total_collected,
        'boosted', has_income_boost,
        'vip_expires_at', player_record.auto_collect_expires_at
    );
END;
$$;


-- =====================================================
-- 5. UPDATE RUN_AUTO_COLLECT_FOR_ALL (CRON FUNCTION)
-- =====================================================
-- Now uses expiry timestamp check
CREATE OR REPLACE FUNCTION run_auto_collect_for_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    total_players INTEGER := 0;
    total_collected BIGINT := 0;
    player_collection JSONB;
BEGIN
    -- Loop through all players with active VIP (using expiry check)
    FOR player_record IN 
        SELECT id FROM players 
        WHERE auto_collect_expires_at IS NOT NULL 
        AND auto_collect_expires_at > NOW()
    LOOP
        SELECT auto_collect_all_businesses(player_record.id) INTO player_collection;
        
        IF (player_collection->>'success')::boolean THEN
            total_collected := total_collected + COALESCE((player_collection->>'collected')::bigint, 0);
            total_players := total_players + 1;
        END IF;
    END LOOP;
    
    -- Log the run
    RAISE NOTICE 'VIP Auto-collect completed: % players, $% total', total_players, total_collected;
END;
$$;


-- =====================================================
-- 6. GET VIP STATUS RPC (for frontend)
-- =====================================================
CREATE OR REPLACE FUNCTION get_vip_status(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    time_remaining INTERVAL;
BEGIN
    SELECT auto_collect_expires_at INTO player_record
    FROM players
    WHERE id = target_player_id;
    
    IF player_record.auto_collect_expires_at IS NULL OR player_record.auto_collect_expires_at <= NOW() THEN
        RETURN jsonb_build_object(
            'is_active', false,
            'expires_at', NULL,
            'days_remaining', 0,
            'hours_remaining', 0
        );
    END IF;
    
    time_remaining := player_record.auto_collect_expires_at - NOW();
    
    RETURN jsonb_build_object(
        'is_active', true,
        'expires_at', player_record.auto_collect_expires_at,
        'days_remaining', EXTRACT(DAY FROM time_remaining)::INTEGER,
        'hours_remaining', EXTRACT(HOUR FROM time_remaining)::INTEGER
    );
END;
$$;


-- =====================================================
-- 7. MIGRATE EXISTING VIP USERS
-- =====================================================
-- Give existing permanent VIP users 30 days as a grace period
UPDATE players 
SET auto_collect_expires_at = NOW() + INTERVAL '30 days'
WHERE auto_collect_businesses = true 
AND auto_collect_expires_at IS NULL;


-- Add comments
COMMENT ON COLUMN players.auto_collect_expires_at IS 'VIP Pass expiry timestamp - NULL means no VIP';
COMMENT ON FUNCTION is_vip_active IS 'Returns true if player has active VIP Pass';
COMMENT ON FUNCTION get_vip_status IS 'Returns VIP status with time remaining for frontend display';
