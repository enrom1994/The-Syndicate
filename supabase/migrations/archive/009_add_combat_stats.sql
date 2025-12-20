-- =====================================================
-- ADD COMBAT STATS TO PLAYERS
-- =====================================================

-- We need these columns for quick PVP lookups.
-- While "Total Attack" is sum of items, we will store a cache or base value here.
-- For now, we will treat these as the "Base Stats" + "Cached Equipment Bonus".

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS attack INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS defense INTEGER DEFAULT 10;

-- Update existing players to have at least the default
UPDATE public.players SET attack = 10 WHERE attack IS NULL;
UPDATE public.players SET defense = 10 WHERE defense IS NULL;
