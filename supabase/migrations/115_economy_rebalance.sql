-- =====================================================
-- ECONOMY REBALANCE (RECURRING REVENUE OPTIMIZATION)
-- =====================================================
-- Goal: Create sustainable TON income through fair, repeatable purchases
-- Target: Daily/weekly spend, not one-time optimization

SET search_path = public;

-- =====================================================
-- 1. UNIFY PROTECTION PRICING (Fix 2.4x Diamond Markup)
-- =====================================================
-- Shield booster was 100💎 for 6h, TON protection was 0.35 TON
-- At 120💎/TON: 100💎 = 0.83 TON (2.4x more expensive)
-- Solution: Reduce Shield to 50💎 (≈0.42 TON at base rate)

-- Note: Booster costs are in the booster_types table in ShopPage
-- This is handled in frontend ShopPage.tsx update

-- =====================================================
-- 2. REBALANCE INSURANCE (Fix 8x Value Gap)
-- =====================================================
-- Basic was 1 claim for 2 TON (7,500/TON value)
-- Premium was 3 claims for 5 TON (60,000/TON value)
-- Solution: Increase Basic claims to 3, reduce Premium price to 4 TON (frontend)

-- Update insurance definitions if they exist in database
-- Note: Insurance is primarily purchased via RPC, pricing in frontend

-- =====================================================
-- 3. FIX BLACK MARKET ROI (TON-Gated Must Outperform)
-- =====================================================
-- Black Market: $500K cost, $50K/h income = 10h ROI (WORST)
-- Smuggling Route: $150K cost, $25K/h income = 6h ROI (cash-only)
-- Solution: Increase Black Market income to $75K/h = 6.67h ROI

UPDATE public.business_definitions
SET base_income_per_hour = 75000
WHERE name = 'Black Market';

-- =====================================================
-- 4. BALANCE ATTACK VS DEFENSE (Defense 5-10x Worse)
-- =====================================================
-- Attack: $100-667 per point
-- Defense: $500-1000 per point
-- Solution: Reduce defense item prices by 40-50%

-- Fedora Hat: $2K → $1.2K (+5 defense)
UPDATE public.item_definitions
SET buy_price = 1200
WHERE name = 'Fedora Hat';

-- Silk Suit: $5K → $3K (+3 defense, +5 income)
UPDATE public.item_definitions
SET buy_price = 3000
WHERE name = 'Silk Suit';

-- Armored Vest: $10K → $5K (+20 defense)
UPDATE public.item_definitions
SET buy_price = 5000
WHERE name = 'Armored Vest';

-- =====================================================
-- 5. FIX GOLD WATCH (125-Day ROI Unacceptable)
-- =====================================================
-- Was: $30K for +10 income = 3,000h ROI (125 days)
-- Solution: Reduce to $8K = 800h ROI (33 days)

UPDATE public.item_definitions
SET buy_price = 8000
WHERE name = 'Gold Watch';

-- =====================================================
-- 6. RARITY-BASED RESALE (Remove Flat 50% Loss)
-- =====================================================
-- Common: 40% | Uncommon: 50% | Rare: 60% | Legendary: 70%
-- This creates partial liquidity and rewards rarity

-- Update sell prices based on rarity
-- Common weapons (40% of buy)
UPDATE public.item_definitions
SET sell_price = FLOOR(buy_price * 0.4)
WHERE rarity = 'common' AND category IN ('weapon', 'equipment');

-- Uncommon weapons/equipment (50% - unchanged)
UPDATE public.item_definitions
SET sell_price = FLOOR(buy_price * 0.5)
WHERE rarity = 'uncommon' AND category IN ('weapon', 'equipment');

-- Rare weapons/equipment (60% of buy)
UPDATE public.item_definitions
SET sell_price = FLOOR(buy_price * 0.6)
WHERE rarity = 'rare' AND category IN ('weapon', 'equipment');

-- Legendary weapons/equipment (70% of buy)
UPDATE public.item_definitions
SET sell_price = FLOOR(buy_price * 0.7)
WHERE rarity = 'legendary' AND category IN ('weapon', 'equipment');

-- =====================================================
-- 7. IMPROVE STANDARD PROTECTION (Secondary Fix)
-- =====================================================
-- Handled in frontend: 0.35 TON → 0.25 TON

-- =====================================================
-- 8. STARTER PACK ALIGNMENT (Secondary Fix)
-- =====================================================
-- Increase diamonds from 100 to 120 to match base rate

-- Update buy_starter_pack RPC
CREATE OR REPLACE FUNCTION buy_starter_pack(
    buyer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_level INTEGER;
    p_created_at TIMESTAMPTZ;
    p_claimed BOOLEAN;
    hours_since_creation INTEGER;
    speakeasy_id UUID;
    whiskey_id UUID;
    made_man_achievement_id UUID;
BEGIN
    -- Get player info
    SELECT level, created_at, starter_pack_claimed 
    INTO p_level, p_created_at, p_claimed
    FROM players
    WHERE id = buyer_id;
    
    IF p_level IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found.');
    END IF;
    
    -- Check if already claimed
    IF p_claimed = true THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already claimed the starter pack.');
    END IF;
    
    -- Check if account is within 24 hours
    hours_since_creation := EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600;
    IF hours_since_creation > 24 THEN
        RETURN jsonb_build_object('success', false, 'message', 'The starter pack offer has expired (24-hour limit).');
    END IF;
    
    -- Get Speakeasy business definition ID
    SELECT id INTO speakeasy_id
    FROM business_definitions
    WHERE name = 'Speakeasy'
    LIMIT 1;
    
    -- Get Whiskey Crate item ID
    SELECT id INTO whiskey_id
    FROM item_definitions
    WHERE name = 'Whiskey Crate'
    LIMIT 1;
    
    -- Get Made Man achievement ID
    SELECT id INTO made_man_achievement_id
    FROM achievement_definitions
    WHERE name = 'Made Man'
    LIMIT 1;
    
    IF speakeasy_id IS NULL OR whiskey_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Required items not found in database.');
    END IF;
    
    -- 1. Boost to Level 3 (if currently below)
    IF p_level < 3 THEN
        UPDATE players
        SET 
            level = 3,
            experience = 0, -- Reset XP for new level
            energy = max_energy, -- Refill energy
            stamina = max_stamina, -- Refill stamina
            updated_at = NOW()
        WHERE id = buyer_id;
    END IF;
    
    -- 2. Add $25,000 cash
    UPDATE players
    SET cash = cash + 25000,
        updated_at = NOW()
    WHERE id = buyer_id;
    
    -- 3. Add 120 Diamonds (INCREASED FROM 100)
    UPDATE players
    SET diamonds = diamonds + 120,
        updated_at = NOW()
    WHERE id = buyer_id;
    
    -- 4. Add "Half-built" Speakeasy (broken status)
    INSERT INTO player_businesses (player_id, business_id, level, status)
    VALUES (buyer_id, speakeasy_id, 1, 'broken')
    ON CONFLICT (player_id, business_id) DO NOTHING;
    
    -- 5. Add 10x Whiskey Crates
    INSERT INTO player_inventory (player_id, item_id, quantity)
    VALUES (buyer_id, whiskey_id, 10)
    ON CONFLICT (player_id, item_id)
    DO UPDATE SET quantity = player_inventory.quantity + 10;
    
    -- 6. Grant "Made Man" Achievement (if exists)
    IF made_man_achievement_id IS NOT NULL THEN
        INSERT INTO player_achievements (player_id, achievement_id, progress, is_unlocked, is_claimed, unlocked_at, claimed_at)
        VALUES (buyer_id, made_man_achievement_id, 1, true, true, NOW(), NOW())
        ON CONFLICT (player_id, achievement_id) DO NOTHING;
    END IF;
    
    -- 7. Mark as claimed
    UPDATE players
    SET 
        starter_pack_claimed = true,
        starter_pack_claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = buyer_id;
    
    -- 8. Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES 
        (buyer_id, 'starter_pack', 'cash', 25000, 'Starter Pack: +$25,000'),
        (buyer_id, 'starter_pack', 'diamonds', 120, 'Starter Pack: +120 Diamonds');
    
    -- 9. Create notification
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        buyer_id,
        'reward',
        'Welcome to the Family!',
        'You are now a Made Man. Check your businesses and inventory for your rewards.'
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Welcome to the family! You are now a Made Man.',
        'rewards', jsonb_build_object(
            'level', 3,
            'cash', 25000,
            'diamonds', 120,
            'whiskey', 10,
            'business', 'Speakeasy (Needs Repair)'
        )
    );
END;
$$;

ALTER FUNCTION public.buy_starter_pack(UUID) SET search_path = public;

-- =====================================================
-- 9. UPDATE INSURANCE RPC (Backend Consistency)
-- =====================================================
-- Match frontend: Basic insurance now gives 3 claims (was 1)
-- Premium stays at 3 claims but price reduced to 4 TON (frontend only)

CREATE OR REPLACE FUNCTION purchase_insurance(
    player_id_input UUID,
    insurance_type_input TEXT -- 'basic' or 'premium'
)
RETURNS JSONB AS $$
DECLARE
    mitigation INTEGER;
    max_cov BIGINT;
    claims INTEGER;
BEGIN
    -- Validate insurance type
    IF insurance_type_input NOT IN ('basic', 'premium') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid insurance type');
    END IF;

    -- Set tier values (UPDATED: Basic now 3 claims)
    IF insurance_type_input = 'basic' THEN
        mitigation := 30;
        max_cov := 50000;
        claims := 3; -- CHANGED FROM 1
    ELSE -- premium
        mitigation := 50;
        max_cov := 200000;
        claims := 3;
    END IF;

    -- Insert or update (extend) insurance
    INSERT INTO public.player_insurance (
        player_id, insurance_type, mitigation_percent, max_coverage, claims_remaining
    )
    VALUES (
        player_id_input, insurance_type_input, mitigation, max_cov, claims
    )
    ON CONFLICT (player_id, insurance_type) 
    DO UPDATE SET 
        claims_remaining = player_insurance.claims_remaining + claims,
        purchased_at = NOW();

    -- Log transaction (NOTE: Price is 2 TON for Basic, 4 TON for Premium - frontend handles actual charge)
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'purchase', 'ton', 
            CASE WHEN insurance_type_input = 'basic' THEN -2 ELSE -4 END, 
            'Purchased ' || insurance_type_input || ' insurance');

    -- Notification (UPDATED: Basic now shows 3 claims)
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (player_id_input, 'purchase', '🛡️ Insurance Purchased', 
            CASE WHEN insurance_type_input = 'basic' 
                THEN 'Basic Insurance: 30% loss reduction, up to $50K, 3 claims'
                ELSE 'Premium Insurance: 50% loss reduction, up to $200K, 3 claims'
            END);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Insurance purchased successfully',
        'insurance_type', insurance_type_input,
        'mitigation_percent', mitigation,
        'max_coverage', max_cov,
        'claims', claims
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.purchase_insurance(UUID, TEXT) SET search_path = public;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify:

-- SELECT name, base_income_per_hour FROM business_definitions WHERE name = 'Black Market';
-- Expected: 75000

-- SELECT name, buy_price, sell_price FROM item_definitions WHERE category = 'equipment';
-- Expected: Fedora 1200, Silk Suit 3000, Armored Vest 5000, Gold Watch 8000

-- SELECT name, rarity, buy_price, sell_price, ROUND((sell_price::FLOAT / buy_price) * 100) as resale_pct
-- FROM item_definitions WHERE category IN ('weapon', 'equipment') ORDER BY rarity;
-- Expected: Common ~40%, Uncommon ~50%, Rare ~60%, Legendary ~70%

COMMENT ON COLUMN business_definitions.base_income_per_hour IS 'Rebalanced: Black Market now $75K/h (was $50K/h)';
COMMENT ON COLUMN item_definitions.buy_price IS 'Rebalanced: Defense items -40-50%, Gold Watch reduced to $8K';
COMMENT ON COLUMN item_definitions.sell_price IS 'Rebalanced: Rarity-based depreciation (40-70%)';
