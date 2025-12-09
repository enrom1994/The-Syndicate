-- =====================================================
-- AUCTION HOUSE EXPANSION & BLACK MARKET FIX
-- =====================================================
-- Step 2: Auction analytics, recent sales, monitoring
-- Step 3: Black Market ROI reduced to 8 hours

-- =====================================================
-- 1. AUCTION ANALYTICS & MONITORING
-- =====================================================

-- View for recent sales (for price discovery)
CREATE OR REPLACE VIEW public.auction_recent_sales AS
SELECT 
    al.item_id,
    al.item_name,
    al.quantity,
    al.currency,
    COALESCE(al.current_bid, al.buy_now_price) as sale_price,
    al.sold_at,
    al.seller_id,
    p.username as seller_name
FROM public.auction_listings al
LEFT JOIN public.players p ON al.seller_id = p.id
WHERE al.status = 'sold' AND al.sold_at IS NOT NULL
ORDER BY al.sold_at DESC
LIMIT 50;

-- Add sold_at column if missing
ALTER TABLE public.auction_listings 
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ DEFAULT NULL;

-- Update existing sold listings
UPDATE public.auction_listings 
SET sold_at = updated_at 
WHERE status = 'sold' AND sold_at IS NULL;


-- =====================================================
-- 2. GET AUCTION ANALYTICS RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_auction_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_active_listings', (SELECT COUNT(*) FROM auction_listings WHERE status = 'active'),
        'total_sold_today', (SELECT COUNT(*) FROM auction_listings WHERE status = 'sold' AND sold_at > NOW() - INTERVAL '24 hours'),
        'total_volume_today', (SELECT COALESCE(SUM(
            CASE WHEN currency = 'cash' THEN COALESCE(current_bid, buy_now_price) ELSE 0 END
        ), 0) FROM auction_listings WHERE status = 'sold' AND sold_at > NOW() - INTERVAL '24 hours'),
        'avg_price_by_item', (
            SELECT jsonb_object_agg(item_name, avg_price)
            FROM (
                SELECT item_name, ROUND(AVG(COALESCE(current_bid, buy_now_price))) as avg_price
                FROM auction_listings
                WHERE status = 'sold' AND sold_at > NOW() - INTERVAL '7 days'
                GROUP BY item_name
            ) sub
        ),
        'hot_items', (
            SELECT jsonb_agg(jsonb_build_object(
                'item_name', item_name,
                'bid_count', bid_count
            ))
            FROM (
                SELECT al.item_name, COUNT(ab.id) as bid_count
                FROM auction_listings al
                LEFT JOIN auction_bids ab ON al.id = ab.auction_id
                WHERE al.status = 'active'
                GROUP BY al.id, al.item_name
                HAVING COUNT(ab.id) >= 3
                ORDER BY bid_count DESC
                LIMIT 5
            ) sub
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


-- =====================================================
-- 3. GET RECENT SALES RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_recent_sales(limit_count INTEGER DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(sale)
        FROM (
            SELECT jsonb_build_object(
                'item_name', al.item_name,
                'quantity', al.quantity,
                'sale_price', COALESCE(al.current_bid, al.buy_now_price),
                'currency', al.currency,
                'sold_at', al.sold_at,
                'seller_name', p.username
            ) as sale
            FROM auction_listings al
            LEFT JOIN players p ON al.seller_id = p.id
            WHERE al.status = 'sold' AND al.sold_at IS NOT NULL
            ORDER BY al.sold_at DESC
            LIMIT limit_count
        ) sub
    );
END;
$$;


-- =====================================================
-- 4. GET ITEM AVERAGE PRICE (for UI badge)
-- =====================================================
CREATE OR REPLACE FUNCTION get_item_avg_price(item_name_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    avg_cash NUMERIC;
    avg_diamonds NUMERIC;
    sale_count INTEGER;
BEGIN
    -- Get averages from last 7 days
    SELECT 
        AVG(CASE WHEN currency = 'cash' THEN COALESCE(current_bid, buy_now_price) END),
        AVG(CASE WHEN currency = 'diamonds' THEN COALESCE(current_bid, buy_now_price) END),
        COUNT(*)
    INTO avg_cash, avg_diamonds, sale_count
    FROM auction_listings
    WHERE item_name = item_name_input 
      AND status = 'sold' 
      AND sold_at > NOW() - INTERVAL '7 days';
    
    RETURN jsonb_build_object(
        'item_name', item_name_input,
        'avg_cash_price', ROUND(COALESCE(avg_cash, 0)),
        'avg_diamond_price', ROUND(COALESCE(avg_diamonds, 0)),
        'sale_count', sale_count
    );
END;
$$;


-- =====================================================
-- 5. BLACK MARKET ROI FIX (8 hours instead of 10)
-- =====================================================
-- Update Black Market income to achieve ~8 hour ROI
-- Current: 25000/hr at 250000 cost = 10 hours
-- Target: 31250/hr at 250000 cost = 8 hours

UPDATE public.business_definitions
SET base_income_per_hour = 31250
WHERE name = 'Black Market';

-- Also add a comment to track this change
COMMENT ON TABLE public.business_definitions IS 'Business definitions. Black Market updated to 31250/hr for 8hr ROI (was 25000/hr for 10hr).';


-- =====================================================
-- 6. AUCTION TELEMETRY VIEW (Admin monitoring)
-- =====================================================
CREATE OR REPLACE VIEW public.auction_telemetry AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as listings_created,
    COUNT(*) FILTER (WHERE status = 'sold') as listings_sold,
    COUNT(*) FILTER (WHERE status = 'cancelled') as listings_cancelled,
    COUNT(*) FILTER (WHERE status = 'expired') as listings_expired,
    SUM(CASE WHEN status = 'sold' AND currency = 'cash' THEN COALESCE(current_bid, buy_now_price) ELSE 0 END) as cash_volume,
    SUM(CASE WHEN status = 'sold' AND currency = 'diamonds' THEN COALESCE(current_bid, buy_now_price) ELSE 0 END) as diamond_volume
FROM public.auction_listings
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
