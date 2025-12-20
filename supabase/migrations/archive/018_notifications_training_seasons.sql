-- =====================================================
-- NOTIFICATIONS, TRAINING, & SEASONS SYSTEMS
-- =====================================================

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
-- Drop existing table if it has wrong schema
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('attack', 'income', 'job', 'family', 'system', 'bounty')),
    title TEXT NOT NULL,
    description TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_player ON public.notifications(player_id);
CREATE INDEX idx_notifications_unread ON public.notifications(player_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view own notifications" ON public.notifications 
    FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "System can insert notifications" ON public.notifications 
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- GAME SEASONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.game_seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    prize_pool TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial season
INSERT INTO public.game_seasons (season_number, name, starts_at, ends_at, prize_pool, is_active) VALUES
    (1, 'Season 1: Rise of the Families', NOW(), NOW() + INTERVAL '30 days', '500 TON', true)
ON CONFLICT (season_number) DO NOTHING;

-- =====================================================
-- NOTIFICATION RPCS
-- =====================================================

-- Get player notifications
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
    
    -- Get notifications
    SELECT COALESCE(json_agg(json_build_object(
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
    ) ORDER BY n.created_at DESC), '[]'::jsonb)
    INTO result
    FROM notifications n
    WHERE n.player_id = target_player_id
    LIMIT limit_count;
    
    RETURN jsonb_build_object(
        'notifications', result,
        'unread_count', unread_count
    );
END;
$$;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    target_player_id UUID,
    notification_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications 
    SET is_read = true 
    WHERE id = notification_id AND player_id = target_player_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications 
    SET is_read = true 
    WHERE player_id = target_player_id AND is_read = false;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Clear all notifications
CREATE OR REPLACE FUNCTION clear_all_notifications(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM notifications WHERE player_id = target_player_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Create notification (helper for other systems)
CREATE OR REPLACE FUNCTION create_notification(
    target_player_id UUID,
    notification_type TEXT,
    notification_title TEXT,
    notification_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (target_player_id, notification_type, notification_title, notification_description)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;

-- =====================================================
-- TRAIN STAT RPC
-- =====================================================
CREATE OR REPLACE FUNCTION train_stat(
    target_player_id UUID,
    stat_name TEXT,
    training_cost BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    current_level INTEGER;
    new_level INTEGER;
    expected_cost BIGINT;
BEGIN
    -- Valid stats
    IF stat_name NOT IN ('strength', 'defense') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid stat name');
    END IF;
    
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Get current level
    IF stat_name = 'strength' THEN
        current_level := player_record.strength;
    ELSE
        current_level := player_record.defense;
    END IF;
    
    -- Calculate expected cost (500 * 1.12^level)
    expected_cost := FLOOR(500 * POWER(1.12, current_level));
    
    -- Verify cost matches (within 10% tolerance for floating point)
    IF training_cost < expected_cost * 0.9 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid training cost');
    END IF;
    
    -- Check if player has enough cash
    IF player_record.cash < training_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient cash');
    END IF;
    
    -- Deduct cash and increment stat
    new_level := current_level + 1;
    
    IF stat_name = 'strength' THEN
        UPDATE players 
        SET cash = cash - training_cost, strength = new_level, updated_at = NOW()
        WHERE id = target_player_id;
    ELSE
        UPDATE players 
        SET cash = cash - training_cost, defense = new_level, updated_at = NOW()
        WHERE id = target_player_id;
    END IF;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (target_player_id, 'training', 'cash', -training_cost, 'Train ' || stat_name || ' to level ' || new_level);
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', stat_name || ' increased to level ' || new_level,
        'new_level', new_level
    );
END;
$$;

-- =====================================================
-- GET CURRENT SEASON RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_season()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    season RECORD;
    days_remaining INTEGER;
BEGIN
    SELECT * INTO season 
    FROM game_seasons 
    WHERE is_active = true 
    ORDER BY season_number DESC 
    LIMIT 1;
    
    IF season IS NULL THEN
        RETURN jsonb_build_object(
            'has_season', false,
            'name', 'Off-Season',
            'days_remaining', 0
        );
    END IF;
    
    days_remaining := GREATEST(0, EXTRACT(DAY FROM season.ends_at - NOW())::INTEGER);
    
    RETURN jsonb_build_object(
        'has_season', true,
        'season_number', season.season_number,
        'name', season.name,
        'starts_at', season.starts_at,
        'ends_at', season.ends_at,
        'days_remaining', days_remaining,
        'prize_pool', season.prize_pool
    );
END;
$$;

-- =====================================================
-- UPDATE ATTACK RPC TO CREATE NOTIFICATIONS
-- =====================================================
-- Note: We'll update the perform_attack RPC to also create notifications
-- This requires finding the existing RPC first

-- Helper to add notification on attack (update your existing attack RPC to call this)
CREATE OR REPLACE FUNCTION notify_attack_result(
    attacker_id UUID,
    defender_id UUID,
    attacker_won BOOLEAN,
    cash_amount BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    attacker_name TEXT;
    defender_name TEXT;
BEGIN
    -- Get names
    SELECT COALESCE(username, first_name, 'Unknown') INTO attacker_name FROM players WHERE id = attacker_id;
    SELECT COALESCE(username, first_name, 'Unknown') INTO defender_name FROM players WHERE id = defender_id;
    
    IF attacker_won THEN
        -- Notify attacker
        PERFORM create_notification(
            attacker_id, 'attack', 
            'Victory!', 
            'You defeated ' || defender_name || ' and stole $' || cash_amount::TEXT
        );
        -- Notify defender
        PERFORM create_notification(
            defender_id, 'attack', 
            'You Were Attacked!', 
            attacker_name || ' attacked you and stole $' || cash_amount::TEXT
        );
    ELSE
        -- Notify attacker
        PERFORM create_notification(
            attacker_id, 'attack', 
            'Attack Failed', 
            defender_name || ' successfully defended against your attack'
        );
        -- Notify defender
        PERFORM create_notification(
            defender_id, 'attack', 
            'Attack Defended!', 
            'You successfully defended against an attack from ' || attacker_name
        );
    END IF;
END;
$$;
