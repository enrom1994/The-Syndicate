-- =====================================================
-- BLACK MARKET SELLERS (AUCTION REPLACEMENT)
-- =====================================================
-- Replace player-to-player auction with instant system-buy
-- Goal: Maximize cash velocity, minimize friction
-- Rarity-scaled pricing: Common 70%, Uncommon 75%, Rare 80%

SET search_path = public;

-- =====================================================
-- 1. UPDATE CONTRABAND PRICING (Rarity-Scaled Market Rates)
-- =====================================================
-- Current sell_price is what players would get in old system
-- Black Market buys at % of that based on rarity

-- Common contraband: 70% of sell_price
UPDATE public.item_definitions
SET sell_price = FLOOR(sell_price * 0.70)
WHERE category = 'contraband' AND rarity = 'common';

-- Uncommon contraband: 75% of sell_price  
UPDATE public.item_definitions
SET sell_price = FLOOR(sell_price * 0.75)
WHERE category = 'contraband' AND rarity = 'uncommon';

-- Rare contraband: 80% of sell_price
UPDATE public.item_definitions
SET sell_price = FLOOR(sell_price * 0.80)
WHERE category = 'contraband' AND rarity = 'rare';

-- =====================================================
-- 2. BLACK MARKET INSTANT SELL RPC
-- =====================================================
-- Allows players to sell contraband instantly for cash
-- No fees, no waiting, no bidding

CREATE OR REPLACE FUNCTION sell_to_black_market(
    seller_id_input UUID,
    item_id_input UUID,
    quantity_input INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_inventory_rec RECORD;
    item_rec RECORD;
    market_price BIGINT;
    total_payout BIGINT;
BEGIN
    -- Validate quantity
    IF quantity_input <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;

    -- Get item details and verify it's contraband
    SELECT * INTO item_rec
    FROM public.item_definitions
    WHERE id = item_id_input AND category = 'contraband';

    IF item_rec IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found or not contraband');
    END IF;

    -- Check player owns the item in sufficient quantity
    SELECT * INTO player_inventory_rec
    FROM public.player_inventory
    WHERE player_id = seller_id_input AND item_id = item_id_input;

    IF player_inventory_rec IS NULL OR player_inventory_rec.quantity < quantity_input THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Not enough ' || item_rec.name || ' in inventory'
        );
    END IF;

    -- Calculate payout (sell_price already rarity-adjusted)
    market_price := item_rec.sell_price;
    total_payout := market_price * quantity_input;

    -- Remove item from inventory
    IF player_inventory_rec.quantity = quantity_input THEN
        DELETE FROM public.player_inventory 
        WHERE player_id = seller_id_input AND item_id = item_id_input;
    ELSE
        UPDATE public.player_inventory 
        SET quantity = quantity - quantity_input,
            updated_at = NOW()
        WHERE player_id = seller_id_input AND item_id = item_id_input;
    END IF;

    -- Give cash to player
    UPDATE public.players
    SET cash = cash + total_payout,
        updated_at = NOW()
    WHERE id = seller_id_input;

    -- Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (
        seller_id_input,
        'sale',
        'cash',
        total_payout,
        'Sold ' || quantity_input || 'x ' || item_rec.name || ' to Black Market'
    );

    -- Create notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        seller_id_input,
        'income',
        '💰 Contraband Sold',
        'Sold ' || quantity_input || 'x ' || item_rec.name || ' for $' || total_payout
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Sold to Black Market',
        'item_name', item_rec.name,
        'quantity', quantity_input,
        'total_payout', total_payout,
        'price_per_item', market_price
    );
END;
$$;

ALTER FUNCTION public.sell_to_black_market(UUID, UUID, INTEGER) SET search_path = public;

-- =====================================================
-- 3. GET BLACK MARKET PRICES RPC
-- =====================================================
-- Shows current market rates for player's contraband

-- Drop existing function first (changing return type)
DROP FUNCTION IF EXISTS public.get_black_market_prices(UUID);

CREATE OR REPLACE FUNCTION get_black_market_prices(
    player_id_input UUID
)
RETURNS TABLE (
    item_id UUID,
    item_name TEXT,
    rarity TEXT,
    quantity INTEGER,
    market_price BIGINT,
    total_value BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id.id AS item_id,
        id.name AS item_name,
        id.rarity,
        pi.quantity,
        id.sell_price::BIGINT AS market_price,
        (id.sell_price::BIGINT * pi.quantity::BIGINT) AS total_value
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON pi.item_id = id.id
    WHERE pi.player_id = player_id_input 
      AND id.category = 'contraband'
      AND pi.quantity > 0
    ORDER BY id.rarity DESC, id.sell_price DESC;
END;
$$;

ALTER FUNCTION public.get_black_market_prices(UUID) SET search_path = public;

-- =====================================================
-- 4. DEPRECATE AUCTION HOUSE (Soft Disable)
-- =====================================================
-- Prevent new listings but allow existing to expire naturally
-- Note: Existing auctions will expire over 24-48h

COMMENT ON TABLE public.auction_listings IS 'DEPRECATED: Replaced by Black Market Sellers. No new listings allowed.';

-- Update create_auction_listing to reject new listings
CREATE OR REPLACE FUNCTION create_auction_listing(
    seller_id_input UUID,
    item_id_input UUID,
    quantity_input INTEGER,
    currency_input TEXT,
    starting_bid_input BIGINT,
    buy_now_price_input BIGINT,
    duration_hours INTEGER DEFAULT 24
)
RETURNS JSONB AS $$
BEGIN
    -- Auction House deprecated, redirect to Black Market
    RETURN jsonb_build_object(
        'success', false, 
        'message', 'Auction House has been replaced by Black Market Sellers. Use the Black Market page to sell contraband instantly!',
        'deprecated', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.create_auction_listing(UUID, UUID, INTEGER, TEXT, BIGINT, BIGINT, INTEGER) SET search_path = public;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check contraband prices after rarity scaling

-- SELECT name, rarity, sell_price 
-- FROM item_definitions 
-- WHERE category = 'contraband' 
-- ORDER BY rarity, sell_price DESC;

-- Expected results:
-- Common: Whiskey Crate ~$2,450 (was $3,500 * 0.70)
-- Uncommon: Cuban Cigars ~$1,875 (was $2,500 * 0.75), Counterfeit Bills ~$3,000 (was $4,000 * 0.75)
-- Rare: Morphine ~$6,400 (was $8,000 * 0.80), Stolen Jewelry ~$9,600 (was $12,000 * 0.80)

COMMENT ON FUNCTION sell_to_black_market IS 'Instant sell contraband to Black Market at rarity-scaled rates (Common 70%, Uncommon 75%, Rare 80%)';
COMMENT ON FUNCTION get_black_market_prices IS 'Get current Black Market prices for player contraband inventory';
