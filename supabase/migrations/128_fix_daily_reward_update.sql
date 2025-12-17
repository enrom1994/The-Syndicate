-- =====================================================
-- FIX DAILY REWARD LOGIC REGRESSION
-- =====================================================
-- Migration 126 introduced a regression where claim_daily_reward updated 
-- 'player_daily_rewards' table instead of the 'players' table columns
-- (last_daily_claim, daily_streak) used by the frontend status checker.
--
-- This migration restores the correct logic from 053_fix_daily_rewards.sql
-- while maintaining the removal of the auth.uid() check to unblock users.

SET search_path = public;

DROP FUNCTION IF EXISTS claim_daily_reward(UUID);

CREATE OR REPLACE FUNCTION claim_daily_reward(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    reward_def RECORD;
    milestone_reward RECORD;
    current_day INTEGER;
    new_streak INTEGER;
    can_claim BOOLEAN;
    hours_since_last NUMERIC;
    streak_was_broken BOOLEAN := false;
    milestone_bonus JSONB := NULL;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Calculate hours since last claim
    IF player_record.last_daily_claim IS NOT NULL THEN
        hours_since_last := EXTRACT(EPOCH FROM (NOW() - player_record.last_daily_claim)) / 3600;
    ELSE
        hours_since_last := 999; -- First time claiming
    END IF;
    
    -- Check if can claim (must be at least 20 hours since last claim)
    IF hours_since_last < 20 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Already claimed today',
            'hours_until_next', 20 - hours_since_last
        );
    END IF;
    
    -- Check if streak should break (missed more than 48 hours)
    IF hours_since_last > 48 AND COALESCE(player_record.daily_streak, 0) > 0 THEN
        streak_was_broken := true;
        -- Save the lost streak
        UPDATE players SET 
            streak_lost_at = NOW(),
            streak_before_loss = player_record.daily_streak
        WHERE id = target_player_id;
        
        -- Reset streak
        new_streak := 1;
    ELSE
        -- Continue streak
        new_streak := COALESCE(player_record.daily_streak, 0) + 1;
    END IF;
    
    -- Calculate current day in 7-day cycle (1-7)
    current_day := ((new_streak - 1) % 7) + 1;
    
    -- Get reward for this day
    SELECT * INTO reward_def FROM daily_reward_definitions WHERE day_number = current_day;
    IF reward_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reward definition not found');
    END IF;
    
    -- Grant the reward
    IF reward_def.reward_type = 'cash' THEN
        UPDATE players SET cash = cash + reward_def.reward_amount WHERE id = target_player_id;
    ELSIF reward_def.reward_type = 'diamonds' THEN
        UPDATE players SET diamonds = diamonds + reward_def.reward_amount WHERE id = target_player_id;
    ELSIF reward_def.reward_type = 'energy' THEN
        UPDATE players SET energy = LEAST(energy + reward_def.reward_amount, max_energy) WHERE id = target_player_id;
    END IF;
    
    -- Check for milestone bonus
    SELECT * INTO milestone_reward FROM streak_milestones WHERE streak_days = new_streak;
    IF milestone_reward IS NOT NULL THEN
        IF milestone_reward.reward_type = 'cash' THEN
            UPDATE players SET cash = cash + milestone_reward.reward_amount WHERE id = target_player_id;
        ELSIF milestone_reward.reward_type = 'diamonds' THEN
            UPDATE players SET diamonds = diamonds + milestone_reward.reward_amount WHERE id = target_player_id;
        ELSIF milestone_reward.reward_type = 'energy' THEN
            UPDATE players SET energy = LEAST(energy + milestone_reward.reward_amount, max_energy) WHERE id = target_player_id;
        ELSIF milestone_reward.reward_type = 'respect' THEN
            UPDATE players SET respect = respect + milestone_reward.reward_amount WHERE id = target_player_id;
        END IF;
        
        milestone_bonus := jsonb_build_object(
            'type', milestone_reward.reward_type,
            'amount', milestone_reward.reward_amount,
            'description', milestone_reward.description
        );
    END IF;
    
    -- Update streak and last claim (using correct columns on players table)
    UPDATE players SET 
        daily_streak = new_streak,
        last_daily_claim = NOW()
    WHERE id = target_player_id;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (target_player_id, 'daily_reward', reward_def.reward_type, reward_def.reward_amount, 
            'Day ' || current_day || ' daily reward');
    
    -- Create notification
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (target_player_id, 'reward', 'Daily Reward Claimed!', 
            'Day ' || current_day || ': ' || 
            CASE reward_def.reward_type 
                WHEN 'cash' THEN '$' || reward_def.reward_amount
                WHEN 'diamonds' THEN reward_def.reward_amount || ' diamonds'
                WHEN 'energy' THEN reward_def.reward_amount || ' energy'
            END);
    
    RETURN jsonb_build_object(
        'success', true,
        'day', current_day,
        'new_streak', new_streak,
        'reward_type', reward_def.reward_type,
        'reward_amount', reward_def.reward_amount,
        'streak_was_broken', streak_was_broken,
        'milestone_bonus', milestone_bonus
    );
END;
$$;

COMMENT ON FUNCTION claim_daily_reward(UUID) IS 'Gameplay: Updates daily_streak/last_daily_claim on players table';
