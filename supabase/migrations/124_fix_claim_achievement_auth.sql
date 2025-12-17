-- =====================================================
-- FIX claim_achievement AUTH LOCKDOWN
-- =====================================================
-- Add auth.uid() validation to claim_achievement RPC
-- This was missed in the initial auth lockdown migration

SET search_path = public;

DROP FUNCTION IF EXISTS claim_achievement(UUID, UUID);

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
    -- SECURITY: Validate caller identity
    IF claimer_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

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
        CASE WHEN achievement_def.reward_type = 'diamonds' THEN ' Diamonds' ELSE ' $' END
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Achievement claimed! +' || achievement_def.reward_amount || ' ' || achievement_def.reward_type,
        'reward_type', achievement_def.reward_type,
        'reward_amount', achievement_def.reward_amount
    );
END;
$$;

COMMENT ON FUNCTION claim_achievement(UUID, UUID) IS 'Auth-locked: Requires auth.uid() = claimer_id';
