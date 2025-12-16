-- Migration: Fix item icon paths to use category-specific folders
-- Weapons -> /images/weapons/
-- Equipment -> /images/equipment/
-- Contraband -> /images/contraband/

-- Update weapon icons
UPDATE public.item_definitions 
SET icon = '/images/weapons/' || LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) || '.png'
WHERE category = 'weapon';

-- Update equipment icons
UPDATE public.item_definitions 
SET icon = '/images/equipment/' || LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) || '.png'
WHERE category = 'equipment';

-- Update contraband icons
UPDATE public.item_definitions 
SET icon = '/images/contraband/' || LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) || '.png'
WHERE category = 'contraband';
