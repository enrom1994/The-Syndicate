-- =====================================================
-- FIX TASKS PAGE - Daily/Weekly Rewards Claiming
-- Run this directly in Supabase SQL Editor
-- =====================================================
-- Issue: Users can't claim daily rewards even when tasks are complete
-- Root Cause: Missing/incorrect requirement_type and period logic


-- =====================================================
-- STEP 1: Check current task definitions
-- =====================================================
-- Run this first to see current state
SELECT id, title, task_type, requirement_type, requirement_target, reset_hours, is_active 
FROM task_definitions 
WHERE is_active = true
ORDER BY task_type, title;


-- =====================================================
-- STEP 2: Fix any NULL or incorrect requirement_type values
-- =====================================================

-- Set default requirement_type for any tasks missing it
UPDATE task_definitions 
SET requirement_type = CASE
    WHEN task_type = 'telegram' THEN 'telegram'
    WHEN task_type = 'daily' AND title ILIKE '%login%' THEN 'login'
    WHEN task_type = 'daily' AND title ILIKE '%job%' THEN 'job_complete'
    WHEN task_type = 'daily' AND title ILIKE '%attack%' THEN 'attack_win'
    WHEN task_type = 'daily' AND title ILIKE '%collect%' THEN 'business_collect'
    WHEN task_type = 'daily' AND title ILIKE '%train%' THEN 'stat_train'
    WHEN task_type = 'weekly' AND title ILIKE '%warrior%' THEN 'attack_win'
    WHEN task_type = 'weekly' AND title ILIKE '%mogul%' THEN 'business_income'
    WHEN task_type = 'weekly' AND title ILIKE '%job%' THEN 'job_complete'
    ELSE 'login'
END
WHERE requirement_type IS NULL;

-- Ensure requirement_target defaults to 1
UPDATE task_definitions SET requirement_target = 1 WHERE requirement_target IS NULL;


-- =====================================================
-- STEP 3: Fix the get_tasks_with_progress function
-- This ensures proper calculation of can_claim and is_completed
-- =====================================================

DROP FUNCTION IF EXISTS get_tasks_with_progress(UUID);

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
    -- Pre-calculate period starts (UTC)
    period_start_daily := date_trunc('day', NOW() AT TIME ZONE 'UTC');
    period_start_weekly := date_trunc('week', NOW() AT TIME ZONE 'UTC');
    
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
        -- Calculate current progress
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
        -- Put claimable tasks first
        CASE WHEN (
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
        ) THEN 0 ELSE 1 END,
        -- Then by type
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
-- STEP 4: DIAGNOSE the player_tasks table
-- Run this to see what's stored for this player
-- =====================================================
-- Replace with your player ID
-- SELECT pt.*, td.title, td.reset_hours
-- FROM player_tasks pt
-- JOIN task_definitions td ON td.id = pt.task_id
-- WHERE pt.player_id = 'YOUR_PLAYER_ID'
-- ORDER BY pt.completed_at DESC;


-- =====================================================
-- STEP 5: FIX the complete_task function
-- The issue: get_tasks_with_progress shows can_claim=true 
-- but complete_task says "already completed"
-- =====================================================

DROP FUNCTION IF EXISTS complete_task(UUID, UUID);

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
    existing_player_task RECORD;
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
    IF task.reset_hours = 24 THEN
        period_start := date_trunc('day', NOW() AT TIME ZONE 'UTC');
    ELSIF task.reset_hours = 168 THEN
        period_start := date_trunc('week', NOW() AT TIME ZONE 'UTC');
    ELSE
        period_start := NULL;
    END IF;
    
    -- Get existing player_task record
    SELECT * INTO existing_player_task
    FROM public.player_tasks
    WHERE player_id = player_id_input AND task_id = task_id_input;
    
    -- Check if already completed THIS period
    IF period_start IS NOT NULL THEN
        -- Daily/weekly: check if completed after period start
        IF existing_player_task IS NOT NULL 
           AND existing_player_task.is_completed = true 
           AND existing_player_task.completed_at >= period_start THEN
            is_already_completed := true;
        END IF;
    ELSE
        -- One-time task: check if ever completed
        IF existing_player_task IS NOT NULL AND existing_player_task.is_completed = true THEN
            is_already_completed := true;
        END IF;
    END IF;
    
    IF is_already_completed THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Already claimed this period',
            'period_start', period_start,
            'completed_at', existing_player_task.completed_at
        );
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
    -- IMPORTANT: Reset is_completed and progress for recurring tasks at new period
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
-- STEP 6: Reset stale daily task completions
-- This resets any tasks that were completed BEFORE today
-- so they can be claimed again
-- =====================================================

UPDATE player_tasks pt
SET is_completed = false, progress = 0
FROM task_definitions td
WHERE pt.task_id = td.id
  AND td.reset_hours = 24
  AND pt.is_completed = true
  AND pt.completed_at < date_trunc('day', NOW() AT TIME ZONE 'UTC');

-- Also reset weekly tasks completed before this week
UPDATE player_tasks pt
SET is_completed = false, progress = 0
FROM task_definitions td
WHERE pt.task_id = td.id
  AND td.reset_hours = 168
  AND pt.is_completed = true
  AND pt.completed_at < date_trunc('week', NOW() AT TIME ZONE 'UTC');


-- =====================================================
-- STEP 7: Add 'Login' task for daily login reward
-- =====================================================
INSERT INTO task_definitions (title, description, task_type, reward_type, reward_amount, requirement_type, requirement_target, reset_hours, is_active)
SELECT 'Daily Login', 'Login every day to earn rewards!', 'daily', 'cash', 5000, 'login', 1, 24, true
WHERE NOT EXISTS (
    SELECT 1 FROM task_definitions WHERE title ILIKE '%daily login%' OR title = 'Daily Login'
);


-- =====================================================
-- STEP 8: Verify the fix 
-- =====================================================
-- After running this, refresh the Tasks page and try claiming again
