-- =====================================================
-- FIX: NULL requirement_type causing tasks to not display
-- =====================================================
-- The task verification migration may have left some tasks without
-- requirement_type values if titles didn't match exactly.
-- This ensures all tasks have valid requirement_type values.

-- Set default requirement_type for any tasks missing it
UPDATE public.task_definitions 
SET requirement_type = CASE 
    WHEN task_type = 'telegram' THEN 'telegram'
    WHEN task_type = 'daily' THEN 'login'
    WHEN task_type = 'weekly' THEN 'login'
    WHEN task_type = 'ad' THEN 'ad_watch'
    ELSE 'login'
END
WHERE requirement_type IS NULL;

-- Ensure requirement_target is set (default 1)
UPDATE public.task_definitions 
SET requirement_target = 1 
WHERE requirement_target IS NULL;

-- Re-apply specific requirements by title pattern matching
UPDATE public.task_definitions 
SET requirement_type = 'job_complete'
WHERE title ILIKE '%job%' AND task_type IN ('daily', 'weekly');

UPDATE public.task_definitions 
SET requirement_type = 'attack_win'
WHERE title ILIKE '%attack%' OR title ILIKE '%warrior%';

UPDATE public.task_definitions 
SET requirement_type = 'business_collect'
WHERE title ILIKE '%collect%' AND title ILIKE '%income%';

UPDATE public.task_definitions 
SET requirement_type = 'stat_train'
WHERE title ILIKE '%train%' AND title ILIKE '%stat%';

-- Set correct targets based on title numbers
UPDATE public.task_definitions SET requirement_target = 3 WHERE title ILIKE '%3 job%';
UPDATE public.task_definitions SET requirement_target = 5 WHERE title ILIKE '%5 job%';
UPDATE public.task_definitions SET requirement_target = 10 WHERE title ILIKE '%10 attack%';
UPDATE public.task_definitions SET requirement_target = 50 WHERE title ILIKE '%50 job%';
UPDATE public.task_definitions SET requirement_target = 500000 WHERE title ILIKE '%500K%' OR title ILIKE '%500k%';

-- Verify the update
SELECT title, task_type, requirement_type, requirement_target, is_active 
FROM task_definitions 
ORDER BY task_type, title;
