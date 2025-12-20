-- =====================================================
-- FIX SECURITY DEFINER VIEW WARNINGS
-- =====================================================
-- Forces views to respect Row Level Security (RLS) policies of the invoking user.
-- This resolves warnings about views bypassing RLS.

-- 1. Auction Telemetry
ALTER VIEW public.auction_telemetry SET (security_invoker = true);

-- 2. Booster Analytics
ALTER VIEW public.booster_analytics SET (security_invoker = true);

-- 3. Booster Daily Revenue
ALTER VIEW public.booster_daily_revenue SET (security_invoker = true);
