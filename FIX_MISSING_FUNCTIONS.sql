-- =====================================================
-- FIX: Missing check_task_completion function
-- Run this in Supabase SQL Editor
-- =====================================================

-- Helper function to get period start
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


-- Calculate task progress function
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


-- Check task completion function (MISSING - required by complete_task)
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


-- Verify the functions exist
SELECT 'check_task_completion exists' WHERE EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'check_task_completion'
);
