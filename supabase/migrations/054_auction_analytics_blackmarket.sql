-- =====================================================
-- AUCTION HOUSE EXPANSION & BLACK MARKET FIX
-- =====================================================
-- Step 2: Auction analytics, recent sales, monitoring
-- Step 3: Black Market ROI reduced to 8 hours

-- =====================================================
-- 1. ADD SOLD_AT COLUMN
-- =====================================================
ALTER TABLE public.auction_listings 
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ DEFAULT NULL;

-- Update existing sold listings
UPDATE public.auction_listings 
SET sold_at = created_at 
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
            SELECT jsonb_object_agg(sub.name, sub.avg_price)
            FROM (
                SELECT id.name, ROUND(AVG(COALESCE(al.current_bid, al.buy_now_price))) as avg_price
                FROM auction_listings al
                JOIN item_definitions id ON al.item_id = id.id
                WHERE al.status = 'sold' AND al.sold_at > NOW() - INTERVAL '7 days'
                GROUP BY id.name
            ) sub
        ),
        'hot_items', (
            SELECT jsonb_agg(jsonb_build_object(
                'item_name', item_name,
                'bid_count', bid_count
            ))
            FROM (
                SELECT id.name as item_name, COUNT(ab.id) as bid_count
                FROM auction_listings al
                JOIN item_definitions id ON al.item_id = id.id
                LEFT JOIN auction_bids ab ON al.id = ab.auction_id
                WHERE al.status = 'active'
                GROUP BY al.id, id.name
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
        SELECT COALESCE(jsonb_agg(sale), '[]'::jsonb)
        FROM (
            SELECT jsonb_build_object(
                'item_name', id.name,
                'quantity', al.quantity,
                'sale_price', COALESCE(al.current_bid, al.buy_now_price),
                'currency', al.currency,
                'sold_at', al.sold_at,
                'seller_name', p.username
            ) as sale
            FROM auction_listings al
            JOIN item_definitions id ON al.item_id = id.id
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
        AVG(CASE WHEN al.currency = 'cash' THEN COALESCE(al.current_bid, al.buy_now_price) END),
        AVG(CASE WHEN al.currency = 'diamonds' THEN COALESCE(al.current_bid, al.buy_now_price) END),
        COUNT(*)
    INTO avg_cash, avg_diamonds, sale_count
    FROM auction_listings al
    JOIN item_definitions id ON al.item_id = id.id
    WHERE id.name = item_name_input 
      AND al.status = 'sold' 
      AND al.sold_at > NOW() - INTERVAL '7 days';
    
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
-- Current: 25000/hr at 250000 cost = 10 hours
-- Target: 31250/hr at 250000 cost = 8 hours

UPDATE public.business_definitions
SET base_income_per_hour = 31250
WHERE name = 'Black Market';


-- =====================================================
-- 6. AUCTION TELEMETRY VIEW (Admin monitoring)
-- =====================================================
CREATE OR REPLACE VIEW public.auction_telemetry AS
SELECT 
    DATE(al.created_at) as date,
    COUNT(*) as listings_created,
    COUNT(*) FILTER (WHERE al.status = 'sold') as listings_sold,
    COUNT(*) FILTER (WHERE al.status = 'cancelled') as listings_cancelled,
    COUNT(*) FILTER (WHERE al.status = 'expired') as listings_expired,
    SUM(CASE WHEN al.status = 'sold' AND al.currency = 'cash' THEN COALESCE(al.current_bid, al.buy_now_price) ELSE 0 END) as cash_volume,
    SUM(CASE WHEN al.status = 'sold' AND al.currency = 'diamonds' THEN COALESCE(al.current_bid, al.buy_now_price) ELSE 0 END) as diamond_volume
FROM public.auction_listings al
WHERE al.created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(al.created_at)
ORDER BY date DESC;
