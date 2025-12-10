-- =====================================================
-- TASK VERIFICATION SYSTEM
-- =====================================================
-- Implements proper task progress tracking and verification.
-- Tasks must be COMPLETED before claiming rewards.
-- Daily tasks reset at midnight UTC, weekly at start of week.

-- =====================================================
-- 1. ADD REQUIREMENT COLUMNS TO TASK DEFINITIONS
-- =====================================================

ALTER TABLE public.task_definitions 
ADD COLUMN IF NOT EXISTS requirement_type TEXT;

ALTER TABLE public.task_definitions 
ADD COLUMN IF NOT EXISTS requirement_target INTEGER DEFAULT 1;

-- Comment on new columns
COMMENT ON COLUMN public.task_definitions.requirement_type IS 'Type of action needed: job_complete, attack_win, business_collect, stat_train, login, telegram, ad_watch, business_income';
COMMENT ON COLUMN public.task_definitions.requirement_target IS 'Number of times action must be done (3 jobs, 10 attacks, etc)';


-- =====================================================
-- 2. ADD PROGRESS TRACKING TO PLAYER_TASKS
-- =====================================================

ALTER TABLE public.player_tasks 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

ALTER TABLE public.player_tasks 
ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ;

COMMENT ON COLUMN public.player_tasks.progress IS 'Cached progress for this task in current period';
COMMENT ON COLUMN public.player_tasks.period_start IS 'Start of current tracking period (for reset detection)';


-- =====================================================
-- 3. UPDATE EXISTING TASK DEFINITIONS WITH REQUIREMENTS
-- =====================================================

-- Telegram tasks (one-time, trust client)
UPDATE public.task_definitions 
SET requirement_type = 'telegram', requirement_target = 1 
WHERE task_type = 'telegram';

-- Daily Login
UPDATE public.task_definitions 
SET requirement_type = 'login', requirement_target = 1 
WHERE title = 'Daily Login';

-- Complete 3 Jobs (daily)
UPDATE public.task_definitions 
SET requirement_type = 'job_complete', requirement_target = 3 
WHERE title = 'Complete 3 Jobs';

-- Complete 5 Jobs (daily)
UPDATE public.task_definitions 
SET requirement_type = 'job_complete', requirement_target = 5 
WHERE title = 'Complete 5 Jobs';

-- Win 1 Attack (daily)
UPDATE public.task_definitions 
SET requirement_type = 'attack_win', requirement_target = 1 
WHERE title = 'Win 1 Attack';

-- Collect Income (daily) - collect from at least 1 business
UPDATE public.task_definitions 
SET requirement_type = 'business_collect', requirement_target = 1 
WHERE title = 'Collect Income';

-- Train Stats (daily)
UPDATE public.task_definitions 
SET requirement_type = 'stat_train', requirement_target = 1 
WHERE title = 'Train Stats';

-- Weekly Warrior (10 attacks per week)
UPDATE public.task_definitions 
SET requirement_type = 'attack_win', requirement_target = 10 
WHERE title = 'Weekly Warrior';

-- Business Mogul ($500K from businesses per week)
UPDATE public.task_definitions 
SET requirement_type = 'business_income', requirement_target = 500000 
WHERE title = 'Business Mogul';

-- Job Master (50 jobs per week)
UPDATE public.task_definitions 
SET requirement_type = 'job_complete', requirement_target = 50 
WHERE title = 'Job Master';

-- Watch Ad
UPDATE public.task_definitions 
SET requirement_type = 'ad_watch', requirement_target = 1 
WHERE title = 'Watch Ad';


-- =====================================================
-- 4. HELPER FUNCTION: GET PERIOD START
-- =====================================================

CREATE OR REPLACE FUNCTION get_task_period_start(reset_hours INTEGER)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    IF reset_hours = 24 THEN
        -- Daily: Start of current day UTC
        RETURN date_trunc('day', NOW() AT TIME ZONE 'UTC');
    ELSIF reset_hours = 168 THEN
        -- Weekly: Start of current week (Monday) UTC
        RETURN date_trunc('week', NOW() AT TIME ZONE 'UTC');
    ELSE
        -- One-time or special: No period
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- =====================================================
-- 5. FUNCTION: CALCULATE TASK PROGRESS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_task_progress(
    player_id_input UUID,
    requirement_type_input TEXT,
    requirement_target_input INTEGER,
    period_start_input TIMESTAMPTZ
) RETURNS INTEGER AS $$
DECLARE
    actual_progress INTEGER := 0;
BEGIN
    CASE requirement_type_input
        -- Job completions
        WHEN 'job_complete' THEN
            SELECT COUNT(*) INTO actual_progress
            FROM public.job_log
            WHERE player_id = player_id_input 
              AND success = true
              AND (period_start_input IS NULL OR created_at >= period_start_input);
              
        -- Attack wins
        WHEN 'attack_win' THEN
            SELECT COUNT(*) INTO actual_progress
            FROM public.attack_log
            WHERE attacker_id = player_id_input 
              AND attacker_won = true
              AND (period_start_input IS NULL OR created_at >= period_start_input);
              
        -- Business collection count (how many times collected)
        WHEN 'business_collect' THEN
            SELECT COUNT(*) INTO actual_progress
            FROM public.transactions
            WHERE player_id = player_id_input 
              AND transaction_type = 'business_income'
              AND (period_start_input IS NULL OR created_at >= period_start_input);
              
        -- Business income amount
        WHEN 'business_income' THEN
            SELECT COALESCE(SUM(amount), 0)::INTEGER INTO actual_progress
            FROM public.transactions
            WHERE player_id = player_id_input 
              AND transaction_type = 'business_income'
              AND (period_start_input IS NULL OR created_at >= period_start_input);
              
        -- Stat training count
        WHEN 'stat_train' THEN
            SELECT COUNT(*) INTO actual_progress
            FROM public.transactions
            WHERE player_id = player_id_input 
              AND transaction_type = 'stat_training'
              AND (period_start_input IS NULL OR created_at >= period_start_input);
              
        -- Login - always complete once per period
        WHEN 'login' THEN
            actual_progress := requirement_target_input;
            
        -- Telegram - trust client-side
        WHEN 'telegram' THEN
            actual_progress := requirement_target_input;
            
        -- Ad watch - would need SSV callback, for now trust client
        WHEN 'ad_watch' THEN
            actual_progress := requirement_target_input;
            
        ELSE
            actual_progress := 0;
    END CASE;
    
    RETURN actual_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 6. FUNCTION: CHECK TASK COMPLETION (FOR VERIFICATION)
-- =====================================================

CREATE OR REPLACE FUNCTION check_task_completion(
    player_id_input UUID,
    task_id_input UUID
) RETURNS JSONB AS $$
DECLARE
    task RECORD;
    period_start TIMESTAMPTZ;
    actual_progress INTEGER;
BEGIN
    -- Get task definition
    SELECT * INTO task FROM public.task_definitions WHERE id = task_id_input AND is_active = true;
    
    IF task IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task not found');
    END IF;
    
    -- Get period start
    period_start := get_task_period_start(task.reset_hours);
    
    -- Calculate progress
    actual_progress := calculate_task_progress(
        player_id_input, 
        COALESCE(task.requirement_type, 'login'),
        COALESCE(task.requirement_target, 1),
        period_start
    );
    
    -- Return result
    IF actual_progress >= COALESCE(task.requirement_target, 1) THEN
        RETURN jsonb_build_object(
            'can_claim', true,
            'progress', actual_progress,
            'target', COALESCE(task.requirement_target, 1)
        );
    ELSE
        RETURN jsonb_build_object(
            'can_claim', false,
            'progress', actual_progress,
            'target', COALESCE(task.requirement_target, 1),
            'message', 'Need ' || (COALESCE(task.requirement_target, 1) - actual_progress) || ' more'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 7. UPDATED COMPLETE_TASK WITH VERIFICATION
-- =====================================================

CREATE OR REPLACE FUNCTION complete_task(
    player_id_input UUID,
    task_id_input UUID
) RETURNS JSONB AS $$
DECLARE
    task RECORD;
    period_start TIMESTAMPTZ;
    is_already_completed BOOLEAN := false;
    check_result JSONB;
    task_reward_type TEXT;
    task_reward_amount INTEGER;
    task_title TEXT;
    reward_display TEXT;
BEGIN
    -- Get task definition
    SELECT * INTO task 
    FROM public.task_definitions 
    WHERE id = task_id_input AND is_active = true;
    
    IF task IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task not found');
    END IF;
    
    task_reward_type := task.reward_type;
    task_reward_amount := task.reward_amount;
    task_title := task.title;
    
    -- Get period start for daily/weekly tasks
    period_start := get_task_period_start(task.reset_hours);
    
    -- Check if already completed THIS period
    IF period_start IS NOT NULL THEN
        -- Daily/weekly: check if completed after period start
        SELECT EXISTS (
            SELECT 1 FROM public.player_tasks
            WHERE player_id = player_id_input 
              AND task_id = task_id_input
              AND is_completed = true
              AND completed_at >= period_start
        ) INTO is_already_completed;
    ELSE
        -- One-time task: check if ever completed
        SELECT COALESCE(is_completed, false) INTO is_already_completed
        FROM public.player_tasks
        WHERE player_id = player_id_input AND task_id = task_id_input;
    END IF;
    
    IF is_already_completed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already claimed this period');
    END IF;
    
    -- VERIFY REQUIREMENT IS MET
    check_result := check_task_completion(player_id_input, task_id_input);
    
    IF NOT (check_result->>'can_claim')::boolean THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', COALESCE(check_result->>'message', 'Requirement not met'),
            'progress', (check_result->>'progress')::integer,
            'target', (check_result->>'target')::integer
        );
    END IF;
    
    -- Mark as completed (Upsert)
    INSERT INTO public.player_tasks (player_id, task_id, is_completed, completed_at, progress, period_start)
    VALUES (player_id_input, task_id_input, true, NOW(), (check_result->>'progress')::integer, period_start)
    ON CONFLICT (player_id, task_id)
    DO UPDATE SET 
        is_completed = true,
        completed_at = NOW(),
        progress = (check_result->>'progress')::integer,
        period_start = period_start;

    -- Give Reward
    IF task_reward_type = 'cash' THEN
        UPDATE public.players SET cash = cash + task_reward_amount WHERE id = player_id_input;
        reward_display := '$' || task_reward_amount::TEXT;
    ELSIF task_reward_type = 'diamonds' THEN
        UPDATE public.players SET diamonds = diamonds + task_reward_amount WHERE id = player_id_input;
        reward_display := task_reward_amount::TEXT || ' 💎';
    ELSIF task_reward_type = 'energy' THEN
        UPDATE public.players SET energy = LEAST(energy + task_reward_amount, max_energy) WHERE id = player_id_input;
        reward_display := task_reward_amount::TEXT || ' ⚡';
    ELSE
        reward_display := task_reward_amount::TEXT || ' ' || task_reward_type;
    END IF;

    -- Log transaction (only for cash/diamonds)
    IF task_reward_type IN ('cash', 'diamonds') THEN
        INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'task_reward', task_reward_type, task_reward_amount, 'Completed task: ' || task_title);
    END IF;

    -- Create notification for Activity page
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        player_id_input, 
        'reward', 
        'Task Completed',
        'Completed "' || task_title || '" and earned ' || reward_display
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Task completed!',
        'reward_type', task_reward_type,
        'reward_amount', task_reward_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 8. GET TASKS WITH PROGRESS (FOR UI)
-- =====================================================

CREATE OR REPLACE FUNCTION get_tasks_with_progress(player_id_input UUID)
RETURNS TABLE (
    id UUID,
    task_id UUID,
    title TEXT,
    description TEXT,
    task_type TEXT,
    reward_type TEXT,
    reward_amount INTEGER,
    link TEXT,
    requirement_type TEXT,
    requirement_target INTEGER,
    progress INTEGER,
    is_completed BOOLEAN,
    can_claim BOOLEAN,
    reset_hours INTEGER
) AS $$
DECLARE
    period_start_daily TIMESTAMPTZ;
    period_start_weekly TIMESTAMPTZ;
BEGIN
    -- Pre-calculate period starts
    period_start_daily := get_task_period_start(24);
    period_start_weekly := get_task_period_start(168);
    
    RETURN QUERY
    SELECT 
        COALESCE(pt.id, td.id) as id,
        td.id as task_id,
        td.title,
        td.description,
        td.task_type,
        td.reward_type,
        td.reward_amount,
        td.link,
        td.requirement_type,
        COALESCE(td.requirement_target, 1) as requirement_target,
        calculate_task_progress(
            player_id_input,
            COALESCE(td.requirement_type, 'login'),
            COALESCE(td.requirement_target, 1),
            CASE 
                WHEN td.reset_hours = 24 THEN period_start_daily
                WHEN td.reset_hours = 168 THEN period_start_weekly
                ELSE NULL
            END
        ) as progress,
        -- is_completed: Check if completed THIS period
        CASE 
            WHEN td.reset_hours IS NULL THEN COALESCE(pt.is_completed, false)
            WHEN td.reset_hours = 24 THEN COALESCE(pt.completed_at >= period_start_daily AND pt.is_completed, false)
            WHEN td.reset_hours = 168 THEN COALESCE(pt.completed_at >= period_start_weekly AND pt.is_completed, false)
            ELSE COALESCE(pt.is_completed, false)
        END as is_completed,
        -- can_claim: Progress >= target AND not already claimed this period
        (
            calculate_task_progress(
                player_id_input,
                COALESCE(td.requirement_type, 'login'),
                COALESCE(td.requirement_target, 1),
                CASE 
                    WHEN td.reset_hours = 24 THEN period_start_daily
                    WHEN td.reset_hours = 168 THEN period_start_weekly
                    ELSE NULL
                END
            ) >= COALESCE(td.requirement_target, 1)
        ) AND NOT (
            CASE 
                WHEN td.reset_hours IS NULL THEN COALESCE(pt.is_completed, false)
                WHEN td.reset_hours = 24 THEN COALESCE(pt.completed_at >= period_start_daily AND pt.is_completed, false)
                WHEN td.reset_hours = 168 THEN COALESCE(pt.completed_at >= period_start_weekly AND pt.is_completed, false)
                ELSE COALESCE(pt.is_completed, false)
            END
        ) as can_claim,
        td.reset_hours
    FROM public.task_definitions td
    LEFT JOIN public.player_tasks pt ON pt.task_id = td.id AND pt.player_id = player_id_input
    WHERE td.is_active = true
    ORDER BY 
        CASE td.task_type 
            WHEN 'telegram' THEN 1 
            WHEN 'daily' THEN 2 
            WHEN 'weekly' THEN 3 
            WHEN 'special' THEN 4
            WHEN 'ad' THEN 5
            ELSE 6 
        END,
        td.requirement_target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 9. ENSURE STAT TRAINING IS LOGGED FOR TASK TRACKING
-- =====================================================

-- Update train_stat to use consistent transaction_type
CREATE OR REPLACE FUNCTION train_stat(
    target_player_id UUID,
    stat_name TEXT,
    training_cost INTEGER
) RETURNS JSONB AS $$
DECLARE
    current_cash BIGINT;
    current_level INTEGER;
    new_level INTEGER;
BEGIN
    -- Get current values
    SELECT cash INTO current_cash FROM public.players WHERE id = target_player_id;
    
    IF current_cash IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    IF current_cash < training_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
    END IF;
    
    -- Get current stat level
    IF stat_name = 'strength' THEN
        SELECT strength INTO current_level FROM public.players WHERE id = target_player_id;
    ELSIF stat_name = 'defense' THEN
        SELECT defense INTO current_level FROM public.players WHERE id = target_player_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid stat name');
    END IF;
    
    new_level := current_level + 1;
    
    -- Deduct cash and increase stat
    IF stat_name = 'strength' THEN
        UPDATE public.players 
        SET cash = cash - training_cost, strength = new_level, updated_at = NOW()
        WHERE id = target_player_id;
    ELSE
        UPDATE public.players 
        SET cash = cash - training_cost, defense = new_level, updated_at = NOW()
        WHERE id = target_player_id;
    END IF;
    
    -- Log transaction with consistent type for task tracking
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (target_player_id, 'stat_training', 'cash', -training_cost, 'Training: ' || stat_name || ' to level ' || new_level);
    
    -- Create notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        target_player_id,
        'upgrade',
        'Training Complete',
        'Trained ' || stat_name || ' to level ' || new_level
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', stat_name || ' increased to level ' || new_level,
        'new_level', new_level
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION get_task_period_start(INTEGER) IS 'Returns the start of the current period for daily (24h) or weekly (168h) tasks';
COMMENT ON FUNCTION calculate_task_progress(UUID, TEXT, INTEGER, TIMESTAMPTZ) IS 'Calculates actual progress for a task by querying relevant logs';
COMMENT ON FUNCTION check_task_completion(UUID, UUID) IS 'Verifies if a player has met the requirements to claim a task';
COMMENT ON FUNCTION get_tasks_with_progress(UUID) IS 'Returns all tasks with calculated progress for the UI';
