-- =====================================================
-- ACHIEVEMENTS SYSTEM RPC FUNCTIONS
-- =====================================================

-- Function to get player achievements with definitions
CREATE OR REPLACE FUNCTION get_player_achievements(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    achievements_array JSONB;
BEGIN
    SELECT json_agg(json_build_object(
        'id', ad.id,
        'name', ad.name,
        'description', ad.description,
        'category', ad.category,
        'target_value', ad.target_value,
        'reward_type', ad.reward_type,
        'reward_amount', ad.reward_amount,
        'icon', ad.icon,
        'progress', COALESCE(pa.progress, 0),
        'is_unlocked', COALESCE(pa.is_unlocked, false),
        'is_claimed', COALESCE(pa.is_claimed, false),
        'unlocked_at', pa.unlocked_at,
        'claimed_at', pa.claimed_at
    ) ORDER BY 
        CASE WHEN COALESCE(pa.is_unlocked, false) AND NOT COALESCE(pa.is_claimed, false) THEN 0
             WHEN NOT COALESCE(pa.is_unlocked, false) THEN 1
             ELSE 2 END,
        ad.category, ad.name
    )
    INTO achievements_array
    FROM achievement_definitions ad
    LEFT JOIN player_achievements pa ON pa.achievement_id = ad.id AND pa.player_id = target_player_id;
    
    RETURN COALESCE(achievements_array, '[]'::jsonb);
END;
$$;

-- Function to claim an achievement reward
CREATE OR REPLACE FUNCTION claim_achievement(
    claimer_id UUID,
    target_achievement_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_achievement RECORD;
    achievement_def RECORD;
BEGIN
    -- Get player's achievement progress
    SELECT * INTO player_achievement 
    FROM player_achievements 
    WHERE player_id = claimer_id AND achievement_id = target_achievement_id;
    
    -- Check if achievement exists in player record
    IF player_achievement IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Achievement not found.');
    END IF;
    
    -- Check if unlocked
    IF NOT player_achievement.is_unlocked THEN
        RETURN jsonb_build_object('success', false, 'message', 'Achievement not unlocked yet.');
    END IF;
    
    -- Check if already claimed
    IF player_achievement.is_claimed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Achievement already claimed.');
    END IF;
    
    -- Get achievement definition for reward
    SELECT * INTO achievement_def FROM achievement_definitions WHERE id = target_achievement_id;
    
    IF achievement_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Achievement definition not found.');
    END IF;
    
    -- Mark as claimed
    UPDATE player_achievements 
    SET is_claimed = true, claimed_at = NOW()
    WHERE player_id = claimer_id AND achievement_id = target_achievement_id;
    
    -- Give reward
    IF achievement_def.reward_type = 'cash' THEN
        UPDATE players SET cash = cash + achievement_def.reward_amount, updated_at = NOW()
        WHERE id = claimer_id;
    ELSIF achievement_def.reward_type = 'diamonds' THEN
        UPDATE players SET diamonds = diamonds + achievement_def.reward_amount, updated_at = NOW()
        WHERE id = claimer_id;
    END IF;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (claimer_id, 'achievement_reward', achievement_def.reward_type, achievement_def.reward_amount, 
            'Achievement reward: ' || achievement_def.name);
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Achievement claimed! +' || achievement_def.reward_amount || ' ' || achievement_def.reward_type,
        'reward_type', achievement_def.reward_type,
        'reward_amount', achievement_def.reward_amount
    );
END;
$$;

-- Function to initialize player achievements (call when player is created or on first achievements load)
CREATE OR REPLACE FUNCTION init_player_achievements(target_player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert missing achievement records for this player
    INSERT INTO player_achievements (player_id, achievement_id, progress, is_unlocked, is_claimed)
    SELECT target_player_id, ad.id, 0, false, false
    FROM achievement_definitions ad
    WHERE NOT EXISTS (
        SELECT 1 FROM player_achievements pa 
        WHERE pa.player_id = target_player_id AND pa.achievement_id = ad.id
    );
END;
$$;

-- Function to update achievement progress
CREATE OR REPLACE FUNCTION update_achievement_progress(
    target_player_id UUID,
    achievement_name TEXT,
    increment_by INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    achievement_def RECORD;
    current_progress INTEGER;
    new_progress INTEGER;
    is_now_unlocked BOOLEAN := false;
BEGIN
    -- Get achievement definition
    SELECT * INTO achievement_def FROM achievement_definitions WHERE name = achievement_name;
    
    IF achievement_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Achievement not found.');
    END IF;
    
    -- Ensure player achievement record exists
    INSERT INTO player_achievements (player_id, achievement_id, progress, is_unlocked, is_claimed)
    VALUES (target_player_id, achievement_def.id, 0, false, false)
    ON CONFLICT (player_id, achievement_id) DO NOTHING;
    
    -- Get current progress
    SELECT progress INTO current_progress 
    FROM player_achievements 
    WHERE player_id = target_player_id AND achievement_id = achievement_def.id;
    
    new_progress := LEAST(current_progress + increment_by, achievement_def.target_value);
    
    -- Check if newly unlocked
    IF current_progress < achievement_def.target_value AND new_progress >= achievement_def.target_value THEN
        is_now_unlocked := true;
        UPDATE player_achievements 
        SET progress = new_progress, is_unlocked = true, unlocked_at = NOW()
        WHERE player_id = target_player_id AND achievement_id = achievement_def.id;
    ELSE
        UPDATE player_achievements 
        SET progress = new_progress
        WHERE player_id = target_player_id AND achievement_id = achievement_def.id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'progress', new_progress,
        'target', achievement_def.target_value,
        'unlocked', is_now_unlocked
    );
END;
$$;
