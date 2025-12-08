# Fix "Zero Income" & Missing Data

The "Total Income" is 0 because the app isn't allowed to read the "Business Stats" (like base income) from the database security rules. We need to make these "Definition" tables public so everyone can see the stats.

## Instructions

1.  Open your **Supabase Dashboard**.
2.  Go to the **SQL Editor**.
3.  Click **New Query**.
4.  Copy the code below entirely and paste it into the editor.
5.  Click **Run**.

```sql
-- =====================================================
-- FIX: PUBLIC ACCESS FOR DEFINITIONS
-- =====================================================
-- The app needs to read these "static" tables to know prices, stats, and names.
-- Without this, you own the "item" but can't see its name or stats (Income = 0).

-- Business Definitions
ALTER TABLE public.business_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read business_definitions" ON public.business_definitions;
CREATE POLICY "Public read business_definitions" ON public.business_definitions FOR SELECT USING (true);

-- Item Definitions
ALTER TABLE public.item_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read item_definitions" ON public.item_definitions;
CREATE POLICY "Public read item_definitions" ON public.item_definitions FOR SELECT USING (true);

-- Crew Definitions
ALTER TABLE public.crew_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read crew_definitions" ON public.crew_definitions;
CREATE POLICY "Public read crew_definitions" ON public.crew_definitions FOR SELECT USING (true);

-- Job Definitions
ALTER TABLE public.job_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read job_definitions" ON public.job_definitions;
CREATE POLICY "Public read job_definitions" ON public.job_definitions FOR SELECT USING (true);

-- Task Definitions
ALTER TABLE public.task_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read task_definitions" ON public.task_definitions;
CREATE POLICY "Public read task_definitions" ON public.task_definitions FOR SELECT USING (true);

-- Achievement Definitions
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read achievement_definitions" ON public.achievement_definitions;
CREATE POLICY "Public read achievement_definitions" ON public.achievement_definitions FOR SELECT USING (true);

-- Daily Reward Definitions
ALTER TABLE public.daily_reward_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read daily_reward_definitions" ON public.daily_reward_definitions;
CREATE POLICY "Public read daily_reward_definitions" ON public.daily_reward_definitions FOR SELECT USING (true);
```
