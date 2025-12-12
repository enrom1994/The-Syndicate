-- =====================================================
-- FIX: Ambiguous column reference in complete_task
-- Run this in Supabase SQL Editor
-- =====================================================

DROP FUNCTION IF EXISTS complete_task(UUID, UUID);

CREATE OR REPLACE FUNCTION complete_task(
    player_id_input UUID,
    task_id_input UUID
) RETURNS JSONB AS $$
DECLARE
    task RECORD;
    task_period_start TIMESTAMPTZ;  -- Renamed to avoid ambiguity
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
        task_period_start := date_trunc('day', NOW() AT TIME ZONE 'UTC');
    ELSIF task.reset_hours = 168 THEN
        task_period_start := date_trunc('week', NOW() AT TIME ZONE 'UTC');
    ELSE
        task_period_start := NULL;
    END IF;
    
    -- Get existing player_task record
    SELECT * INTO existing_player_task
    FROM public.player_tasks
    WHERE player_id = player_id_input AND task_id = task_id_input;
    
    -- Check if already completed THIS period
    IF task_period_start IS NOT NULL THEN
        -- Daily/weekly: check if completed after period start
        IF existing_player_task IS NOT NULL 
           AND existing_player_task.is_completed = true 
           AND existing_player_task.completed_at >= task_period_start THEN
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
            'message', 'Already claimed this period'
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
    INSERT INTO public.player_tasks (player_id, task_id, is_completed, completed_at, progress, period_start)
    VALUES (player_id_input, task_id_input, true, NOW(), (check_result->>'progress')::integer, task_period_start)
    ON CONFLICT (player_id, task_id)
    DO UPDATE SET 
        is_completed = true,
        completed_at = NOW(),
        progress = (check_result->>'progress')::integer,
        period_start = EXCLUDED.period_start;  -- Use EXCLUDED to reference the new value

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
