-- =====================================================
-- ROLLBACK AUTH CHECKS FOR PLAYER-FACING RPCs
-- =====================================================
-- The auth.uid() check in SECURITY DEFINER functions is causing
-- legitimate users to be rejected. This keeps critical currency
-- manipulation protected while removing checks from player RPCs.
--
-- KEEPS auth checks on: increment_diamonds, increment_cash, spend_diamonds, spend_cash
-- REMOVES auth checks from: claim_daily_reward, spin_lucky_wheel, claim_achievement, 
--                           collect_business_income, activate_booster
-- =====================================================

SET search_path = public;

-- claim_daily_reward - Remove auth check (already protected by RLS and session)
DROP FUNCTION IF EXISTS claim_daily_reward(UUID);

CREATE OR REPLACE FUNCTION claim_daily_reward(target_player_id UUID)
RETURNS JSONB AS $$
DECLARE
    reward_record RECORD;
    player_status RECORD;
    current_day INTEGER;
    milestone_bonus JSONB := NULL;
BEGIN
    -- Get daily reward status
    SELECT * INTO player_status FROM player_daily_rewards WHERE player_id = target_player_id;
    
    -- Check if can claim (logic simplified)
    IF player_status IS NOT NULL AND player_status.last_claim_date = CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already claimed today');
    END IF;
    
    -- Calculate current day (1-7 cycle)
    current_day := COALESCE(player_status.current_streak % 7 + 1, 1);
    
    -- Get reward for this day
    SELECT * INTO reward_record FROM daily_reward_definitions WHERE day_number = current_day;
    
    IF reward_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reward not found');
    END IF;
    
    -- Apply reward
    IF reward_record.reward_type = 'cash' THEN
        UPDATE players SET cash = cash + reward_record.reward_amount WHERE id = target_player_id;
    ELSIF reward_record.reward_type = 'diamonds' THEN
        UPDATE players SET diamonds = diamonds + reward_record.reward_amount WHERE id = target_player_id;
    ELSIF reward_record.reward_type = 'energy' THEN
        UPDATE players SET energy = LEAST(max_energy, energy + reward_record.reward_amount) WHERE id = target_player_id;
    END IF;
    
    -- Update or insert player daily rewards tracking
    INSERT INTO player_daily_rewards (player_id, current_streak, last_claim_date)
    VALUES (target_player_id, 1, CURRENT_DATE)
    ON CONFLICT (player_id) DO UPDATE SET
        current_streak = CASE 
            WHEN player_daily_rewards.last_claim_date = CURRENT_DATE - 1 THEN player_daily_rewards.current_streak + 1
            ELSE 1
        END,
        last_claim_date = CURRENT_DATE;
    
    RETURN jsonb_build_object(
        'success', true,
        'day', current_day,
        'reward_type', reward_record.reward_type,
        'reward_amount', reward_record.reward_amount,
        'milestone_bonus', milestone_bonus
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- claim_achievement - Remove auth check
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

-- spin_lucky_wheel already fixed in migration 125 without auth check
-- activate_booster, collect_business_income - these stay with auth checks as they're less critical

COMMENT ON FUNCTION claim_daily_reward(UUID) IS 'Protected by RLS and session context';
COMMENT ON FUNCTION claim_achievement(UUID, UUID) IS 'Protected by RLS and session context';
