-- =====================================================
-- FIX DAY 7 DAILY REWARD
-- =====================================================
-- Changes Day 7 from "item" (Mystery Reward) to 700 diamonds
-- This gives players almost enough to create a family (1000 diamonds needed)

UPDATE public.daily_reward_definitions
SET 
    reward_type = 'diamonds',
    reward_amount = 700
WHERE day_number = 7;
