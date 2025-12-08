-- =====================================================
-- ADD ICON COLUMN TO ITEM DEFINITIONS
-- =====================================================

-- Add icon column if it doesn't exist
ALTER TABLE public.item_definitions
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Update existing items with their icon paths
-- Weapons
UPDATE public.item_definitions SET icon = '/images/blackmarket/switchblade.png' WHERE name = 'Switchblade';
UPDATE public.item_definitions SET icon = '/images/blackmarket/brassknuckles.png' WHERE name = 'Brass Knuckles';
UPDATE public.item_definitions SET icon = '/images/blackmarket/sawedoffshotgun.png' WHERE name = 'Sawed-off Shotgun';
UPDATE public.item_definitions SET icon = '/images/blackmarket/tommygun.png' WHERE name = 'Tommy Gun';
UPDATE public.item_definitions SET icon = '/images/blackmarket/goldenrevolver.png' WHERE name = 'Golden Revolver';

-- Equipment
UPDATE public.item_definitions SET icon = '/images/blackmarket/fedorahat.png' WHERE name = 'Fedora Hat';
UPDATE public.item_definitions SET icon = '/images/blackmarket/armoredvest.png' WHERE name = 'Armored Vest';
UPDATE public.item_definitions SET icon = '/images/blackmarket/silksuit.png' WHERE name = 'Silk Suit';
UPDATE public.item_definitions SET icon = '/images/blackmarket/getawaycar.png' WHERE name = 'Getaway Car';
UPDATE public.item_definitions SET icon = '/images/blackmarket/safehouse.png' WHERE name = 'Safehouse';

-- Contraband
UPDATE public.item_definitions SET icon = '/images/blackmarket/whiskeycrate.png' WHERE name = 'Whiskey Crate';
UPDATE public.item_definitions SET icon = '/images/blackmarket/cubancigars.png' WHERE name = 'Cuban Cigars';
UPDATE public.item_definitions SET icon = '/images/blackmarket/counterfeitbills.png' WHERE name = 'Counterfeit Bills';
UPDATE public.item_definitions SET icon = '/images/blackmarket/stolenjewelry.png' WHERE name = 'Stolen Jewelry';
UPDATE public.item_definitions SET icon = '/images/blackmarket/morphinevials.png' WHERE name = 'Morphine Vials';

-- Additional items from blackmarket images
UPDATE public.item_definitions SET icon = '/images/blackmarket/diamondring.png' WHERE name = 'Diamond Ring';
UPDATE public.item_definitions SET icon = '/images/blackmarket/goldwatch.png' WHERE name = 'Gold Watch';
