-- =====================================================
-- DIAMOND SINKS: JOB CHAINS, RUSH MODE, HIGH STAKES
-- =====================================================
-- Feature 1: Job Chains - Streak system with diamond continue
-- Feature 2: Rush Mode - Pay diamonds to skip cooldowns
-- Feature 3: High Stakes Missions - Premium jobs with diamond entry

-- =====================================================
-- 0. FIX NOTIFICATION TYPE CONSTRAINT (add 'business' type)
-- =====================================================
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('attack', 'income', 'job', 'family', 'system', 'bounty', 'purchase', 'upgrade', 'reward', 'business'));

-- =====================================================
-- 1. JOB CHAINS: ADD STREAK COLUMNS TO PLAYERS
-- =====================================================

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS job_chain_streak INTEGER DEFAULT 0;

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS job_chain_started_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS job_chain_broken_at TIMESTAMPTZ DEFAULT NULL;


-- =====================================================
-- 2. MODIFY COMPLETE_JOB TO SUPPORT STREAKS
-- =====================================================
-- Adds streak tracking, bonus multipliers, and chain_broken flag

CREATE OR REPLACE FUNCTION complete_job(
    player_id_input UUID,
    job_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    job_record RECORD;
    player_record RECORD;
    is_success BOOLEAN;
    xp_result JSONB;
    
    -- Streak variables
    current_streak INTEGER;
    streak_bonus FLOAT := 0;
    final_cash BIGINT;
    final_xp INTEGER;
    chain_still_valid BOOLEAN;
BEGIN
    -- Get Job Details
    SELECT * INTO job_record FROM job_definitions WHERE id = job_id_input;
    IF job_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job not found');
    END IF;

    -- Get Player Stats (including streak)
    SELECT * INTO player_record FROM players WHERE id = player_id_input;

    -- Level check
    IF player_record.level < job_record.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Level too low');
    END IF;

    -- Energy check
    IF player_record.energy < job_record.energy_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough energy');
    END IF;

    -- Deduct Energy
    UPDATE players SET energy = energy - job_record.energy_cost WHERE id = player_id_input;

    -- Check if previous chain is still valid (started within last 10 minutes)
    chain_still_valid := player_record.job_chain_started_at IS NOT NULL 
                         AND player_record.job_chain_started_at > NOW() - INTERVAL '10 minutes'
                         AND player_record.job_chain_broken_at IS NULL;
    
    -- Get current streak
    current_streak := COALESCE(player_record.job_chain_streak, 0);
    
    -- If chain expired or was broken without continue, reset streak
    IF NOT chain_still_valid THEN
        current_streak := 0;
    END IF;

    -- Calculate streak bonus: 10% per streak level (max 50% at streak 5)
    streak_bonus := LEAST(current_streak, 5) * 0.10;

    -- Calculate Success (Random roll 1-100)
    is_success := (FLOOR(RANDOM() * 100) + 1) <= job_record.success_rate;

    -- Log Attempt
    INSERT INTO job_log (player_id, job_id, success, cash_earned, experience_earned)
    VALUES (
        player_id_input, 
        job_id_input, 
        is_success, 
        CASE WHEN is_success THEN job_record.cash_reward ELSE 0 END, 
        CASE WHEN is_success THEN job_record.experience_reward ELSE 0 END
    );

    IF is_success THEN
        -- Calculate rewards with streak bonus
        final_cash := ROUND(job_record.cash_reward * (1 + streak_bonus));
        final_xp := ROUND(job_record.experience_reward * (1 + streak_bonus));
        
        -- Increment streak (max 5)
        current_streak := LEAST(current_streak + 1, 5);
        
        -- Update player with rewards and streak
        UPDATE players
        SET cash = cash + final_cash,
            respect = respect + job_record.respect_reward,
            total_jobs_completed = COALESCE(total_jobs_completed, 0) + 1,
            job_chain_streak = current_streak,
            job_chain_started_at = NOW(),
            job_chain_broken_at = NULL
        WHERE id = player_id_input;

        -- Add XP (triggers level up check)
        xp_result := add_experience(player_id_input, final_xp);

        -- Log Transaction
        INSERT INTO transactions (player_id, amount, currency, transaction_type, description)
        VALUES (player_id_input, final_cash, 'cash', 'job_complete', 
                'Completed job: ' || job_record.name || 
                CASE WHEN streak_bonus > 0 THEN ' (+' || ROUND(streak_bonus * 100) || '% streak bonus)' ELSE '' END);

        -- Create notification
        PERFORM create_notification(
            player_id_input,
            'job',
            'Job Complete: ' || job_record.name,
            'Earned $' || final_cash::TEXT || ' and ' || final_xp::TEXT || ' XP' ||
            CASE WHEN streak_bonus > 0 THEN ' (🔥 Streak ' || current_streak || ')' ELSE '' END
        );

        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Job completed!',
            'cash_earned', final_cash,
            'xp_earned', final_xp,
            'leveled_up', (xp_result->>'leveled_up')::BOOLEAN,
            'new_level', (xp_result->>'new_level')::INTEGER,
            'current_streak', current_streak,
            'streak_bonus_percent', ROUND(streak_bonus * 100)
        );
    ELSE
        -- FAILURE: Mark chain as broken (player has 2 minutes to continue)
        UPDATE players
        SET job_chain_broken_at = NOW()
        WHERE id = player_id_input;
        
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Job failed... you got away safely but empty handed.',
            'chain_broken', current_streak > 0,
            'current_streak', current_streak,
            'can_continue_until', NOW() + INTERVAL '2 minutes'
        );
    END IF;
END;
$$;


-- =====================================================
-- 3. CONTINUE JOB CHAIN RPC (15 DIAMONDS)
-- =====================================================

CREATE OR REPLACE FUNCTION continue_job_chain(player_id_input UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    diamond_cost INTEGER := 15;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = player_id_input;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Check if chain is actually broken and within 2 minute window
    IF player_record.job_chain_broken_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No broken chain to continue');
    END IF;
    
    IF player_record.job_chain_broken_at < NOW() - INTERVAL '2 minutes' THEN
        -- Chain expired, reset it
        UPDATE players 
        SET job_chain_streak = 0, job_chain_broken_at = NULL, job_chain_started_at = NULL
        WHERE id = player_id_input;
        RETURN jsonb_build_object('success', false, 'message', 'Chain continue window expired');
    END IF;
    
    -- Check diamonds
    IF player_record.diamonds < diamond_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds (need ' || diamond_cost || ')');
    END IF;
    
    -- Deduct diamonds and restore chain
    UPDATE players 
    SET diamonds = diamonds - diamond_cost,
        job_chain_broken_at = NULL,
        job_chain_started_at = NOW()  -- Reset timer
    WHERE id = player_id_input;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'chain_continue', 'diamonds', -diamond_cost, 
            'Continued job chain at streak ' || player_record.job_chain_streak);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Chain continued! Keep the streak going!',
        'diamonds_spent', diamond_cost,
        'current_streak', player_record.job_chain_streak
    );
END;
$$;


-- =====================================================
-- 4. RUSH BUSINESS COLLECT RPC (5 DIAMONDS)
-- =====================================================

CREATE OR REPLACE FUNCTION rush_business_collect(
    player_id_input UUID,
    player_business_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    diamond_cost INTEGER := 5;
    player_record RECORD;
    business_record RECORD;
    income_amount BIGINT;
    has_income_boost BOOLEAN := false;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = player_id_input;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Check diamonds
    IF player_record.diamonds < diamond_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds (need ' || diamond_cost || ')');
    END IF;
    
    -- Get business with definition
    SELECT pb.*, bd.name as business_name, bd.base_income_per_hour
    INTO business_record
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.id = player_business_id_input AND pb.player_id = player_id_input;
    
    IF business_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found');
    END IF;
    
    -- Calculate income (1 hour worth)
    income_amount := business_record.base_income_per_hour;
    
    -- Check for 2x income booster
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = player_id_input 
        AND booster_type = '2x_income' 
        AND expires_at > NOW()
    ) INTO has_income_boost;
    
    IF has_income_boost THEN
        income_amount := income_amount * 2;
    END IF;
    
    -- Deduct diamonds
    UPDATE players 
    SET diamonds = diamonds - diamond_cost,
        cash = cash + income_amount
    WHERE id = player_id_input;
    
    -- Update last_collected to now (so normal collect resets cooldown)
    UPDATE player_businesses 
    SET last_collected = NOW()
    WHERE id = player_business_id_input;
    
    -- Log transactions
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES 
        (player_id_input, 'rush_collect', 'diamonds', -diamond_cost, 'Rush collected ' || business_record.business_name),
        (player_id_input, 'business_income', 'cash', income_amount, 'Rush income from ' || business_record.business_name);
    
    -- Create notification
    PERFORM create_notification(
        player_id_input,
        'business',
        'Rush Collect!',
        'Collected $' || income_amount::TEXT || ' from ' || business_record.business_name || ' (5💎)'
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rush collected $' || income_amount || '!',
        'income_collected', income_amount,
        'diamonds_spent', diamond_cost,
        'had_boost', has_income_boost
    );
END;
$$;


-- =====================================================
-- 5. RUSH PVE COOLDOWN RPC (3 DIAMONDS)
-- =====================================================

CREATE OR REPLACE FUNCTION rush_pve_cooldown(
    player_id_input UUID,
    target_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    diamond_cost INTEGER := 3;
    player_record RECORD;
    target_record RECORD;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = player_id_input;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Check diamonds
    IF player_record.diamonds < diamond_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds (need ' || diamond_cost || ')');
    END IF;
    
    -- Get target
    SELECT * INTO target_record FROM pve_targets WHERE id = target_id_input;
    IF target_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target not found');
    END IF;
    
    -- Deduct diamonds
    UPDATE players SET diamonds = diamonds - diamond_cost WHERE id = player_id_input;
    
    -- Clear cooldown by deleting from cooldown table
    DELETE FROM pve_cooldowns 
    WHERE player_id = player_id_input AND target_id = target_id_input;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'rush_cooldown', 'diamonds', -diamond_cost, 
            'Skipped cooldown for ' || target_record.name);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Cooldown cleared! Attack now!',
        'diamonds_spent', diamond_cost,
        'target_name', target_record.name
    );
END;
$$;


-- =====================================================
-- 6. HIGH STAKES JOBS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.high_stakes_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    entry_cost_diamonds INTEGER NOT NULL DEFAULT 50,
    energy_cost INTEGER NOT NULL DEFAULT 20,
    cash_multiplier DECIMAL(3,1) NOT NULL DEFAULT 3.0,
    xp_multiplier DECIMAL(3,1) NOT NULL DEFAULT 2.0,
    base_cash_reward BIGINT NOT NULL DEFAULT 50000,
    base_xp_reward INTEGER NOT NULL DEFAULT 100,
    success_rate INTEGER NOT NULL DEFAULT 70,
    required_level INTEGER NOT NULL DEFAULT 5,
    cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.high_stakes_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view high stakes jobs" ON public.high_stakes_jobs;
CREATE POLICY "Anyone can view high stakes jobs"
    ON public.high_stakes_jobs FOR SELECT
    USING (true);

-- Seed high stakes jobs
INSERT INTO public.high_stakes_jobs (name, description, entry_cost_diamonds, energy_cost, base_cash_reward, base_xp_reward, success_rate, required_level, cooldown_minutes)
VALUES 
    ('Operation: Black Vault', 'Infiltrate the underground vault. High risk, massive rewards.', 50, 25, 75000, 150, 65, 5, 60),
    ('Syndicate Heist', 'Hit a rival syndicate''s main operation. Extremely dangerous.', 75, 35, 150000, 250, 55, 10, 120),
    ('Casino Takeover', 'Take control of an entire casino floor. The ultimate score.', 100, 50, 300000, 500, 45, 20, 180)
ON CONFLICT (name) DO UPDATE SET
    entry_cost_diamonds = EXCLUDED.entry_cost_diamonds,
    base_cash_reward = EXCLUDED.base_cash_reward,
    success_rate = EXCLUDED.success_rate;


-- =====================================================
-- 7. HIGH STAKES COOLDOWNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.high_stakes_cooldowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.high_stakes_jobs(id) ON DELETE CASCADE,
    last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_hs_cooldowns_player ON public.high_stakes_cooldowns(player_id);


-- =====================================================
-- 8. EXECUTE HIGH STAKES JOB RPC
-- =====================================================

CREATE OR REPLACE FUNCTION execute_high_stakes_job(
    player_id_input UUID,
    job_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    job_record RECORD;
    cooldown_record RECORD;
    is_success BOOLEAN;
    final_cash BIGINT;
    final_xp INTEGER;
    xp_result JSONB;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = player_id_input;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Get job
    SELECT * INTO job_record FROM high_stakes_jobs WHERE id = job_id_input AND is_active = true;
    IF job_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'High stakes job not found');
    END IF;
    
    -- Check level
    IF player_record.level < job_record.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Requires level ' || job_record.required_level);
    END IF;
    
    -- Check cooldown
    SELECT * INTO cooldown_record 
    FROM high_stakes_cooldowns 
    WHERE player_id = player_id_input AND job_id = job_id_input;
    
    IF cooldown_record IS NOT NULL THEN
        IF cooldown_record.last_attempted_at + (job_record.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'On cooldown',
                'cooldown_remaining', EXTRACT(EPOCH FROM (cooldown_record.last_attempted_at + (job_record.cooldown_minutes || ' minutes')::INTERVAL - NOW()))
            );
        END IF;
    END IF;
    
    -- Check diamonds (ENTRY FEE)
    IF player_record.diamonds < job_record.entry_cost_diamonds THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds (need ' || job_record.entry_cost_diamonds || '💎)');
    END IF;
    
    -- Check energy
    IF player_record.energy < job_record.energy_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough energy');
    END IF;
    
    -- DEDUCT DIAMONDS AND ENERGY (entry fee paid regardless of outcome)
    UPDATE players 
    SET diamonds = diamonds - job_record.entry_cost_diamonds,
        energy = energy - job_record.energy_cost
    WHERE id = player_id_input;
    
    -- Log diamond transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'high_stakes_entry', 'diamonds', -job_record.entry_cost_diamonds, 
            'Entry fee for ' || job_record.name);
    
    -- Record cooldown
    INSERT INTO high_stakes_cooldowns (player_id, job_id, last_attempted_at)
    VALUES (player_id_input, job_id_input, NOW())
    ON CONFLICT (player_id, job_id) 
    DO UPDATE SET last_attempted_at = NOW();
    
    -- Roll for success
    is_success := (FLOOR(RANDOM() * 100) + 1) <= job_record.success_rate;
    
    IF is_success THEN
        -- Calculate rewards with multiplier
        final_cash := ROUND(job_record.base_cash_reward * job_record.cash_multiplier);
        final_xp := ROUND(job_record.base_xp_reward * job_record.xp_multiplier);
        
        -- Give rewards
        UPDATE players 
        SET cash = cash + final_cash,
            total_jobs_completed = COALESCE(total_jobs_completed, 0) + 1
        WHERE id = player_id_input;
        
        -- Add XP
        xp_result := add_experience(player_id_input, final_xp);
        
        -- Log cash transaction
        INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'high_stakes_win', 'cash', final_cash, 
                'High Stakes Victory: ' || job_record.name);
        
        -- Notification
        PERFORM create_notification(
            player_id_input,
            'job',
            '🎰 HIGH STAKES WIN!',
            job_record.name || ' - Won $' || final_cash::TEXT || ' and ' || final_xp || ' XP!'
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'result', 'victory',
            'message', 'Incredible! You pulled off ' || job_record.name || '!',
            'cash_earned', final_cash,
            'xp_earned', final_xp,
            'diamonds_spent', job_record.entry_cost_diamonds,
            'leveled_up', (xp_result->>'leveled_up')::BOOLEAN,
            'new_level', (xp_result->>'new_level')::INTEGER
        );
    ELSE
        -- FAILURE: Diamonds already gone, that's the only penalty
        PERFORM create_notification(
            player_id_input,
            'job',
            '💀 HIGH STAKES FAILED',
            job_record.name || ' - Lost ' || job_record.entry_cost_diamonds || '💎 entry fee'
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'result', 'defeat',
            'message', 'The job went south. You lost your ' || job_record.entry_cost_diamonds || '💎 entry fee.',
            'diamonds_lost', job_record.entry_cost_diamonds,
            'cash_earned', 0,
            'xp_earned', 0
        );
    END IF;
END;
$$;


-- =====================================================
-- 9. GET HIGH STAKES JOBS RPC
-- =====================================================

CREATE OR REPLACE FUNCTION get_high_stakes_jobs(viewer_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    entry_cost_diamonds INTEGER,
    energy_cost INTEGER,
    cash_reward BIGINT,
    xp_reward INTEGER,
    success_rate INTEGER,
    required_level INTEGER,
    cooldown_minutes INTEGER,
    is_available BOOLEAN,
    cooldown_remaining_seconds INTEGER,
    player_meets_level BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_level INTEGER;
BEGIN
    SELECT level INTO player_level FROM players WHERE players.id = viewer_id;
    
    RETURN QUERY
    SELECT 
        hsj.id,
        hsj.name,
        hsj.description,
        hsj.entry_cost_diamonds,
        hsj.energy_cost,
        ROUND(hsj.base_cash_reward * hsj.cash_multiplier)::BIGINT as cash_reward,
        ROUND(hsj.base_xp_reward * hsj.xp_multiplier)::INTEGER as xp_reward,
        hsj.success_rate,
        hsj.required_level,
        hsj.cooldown_minutes,
        (hsc.last_attempted_at IS NULL OR 
         hsc.last_attempted_at + (hsj.cooldown_minutes || ' minutes')::INTERVAL <= NOW()) as is_available,
        GREATEST(0, EXTRACT(EPOCH FROM (
            COALESCE(hsc.last_attempted_at, NOW() - INTERVAL '1 day') + 
            (hsj.cooldown_minutes || ' minutes')::INTERVAL - NOW()
        )))::INTEGER as cooldown_remaining_seconds,
        (player_level >= hsj.required_level) as player_meets_level
    FROM high_stakes_jobs hsj
    LEFT JOIN high_stakes_cooldowns hsc ON hsj.id = hsc.job_id AND hsc.player_id = viewer_id
    WHERE hsj.is_active = true
    ORDER BY hsj.required_level ASC;
END;
$$;


-- =====================================================
-- 10. GET JOB CHAIN STATUS RPC
-- =====================================================

CREATE OR REPLACE FUNCTION get_job_chain_status(player_id_input UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    chain_valid BOOLEAN;
    can_continue BOOLEAN;
    seconds_to_continue INTEGER;
BEGIN
    SELECT * INTO player_record FROM players WHERE id = player_id_input;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('streak', 0, 'active', false);
    END IF;
    
    -- Check if chain is still active
    chain_valid := player_record.job_chain_started_at IS NOT NULL 
                   AND player_record.job_chain_started_at > NOW() - INTERVAL '10 minutes'
                   AND player_record.job_chain_broken_at IS NULL;
    
    -- Check if player can continue a broken chain
    can_continue := player_record.job_chain_broken_at IS NOT NULL
                    AND player_record.job_chain_broken_at > NOW() - INTERVAL '2 minutes';
    
    IF can_continue THEN
        seconds_to_continue := EXTRACT(EPOCH FROM (player_record.job_chain_broken_at + INTERVAL '2 minutes' - NOW()))::INTEGER;
    ELSE
        seconds_to_continue := 0;
    END IF;
    
    RETURN jsonb_build_object(
        'streak', COALESCE(player_record.job_chain_streak, 0),
        'active', chain_valid,
        'chain_broken', player_record.job_chain_broken_at IS NOT NULL,
        'can_continue', can_continue,
        'seconds_to_continue', seconds_to_continue,
        'continue_cost', 15,
        'bonus_percent', LEAST(COALESCE(player_record.job_chain_streak, 0), 5) * 10
    );
END;
$$;


-- Add comments
COMMENT ON FUNCTION complete_job IS 'Execute a job with streak tracking and bonus rewards';
COMMENT ON FUNCTION continue_job_chain IS 'Pay 15 diamonds to continue a broken job chain';
COMMENT ON FUNCTION rush_business_collect IS 'Pay 5 diamonds to skip business cooldown and collect now';
COMMENT ON FUNCTION rush_pve_cooldown IS 'Pay 3 diamonds to skip PvE target cooldown';
COMMENT ON FUNCTION execute_high_stakes_job IS 'Execute a high stakes job with diamond entry fee';
COMMENT ON TABLE high_stakes_jobs IS 'Premium jobs requiring diamond entry with 3x rewards';
