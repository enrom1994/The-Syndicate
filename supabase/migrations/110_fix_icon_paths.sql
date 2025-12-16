-- Migration: Fix item icon paths (blackmarket -> icons folder)
-- Images were moved from /images/blackmarket/ to /images/icons/

-- Update all item_definitions icon paths
UPDATE public.item_definitions 
SET icon = REPLACE(icon, '/images/blackmarket/', '/images/icons/')
WHERE icon LIKE '/images/blackmarket/%';
