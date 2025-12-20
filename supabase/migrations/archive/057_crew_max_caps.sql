-- =====================================================
-- INCREASE CREW MAX CAPS
-- =====================================================
-- Increases max_available for all crew types to support
-- larger operations and production recipes.

-- Current values → New values (roughly doubled or more)
UPDATE public.crew_definitions SET max_available = 150 WHERE name = 'Street Thug';         -- was 99
UPDATE public.crew_definitions SET max_available = 50 WHERE name = 'Bodyguard';            -- was 25
UPDATE public.crew_definitions SET max_available = 30 WHERE name = 'Getaway Driver';       -- was 15
UPDATE public.crew_definitions SET max_available = 10 WHERE name = 'Professional Hitman';  -- was 5
UPDATE public.crew_definitions SET max_available = 8 WHERE name = 'Crooked Accountant';    -- was 3
UPDATE public.crew_definitions SET max_available = 5 WHERE name = 'Enforcer Captain';      -- was 2
UPDATE public.crew_definitions SET max_available = 3 WHERE name = 'Personal Guard';        -- was 1
