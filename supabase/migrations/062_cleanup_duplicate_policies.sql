-- =====================================================
-- CLEANUP: Remove Duplicate RLS Policies
-- =====================================================
-- Issue: Multiple permissive policies exist for the same role/action
-- on several definition tables, causing performance overhead.
--
-- Solution: Drop the duplicate "Anyone can read..." policies from
-- 001_initial_schema.sql, keeping only the "Public read..." policies
-- from 006_public_definitions.sql

-- Drop duplicate policies (keep the "Public read..." versions)

-- achievement_definitions
DROP POLICY IF EXISTS "Anyone can read achievement definitions" ON public.achievement_definitions;

-- item_definitions
DROP POLICY IF EXISTS "Anyone can read item definitions" ON public.item_definitions;

-- crew_definitions
DROP POLICY IF EXISTS "Anyone can read crew definitions" ON public.crew_definitions;

-- business_definitions
DROP POLICY IF EXISTS "Anyone can read business definitions" ON public.business_definitions;

-- job_definitions
DROP POLICY IF EXISTS "Anyone can read job definitions" ON public.job_definitions;

-- task_definitions
DROP POLICY IF EXISTS "Anyone can read task definitions" ON public.task_definitions;

-- daily_reward_definitions
DROP POLICY IF EXISTS "Anyone can read daily reward definitions" ON public.daily_reward_definitions;

-- Verification comment:
-- After running this migration, each table should have only ONE policy for SELECT:
-- "Public read [table_name]"
