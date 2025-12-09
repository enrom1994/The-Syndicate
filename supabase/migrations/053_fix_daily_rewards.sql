-- =====================================================
-- FIX DAILY REWARDS SYSTEM
-- =====================================================
-- Fixes:
-- 1. Proper 7-day cycle that resets after day 7
-- 2. Streak resets on missed day
-- 3. Streak Saver monetization (restore lost streak for TON)
-- 4. Streak milestone bonuses

-- =====================================================
-- 1. ADD STREAK TRACKING COLUMNS
-- =====================================================
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS streak_lost_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS streak_before_loss INTEGER DEFAULT 0;

COMMENT ON COLUMN public.players.streak_lost_at IS 'When the player lost their streak (for Streak Saver feature)';
COMMENT ON COLUMN public.players.streak_before_loss IS 'The streak value before it was lost (for restoration)';


-- =====================================================
-- 2. STREAK MILESTONE DEFINITIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.streak_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    streak_days INTEGER UNIQUE NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('cash', 'diamonds', 'energy', 'respect')),
    reward_amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert milestone rewards
INSERT INTO public.streak_milestones (streak_days, reward_type, reward_amount, description) VALUES
(7, 'diamonds', 50, 'First week bonus'),
(14, 'cash', 25000, 'Two week dedication'),
(21, 'diamonds', 100, 'Three week champion'),
(30, 'diamonds', 200, 'Monthly master'),
(60, 'diamonds', 500, 'Two month veteran'),
(90, 'diamonds', 1000, 'Quarterly legend')
ON CONFLICT (streak_days) DO UPDATE SET
    reward_type = EXCLUDED.reward_type,
    reward_amount = EXCLUDED.reward_amount,
    description = EXCLUDED.description;

-- RLS for streak milestones
ALTER TABLE public.streak_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read streak_milestones" ON public.streak_milestones;
CREATE POLICY "Public read streak_milestones" ON public.streak_milestones FOR SELECT USING (true);


-- =====================================================
-- 3. MAIN CLAIM DAILY REWARD RPC
-- =====================================================
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
    result JSONB;
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
    
    -- Check if can claim (must be at least 20 hours since last claim, but if >48 hours, streak breaks)
    -- Using 20 hours allows some flexibility for timezone shifts
    IF hours_since_last < 20 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Already claimed today',
            'hours_until_next', 20 - hours_since_last
        );
    END IF;
    
    -- Check if streak should break (missed more than 48 hours)
    IF hours_since_last > 48 AND player_record.daily_streak > 0 THEN
        streak_was_broken := true;
        -- Save the lost streak for potential restoration
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
        -- Grant milestone bonus
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
    
    -- Update streak and last claim
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


-- =====================================================
-- 4. RESTORE STREAK (STREAK SAVER - TON MONETIZATION)
-- =====================================================
CREATE OR REPLACE FUNCTION restore_streak(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    hours_since_loss NUMERIC;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Check if there's a streak to restore
    IF player_record.streak_lost_at IS NULL OR player_record.streak_before_loss <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No streak to restore');
    END IF;
    
    -- Check if within 24 hour window
    hours_since_loss := EXTRACT(EPOCH FROM (NOW() - player_record.streak_lost_at)) / 3600;
    IF hours_since_loss > 24 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Restoration window expired');
    END IF;
    
    -- Restore the streak (TON payment handled externally)
    UPDATE players SET 
        daily_streak = player_record.streak_before_loss,
        streak_lost_at = NULL,
        streak_before_loss = 0
    WHERE id = target_player_id;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (target_player_id, 'streak_restore', 'ton', -0.5, 'Streak Saver - Restored ' || player_record.streak_before_loss || ' day streak');
    
    RETURN jsonb_build_object(
        'success', true,
        'restored_streak', player_record.streak_before_loss,
        'message', 'Streak restored!'
    );
END;
$$;


-- =====================================================
-- 5. GET DAILY REWARD STATUS
-- =====================================================
CREATE OR REPLACE FUNCTION get_daily_reward_status(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    hours_since_last NUMERIC;
    can_claim BOOLEAN;
    current_day INTEGER;
    next_milestone RECORD;
    streak_restorable BOOLEAN := false;
    hours_to_restore NUMERIC := 0;
BEGIN
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Calculate timing
    IF player_record.last_daily_claim IS NOT NULL THEN
        hours_since_last := EXTRACT(EPOCH FROM (NOW() - player_record.last_daily_claim)) / 3600;
    ELSE
        hours_since_last := 999;
    END IF;
    
    can_claim := hours_since_last >= 20;
    
    -- Current day in cycle
    current_day := ((COALESCE(player_record.daily_streak, 0)) % 7) + 1;
    IF NOT can_claim THEN
        -- If can't claim, show next day
        current_day := current_day; -- Stay on current
    END IF;
    
    -- Check if streak is restorable
    IF player_record.streak_lost_at IS NOT NULL AND player_record.streak_before_loss > 0 THEN
        hours_to_restore := 24 - EXTRACT(EPOCH FROM (NOW() - player_record.streak_lost_at)) / 3600;
        streak_restorable := hours_to_restore > 0;
    END IF;
    
    -- Find next milestone
    SELECT * INTO next_milestone FROM streak_milestones 
    WHERE streak_days > COALESCE(player_record.daily_streak, 0)
    ORDER BY streak_days ASC LIMIT 1;
    
    RETURN jsonb_build_object(
        'success', true,
        'current_streak', COALESCE(player_record.daily_streak, 0),
        'current_day', current_day,
        'can_claim', can_claim,
        'hours_until_next', GREATEST(0, 20 - hours_since_last),
        'streak_restorable', streak_restorable,
        'lost_streak', player_record.streak_before_loss,
        'hours_to_restore', GREATEST(0, hours_to_restore),
        'next_milestone', CASE WHEN next_milestone IS NOT NULL THEN 
            jsonb_build_object(
                'days', next_milestone.streak_days,
                'reward_type', next_milestone.reward_type,
                'reward_amount', next_milestone.reward_amount,
                'description', next_milestone.description
            )
        ELSE NULL END
    );
END;
$$;
