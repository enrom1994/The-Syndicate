-- =====================================================
-- ITEM MARKET FIXES (Item Audit P0/P1)
-- =====================================================
-- Source: Item Market Audit (December 19, 2024)
-- Fixes:
--   1. P0: Remove broken income_bonus from items
--   2. P1: Reprice defensive equipment
--   3. P1: Disable Diamond Ring (trap item)
-- =====================================================

SET search_path = public;

-- =====================================================
-- 1. P0: REMOVE INCOME BONUS (Non-functional stat)
-- =====================================================
-- The income_bonus column exists in schema but is NOT
-- implemented in collect_business_income RPC.
-- Players are paying for stats that do nothing.

UPDATE public.item_definitions
SET income_bonus = 0
WHERE income_bonus > 0;

-- Log which items were affected
COMMENT ON COLUMN item_definitions.income_bonus IS 
    'DISABLED: Not implemented in collect_business_income. Set to 0 for all items (Migration 145).';


-- =====================================================
-- 2. P1: REPRICE DEFENSIVE EQUIPMENT
-- =====================================================
-- Problem: DEF costs 2.5-10x more per point than ATK
-- Solution: Bring to ~2.5x ATK cost maximum

-- Fedora Hat: $1,200 → $750 (+5 DEF = $150/DEF)
UPDATE public.item_definitions
SET buy_price = 750, sell_price = 300
WHERE name = 'Fedora Hat';

-- Getaway Car: $5,000 → $2,500 (+10 DEF = $250/DEF)
UPDATE public.item_definitions
SET buy_price = 2500, sell_price = 1500
WHERE name = 'Getaway Car';

-- Safehouse: $20,000 → $6,250 (+25 DEF = $250/DEF)
UPDATE public.item_definitions
SET buy_price = 6250, sell_price = 4375
WHERE name = 'Safehouse';


-- =====================================================
-- 3. P1: DISABLE DIAMOND RING (Trap Item)
-- =====================================================
-- Diamond Ring: +5 DEF, +15% income for $50K
-- With income_bonus broken, this is pure trap.
-- Mark as not purchasable instead of deleting.

UPDATE public.item_definitions
SET is_purchasable = false
WHERE name = 'Diamond Ring';

-- Remove from any player inventories? No - let them keep what they bought.
-- Just prevent new purchases.


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run after migration to verify:

-- Verify income bonuses removed:
-- SELECT name, income_bonus FROM item_definitions WHERE income_bonus > 0;
-- Expected: 0 rows

-- Verify repricing:
-- SELECT name, buy_price, sell_price FROM item_definitions 
-- WHERE name IN ('Fedora Hat', 'Getaway Car', 'Safehouse');
-- Expected: 750/300, 2500/1500, 6250/4375

-- Verify Diamond Ring disabled:
-- SELECT name, is_purchasable FROM item_definitions WHERE name = 'Diamond Ring';
-- Expected: is_purchasable = false


-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE item_definitions IS 
    'Item definitions with P0/P1 fixes applied (Migration 145): income_bonus disabled, DEF repriced, Diamond Ring removed from market.';
