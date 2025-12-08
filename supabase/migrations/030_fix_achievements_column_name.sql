-- =====================================================
-- FIX ACHIEVEMENTS - CORRECT COLUMN NAME
-- =====================================================
-- Fixes the error: column "result" does not exist
-- The attack_log table uses "attacker_won" (boolean), not "result" (text)

CREATE OR REPLACE FUNCTION get_player_achievements(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    achievements_array JSONB;
    player_record RECORD;
    business_count INTEGER;
    max_business_level INTEGER;
    attack_wins INTEGER;
    defense_wins INTEGER;
    total_earned BIGINT;
    family_member RECORD;
BEGIN
    -- Get player stats
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    
    -- Count owned businesses
    SELECT COUNT(*) INTO business_count 
    FROM player_businesses 
    WHERE player_id = target_player_id;
    
    -- Get max business level
    SELECT COALESCE(MAX(level), 0) INTO max_business_level 
    FROM player_businesses 
    WHERE player_id = target_player_id;
    
    -- Count attack wins (attacker_won = true)
    SELECT COUNT(*) INTO attack_wins 
    FROM attack_log 
    WHERE attacker_id = target_player_id AND attacker_won = true;
    
    -- Count successful defenses (attacker_won = false means defender won)
    SELECT COUNT(*) INTO defense_wins 
    FROM attack_log 
    WHERE defender_id = target_player_id AND attacker_won = false;
    
    -- Calculate total cash ever earned (positive transactions only)
    SELECT COALESCE(SUM(amount), 0) INTO total_earned 
    FROM transactions 
    WHERE player_id = target_player_id 
      AND currency = 'cash' 
      AND amount > 0;
    
    -- Check family membership
    SELECT * INTO family_member
    FROM family_members
    WHERE player_id = target_player_id;
    
    -- Build achievements array with LIVE progress
    SELECT json_agg(json_build_object(
        'id', ad.id,
        'name', ad.name,
        'description', ad.description,
        'category', ad.category,
        'target_value', ad.target_value,
        'reward_type', ad.reward_type,
        'reward_amount', ad.reward_amount,
        'icon', ad.icon,
        -- Calculate LIVE progress based on category and achievement name
        'progress', CASE
            -- COMBAT: Attack wins
            WHEN ad.name IN ('First Blood', 'Street Fighter', 'Warmonger') THEN attack_wins
            -- COMBAT: Defense wins
            WHEN ad.name IN ('Untouchable', 'Survivor') THEN defense_wins
            -- BUSINESS: Business count
            WHEN ad.name IN ('Entrepreneur', 'Business Owner', 'Tycoon') THEN business_count
            -- BUSINESS: Max business level
            WHEN ad.name = 'Empire Builder' THEN max_business_level
            -- SOCIAL: In a family
            WHEN ad.name = 'Made Man' THEN CASE WHEN family_member IS NOT NULL THEN 1 ELSE 0 END
            -- SOCIAL: Is boss
            WHEN ad.name = 'Godfather' THEN CASE WHEN family_member.role = 'Boss' THEN 1 ELSE 0 END
            -- SOCIAL: Family contributions (not tracked yet, use 0)
            WHEN ad.name = 'Family First' THEN 0
            -- WEALTH: Total earned
            WHEN ad.name IN ('Getting Started', 'First Million', 'Multi-Millionaire') THEN total_earned
            -- MILESTONE: Player level
            WHEN ad.name IN ('Newcomer', 'Rising Star', 'Veteran', 'Legend') THEN player_record.level
            -- Default to stored progress
            ELSE COALESCE(pa.progress, 0)
        END,
        -- Check if unlocked based on live progress
        'is_unlocked', CASE
            WHEN ad.name IN ('First Blood', 'Street Fighter', 'Warmonger') THEN attack_wins >= ad.target_value
            WHEN ad.name IN ('Untouchable', 'Survivor') THEN defense_wins >= ad.target_value
            WHEN ad.name IN ('Entrepreneur', 'Business Owner', 'Tycoon') THEN business_count >= ad.target_value
            WHEN ad.name = 'Empire Builder' THEN max_business_level >= ad.target_value
            WHEN ad.name = 'Made Man' THEN family_member IS NOT NULL
            WHEN ad.name = 'Godfather' THEN family_member.role = 'Boss'
            WHEN ad.name IN ('Getting Started', 'First Million', 'Multi-Millionaire') THEN total_earned >= ad.target_value
            WHEN ad.name IN ('Newcomer', 'Rising Star', 'Veteran', 'Legend') THEN player_record.level >= ad.target_value
            ELSE COALESCE(pa.is_unlocked, false)
        END,
        'is_claimed', COALESCE(pa.is_claimed, false),
        'unlocked_at', pa.unlocked_at,
        'claimed_at', pa.claimed_at
    ) ORDER BY 
        -- Claimable (unlocked but not claimed) first
        CASE WHEN (
            CASE
                WHEN ad.name IN ('First Blood', 'Street Fighter', 'Warmonger') THEN attack_wins >= ad.target_value
                WHEN ad.name IN ('Untouchable', 'Survivor') THEN defense_wins >= ad.target_value
                WHEN ad.name IN ('Entrepreneur', 'Business Owner', 'Tycoon') THEN business_count >= ad.target_value
                WHEN ad.name = 'Empire Builder' THEN max_business_level >= ad.target_value
                WHEN ad.name = 'Made Man' THEN family_member IS NOT NULL
                WHEN ad.name = 'Godfather' THEN family_member.role = 'Boss'
                WHEN ad.name IN ('Getting Started', 'First Million', 'Multi-Millionaire') THEN total_earned >= ad.target_value
                WHEN ad.name IN ('Newcomer', 'Rising Star', 'Veteran', 'Legend') THEN player_record.level >= ad.target_value
                ELSE COALESCE(pa.is_unlocked, false)
            END
        ) AND NOT COALESCE(pa.is_claimed, false) THEN 0
        WHEN NOT (
            CASE
                WHEN ad.name IN ('First Blood', 'Street Fighter', 'Warmonger') THEN attack_wins >= ad.target_value
                WHEN ad.name IN ('Untouchable', 'Survivor') THEN defense_wins >= ad.target_value
                WHEN ad.name IN ('Entrepreneur', 'Business Owner', 'Tycoon') THEN business_count >= ad.target_value
                WHEN ad.name = 'Empire Builder' THEN max_business_level >= ad.target_value
                WHEN ad.name = 'Made Man' THEN family_member IS NOT NULL
                WHEN ad.name = 'Godfather' THEN family_member.role = 'Boss'
                WHEN ad.name IN ('Getting Started', 'First Million', 'Multi-Millionaire') THEN total_earned >= ad.target_value
                WHEN ad.name IN ('Newcomer', 'Rising Star', 'Veteran', 'Legend') THEN player_record.level >= ad.target_value
                ELSE COALESCE(pa.is_unlocked, false)
            END
        ) THEN 1
        ELSE 2 END,
        ad.category, ad.name
    )
    INTO achievements_array
    FROM achievement_definitions ad
    LEFT JOIN player_achievements pa ON pa.achievement_id = ad.id AND pa.player_id = target_player_id;
    
    RETURN COALESCE(achievements_array, '[]'::jsonb);
END;
$$;


-- Also fix claim_achievement to use correct column name
CREATE OR REPLACE FUNCTION claim_achievement(
    claimer_id UUID,
    target_achievement_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    achievement_def RECORD;
    is_already_claimed BOOLEAN;
    is_actually_unlocked BOOLEAN;
    player_record RECORD;
    business_count INTEGER;
    max_business_level INTEGER;
    attack_wins INTEGER;
    defense_wins INTEGER;
    total_earned BIGINT;
    family_member RECORD;
BEGIN
    -- Get achievement definition
    SELECT * INTO achievement_def FROM achievement_definitions WHERE id = target_achievement_id;
    
    IF achievement_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Achievement not found.');
    END IF;
    
    -- Check if already claimed
    SELECT is_claimed INTO is_already_claimed 
    FROM player_achievements 
    WHERE player_id = claimer_id AND achievement_id = target_achievement_id;
    
    IF is_already_claimed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Achievement already claimed.');
    END IF;
    
    -- Calculate live progress to verify unlock status
    SELECT * INTO player_record FROM players WHERE id = claimer_id;
    SELECT COUNT(*) INTO business_count FROM player_businesses WHERE player_id = claimer_id;
    SELECT COALESCE(MAX(level), 0) INTO max_business_level FROM player_businesses WHERE player_id = claimer_id;
    SELECT COUNT(*) INTO attack_wins FROM attack_log WHERE attacker_id = claimer_id AND attacker_won = true;
    SELECT COUNT(*) INTO defense_wins FROM attack_log WHERE defender_id = claimer_id AND attacker_won = false;
    SELECT COALESCE(SUM(amount), 0) INTO total_earned FROM transactions WHERE player_id = claimer_id AND currency = 'cash' AND amount > 0;
    SELECT * INTO family_member FROM family_members WHERE player_id = claimer_id;
    
    -- Check if actually unlocked
    is_actually_unlocked := CASE
        WHEN achievement_def.name IN ('First Blood', 'Street Fighter', 'Warmonger') THEN attack_wins >= achievement_def.target_value
        WHEN achievement_def.name IN ('Untouchable', 'Survivor') THEN defense_wins >= achievement_def.target_value
        WHEN achievement_def.name IN ('Entrepreneur', 'Business Owner', 'Tycoon') THEN business_count >= achievement_def.target_value
        WHEN achievement_def.name = 'Empire Builder' THEN max_business_level >= achievement_def.target_value
        WHEN achievement_def.name = 'Made Man' THEN family_member IS NOT NULL
        WHEN achievement_def.name = 'Godfather' THEN family_member.role = 'Boss'
        WHEN achievement_def.name IN ('Getting Started', 'First Million', 'Multi-Millionaire') THEN total_earned >= achievement_def.target_value
        WHEN achievement_def.name IN ('Newcomer', 'Rising Star', 'Veteran', 'Legend') THEN player_record.level >= achievement_def.target_value
        ELSE false
    END;
    
    IF NOT is_actually_unlocked THEN
        RETURN jsonb_build_object('success', false, 'message', 'Achievement not unlocked yet.');
    END IF;
    
    -- Upsert the player_achievements record and mark as claimed
    INSERT INTO player_achievements (player_id, achievement_id, is_unlocked, is_claimed, unlocked_at, claimed_at)
    VALUES (claimer_id, target_achievement_id, true, true, NOW(), NOW())
    ON CONFLICT (player_id, achievement_id) 
    DO UPDATE SET is_claimed = true, claimed_at = NOW(), is_unlocked = true;
    
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
    
    -- Create notification
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        claimer_id, 
        'reward', 
        'Achievement Claimed!',
        'Claimed "' || achievement_def.name || '" and earned ' || achievement_def.reward_amount || 
        CASE WHEN achievement_def.reward_type = 'diamonds' THEN ' 💎' ELSE ' $' END
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Achievement claimed! +' || achievement_def.reward_amount || ' ' || achievement_def.reward_type,
        'reward_type', achievement_def.reward_type,
        'reward_amount', achievement_def.reward_amount
    );
END;
$$;
