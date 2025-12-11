-- =====================================================
-- FIX: Add missing notification types for referral system
-- =====================================================
-- The referral system uses 'achievement' and 'level' notification types
-- which were not included in the notifications_type_check constraint

ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('attack', 'income', 'job', 'family', 'system', 'bounty', 'purchase', 'upgrade', 'reward', 'business', 'achievement', 'level'));

COMMENT ON CONSTRAINT notifications_type_check ON public.notifications 
IS 'Valid notification types including achievement & level for referral system';
