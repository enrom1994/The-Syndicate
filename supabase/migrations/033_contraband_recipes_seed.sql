-- =====================================================
-- CONTRABAND RECIPES SEED DATA
-- =====================================================
-- Links businesses to crew requirements and contraband output
-- Run AFTER 032_contraband_production.sql

-- Speakeasy produces Whiskey Crates using Bodyguards
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    7,  -- 7 bodyguards required
    id.id,
    25, -- 25 whiskey crates
    24  -- 24 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Speakeasy'
  AND cd.name = 'Bodyguard'
  AND id.name = 'Whiskey Crate';

-- Nightclub produces Cuban Cigars using Street Thugs
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    10, -- 10 thugs required
    id.id,
    30, -- 30 cigars
    24  -- 24 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Nightclub'
  AND cd.name = 'Street Thug'
  AND id.name = 'Cuban Cigars';

-- Casino produces Cuban Cigars using Professional Hitman (premium production)
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    2,  -- 2 hitmen required (expensive)
    id.id,
    50, -- 50 cigars (higher output)
    12  -- 12 hour cooldown (faster)
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Casino'
  AND cd.name = 'Professional Hitman'
  AND id.name = 'Cuban Cigars';

-- Smuggling Route produces Whiskey Crates using Getaway Drivers
INSERT INTO public.contraband_recipes (business_id, crew_id, crew_required, output_item_id, output_quantity, cooldown_hours)
SELECT 
    bd.id,
    cd.id,
    5,  -- 5 drivers required
    id.id,
    40, -- 40 crates (efficient smuggling)
    18  -- 18 hour cooldown
FROM business_definitions bd
CROSS JOIN crew_definitions cd
CROSS JOIN item_definitions id
WHERE bd.name = 'Smuggling Route'
  AND cd.name = 'Getaway Driver'
  AND id.name = 'Whiskey Crate';
