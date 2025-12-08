-- =====================================================
-- FIX: get_notifications type conversion error
-- =====================================================

-- Fix the COALESCE jsonb/json type mismatch
CREATE OR REPLACE FUNCTION get_notifications(
    target_player_id UUID,
    limit_count INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    unread_count INTEGER;
BEGIN
    -- Get unread count
    SELECT COUNT(*) INTO unread_count 
    FROM notifications 
    WHERE player_id = target_player_id AND is_read = false;
    
    -- Get notifications with proper type handling
    SELECT COALESCE(
        (SELECT jsonb_agg(json_build_object(
            'id', n.id,
            'type', n.type,
            'title', n.title,
            'description', n.description,
            'is_read', n.is_read,
            'created_at', n.created_at,
            'time_ago', CASE 
                WHEN NOW() - n.created_at < INTERVAL '1 minute' THEN 'Just now'
                WHEN NOW() - n.created_at < INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM NOW() - n.created_at)::TEXT || 'm ago'
                WHEN NOW() - n.created_at < INTERVAL '1 day' THEN EXTRACT(HOUR FROM NOW() - n.created_at)::TEXT || 'h ago'
                ELSE EXTRACT(DAY FROM NOW() - n.created_at)::TEXT || 'd ago'
            END
        ) ORDER BY n.created_at DESC)
        FROM notifications n
        WHERE n.player_id = target_player_id
        LIMIT limit_count),
        '[]'::jsonb
    )
    INTO result;
    
    RETURN jsonb_build_object(
        'notifications', result,
        'unread_count', unread_count
    );
END;
$$;

-- =====================================================
-- AUTO-CLAIM BUSINESS INCOME FEATURE
-- =====================================================

-- Add auto_collect column to players if not exists
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS auto_collect_businesses BOOLEAN DEFAULT false;

-- RPC to purchase auto-collect (requires TON payment verification)
CREATE OR REPLACE FUNCTION purchase_auto_collect(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Check if already has auto-collect
    IF player_record.auto_collect_businesses = true THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already have Auto-Collector enabled!');
    END IF;
    
    -- Enable auto-collect (TON payment verified externally)
    UPDATE players 
    SET auto_collect_businesses = true, updated_at = NOW()
    WHERE id = target_player_id;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (target_player_id, 'purchase', 'ton', -5, 'Purchased Business Auto-Collector');
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Business Auto-Collector activated! Your businesses will now auto-collect.'
    );
END;
$$;

-- RPC to perform auto-collection (call this from a cron job or scheduled function)
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
    hours_passed INTEGER;
    collection_amount BIGINT;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL OR player_record.auto_collect_businesses = false THEN
        RETURN jsonb_build_object('success', false, 'message', 'Auto-collect not enabled');
    END IF;
    
    -- Loop through all player businesses and collect
    FOR business IN 
        SELECT pb.*, bd.income_per_hour, bd.collection_cooldown_minutes
        FROM player_businesses pb
        JOIN business_definitions bd ON pb.business_id = bd.id
        WHERE pb.player_id = target_player_id
    LOOP
        time_diff := NOW() - business.last_collected;
        hours_passed := GREATEST(1, EXTRACT(EPOCH FROM time_diff) / 3600);
        
        -- Only collect if cooldown passed
        IF EXTRACT(EPOCH FROM time_diff) >= (business.collection_cooldown_minutes * 60) THEN
            collection_amount := business.income_per_hour * hours_passed * business.level;
            total_collected := total_collected + collection_amount;
            
            -- Update last_collected
            UPDATE player_businesses 
            SET last_collected = NOW()
            WHERE id = business.id;
        END IF;
    END LOOP;
    
    -- Add to player cash
    IF total_collected > 0 THEN
        PERFORM increment_cash(target_player_id, total_collected, 'Auto-collected business income');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'collected', total_collected
    );
END;
$$;
