-- =====================================================
-- AUCTION HOUSE SYSTEM
-- =====================================================
-- P2P marketplace for trading contraband
-- 10💎 flat listing fee, buy/sell in cash or diamonds

-- =====================================================
-- AUCTION LISTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.auction_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.item_definitions(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    
    -- Pricing: can be cash or diamonds
    currency TEXT NOT NULL CHECK (currency IN ('cash', 'diamonds')),
    buy_now_price BIGINT NOT NULL CHECK (buy_now_price > 0),
    starting_bid BIGINT NOT NULL CHECK (starting_bid > 0),
    current_bid BIGINT DEFAULT NULL,
    current_bidder_id UUID DEFAULT NULL REFERENCES public.players(id),
    
    -- Timing
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status: active, sold, expired, cancelled
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_listings_status ON public.auction_listings(status);
CREATE INDEX IF NOT EXISTS idx_auction_listings_seller ON public.auction_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_auction_listings_expires ON public.auction_listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_auction_listings_item ON public.auction_listings(item_id);

-- RLS policies
ALTER TABLE public.auction_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active auctions"
    ON public.auction_listings FOR SELECT
    USING (status = 'active' OR seller_id = auth.uid() OR current_bidder_id = auth.uid());

CREATE POLICY "Players can insert their own listings"
    ON public.auction_listings FOR INSERT
    WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Players can update their own active listings"
    ON public.auction_listings FOR UPDATE
    USING (seller_id = auth.uid() AND status = 'active');


-- =====================================================
-- AUCTION BIDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.auction_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES public.auction_listings(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    bid_amount BIGINT NOT NULL CHECK (bid_amount > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction ON public.auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder ON public.auction_bids(bidder_id);

ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bids on active auctions"
    ON public.auction_bids FOR SELECT
    USING (true);

CREATE POLICY "Players can insert their own bids"
    ON public.auction_bids FOR INSERT
    WITH CHECK (bidder_id = auth.uid());


-- =====================================================
-- CREATE LISTING RPC
-- =====================================================
-- Costs 10 diamonds to list, removes item from inventory
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
DECLARE
    listing_fee INTEGER := 10;  -- 10 diamonds
    player_diamonds INTEGER;
    player_inventory_id UUID;
    player_inventory_qty INTEGER;
    item_name TEXT;
    new_listing_id UUID;
BEGIN
    -- Validate currency
    IF currency_input NOT IN ('cash', 'diamonds') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid currency');
    END IF;

    -- Check player has enough diamonds for listing fee
    SELECT diamonds INTO player_diamonds FROM public.players WHERE id = seller_id_input;
    IF player_diamonds IS NULL OR player_diamonds < listing_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Need 10 diamonds to list');
    END IF;

    -- Check player owns the item
    SELECT pi.id, pi.quantity INTO player_inventory_id, player_inventory_qty
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON pi.item_id = id.id
    WHERE pi.player_id = seller_id_input 
      AND pi.item_id = item_id_input
      AND id.category = 'contraband';  -- Only contraband can be auctioned

    IF player_inventory_id IS NULL OR player_inventory_qty < quantity_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough contraband to list');
    END IF;

    -- Get item name for notification
    SELECT name INTO item_name FROM public.item_definitions WHERE id = item_id_input;

    -- Deduct listing fee
    UPDATE public.players SET diamonds = diamonds - listing_fee WHERE id = seller_id_input;

    -- Remove item from inventory
    IF player_inventory_qty = quantity_input THEN
        DELETE FROM public.player_inventory WHERE id = player_inventory_id;
    ELSE
        UPDATE public.player_inventory SET quantity = quantity - quantity_input WHERE id = player_inventory_id;
    END IF;

    -- Create listing
    INSERT INTO public.auction_listings (
        seller_id, item_id, quantity, currency, starting_bid, buy_now_price, expires_at
    ) VALUES (
        seller_id_input, item_id_input, quantity_input, currency_input, 
        starting_bid_input, buy_now_price_input, 
        NOW() + (duration_hours || ' hours')::INTERVAL
    ) RETURNING id INTO new_listing_id;

    -- Create notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (seller_id_input, 'system', 'Listing Created', 
            'Listed ' || quantity_input || 'x ' || item_name || ' for auction');

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Listing created',
        'listing_id', new_listing_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- PLACE BID RPC
-- =====================================================
CREATE OR REPLACE FUNCTION place_auction_bid(
    bidder_id_input UUID,
    auction_id_input UUID,
    bid_amount_input BIGINT
)
RETURNS JSONB AS $$
DECLARE
    listing RECORD;
    bidder_balance BIGINT;
    previous_bidder_id UUID;
    previous_bid BIGINT;
    item_name TEXT;
BEGIN
    -- Get listing details
    SELECT * INTO listing FROM public.auction_listings 
    WHERE id = auction_id_input AND status = 'active';

    IF listing IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found or expired');
    END IF;

    -- Can't bid on own listing
    IF listing.seller_id = bidder_id_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot bid on your own listing');
    END IF;

    -- Check auction hasn't expired
    IF listing.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Auction has expired');
    END IF;

    -- Minimum bid check
    IF listing.current_bid IS NOT NULL AND bid_amount_input <= listing.current_bid THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bid must be higher than current bid');
    END IF;

    IF listing.current_bid IS NULL AND bid_amount_input < listing.starting_bid THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bid must be at least the starting bid');
    END IF;

    -- Check bidder has funds
    IF listing.currency = 'cash' THEN
        SELECT cash INTO bidder_balance FROM public.players WHERE id = bidder_id_input;
    ELSE
        SELECT diamonds INTO bidder_balance FROM public.players WHERE id = bidder_id_input;
    END IF;

    IF bidder_balance IS NULL OR bidder_balance < bid_amount_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    -- Store previous bidder info for refund
    previous_bidder_id := listing.current_bidder_id;
    previous_bid := listing.current_bid;

    -- Deduct from new bidder
    IF listing.currency = 'cash' THEN
        UPDATE public.players SET cash = cash - bid_amount_input WHERE id = bidder_id_input;
    ELSE
        UPDATE public.players SET diamonds = diamonds - bid_amount_input WHERE id = bidder_id_input;
    END IF;

    -- Refund previous bidder
    IF previous_bidder_id IS NOT NULL AND previous_bid IS NOT NULL THEN
        IF listing.currency = 'cash' THEN
            UPDATE public.players SET cash = cash + previous_bid WHERE id = previous_bidder_id;
        ELSE
            UPDATE public.players SET diamonds = diamonds + previous_bid WHERE id = previous_bidder_id;
        END IF;

        -- Notify previous bidder
        SELECT name INTO item_name FROM public.item_definitions WHERE id = listing.item_id;
        INSERT INTO public.notifications (player_id, type, title, description)
        VALUES (previous_bidder_id, 'system', 'Outbid!', 
                'You were outbid on ' || item_name || '. Your ' || previous_bid || ' ' || listing.currency || ' was refunded.');
    END IF;

    -- Update listing
    UPDATE public.auction_listings 
    SET current_bid = bid_amount_input, current_bidder_id = bidder_id_input
    WHERE id = auction_id_input;

    -- Record bid
    INSERT INTO public.auction_bids (auction_id, bidder_id, bid_amount)
    VALUES (auction_id_input, bidder_id_input, bid_amount_input);

    RETURN jsonb_build_object('success', true, 'message', 'Bid placed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- BUY NOW RPC
-- =====================================================
CREATE OR REPLACE FUNCTION buy_auction_now(
    buyer_id_input UUID,
    auction_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    listing RECORD;
    buyer_balance BIGINT;
    previous_bidder_id UUID;
    previous_bid BIGINT;
    item_name TEXT;
BEGIN
    -- Get listing
    SELECT * INTO listing FROM public.auction_listings 
    WHERE id = auction_id_input AND status = 'active';

    IF listing IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found');
    END IF;

    IF listing.seller_id = buyer_id_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot buy your own listing');
    END IF;

    IF listing.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Auction has expired');
    END IF;

    -- Check buyer funds
    IF listing.currency = 'cash' THEN
        SELECT cash INTO buyer_balance FROM public.players WHERE id = buyer_id_input;
    ELSE
        SELECT diamonds INTO buyer_balance FROM public.players WHERE id = buyer_id_input;
    END IF;

    IF buyer_balance < listing.buy_now_price THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds for Buy Now');
    END IF;

    -- Get item name
    SELECT name INTO item_name FROM public.item_definitions WHERE id = listing.item_id;

    -- Refund current bidder if any
    previous_bidder_id := listing.current_bidder_id;
    previous_bid := listing.current_bid;

    IF previous_bidder_id IS NOT NULL AND previous_bid IS NOT NULL THEN
        IF listing.currency = 'cash' THEN
            UPDATE public.players SET cash = cash + previous_bid WHERE id = previous_bidder_id;
        ELSE
            UPDATE public.players SET diamonds = diamonds + previous_bid WHERE id = previous_bidder_id;
        END IF;

        INSERT INTO public.notifications (player_id, type, title, description)
        VALUES (previous_bidder_id, 'system', 'Auction Ended', 
                'Someone used Buy Now on ' || item_name || '. Your bid was refunded.');
    END IF;

    -- Deduct from buyer
    IF listing.currency = 'cash' THEN
        UPDATE public.players SET cash = cash - listing.buy_now_price WHERE id = buyer_id_input;
    ELSE
        UPDATE public.players SET diamonds = diamonds - listing.buy_now_price WHERE id = buyer_id_input;
    END IF;

    -- Pay seller
    IF listing.currency = 'cash' THEN
        UPDATE public.players SET cash = cash + listing.buy_now_price WHERE id = listing.seller_id;
    ELSE
        UPDATE public.players SET diamonds = diamonds + listing.buy_now_price WHERE id = listing.seller_id;
    END IF;

    -- Give item to buyer
    INSERT INTO public.player_inventory (player_id, item_id, quantity)
    VALUES (buyer_id_input, listing.item_id, listing.quantity)
    ON CONFLICT (player_id, item_id)
    DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;

    -- Update listing status
    UPDATE public.auction_listings SET status = 'sold' WHERE id = auction_id_input;

    -- Notifications
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES 
        (buyer_id_input, 'purchase', 'Item Won!', 'Bought ' || listing.quantity || 'x ' || item_name),
        (listing.seller_id, 'income', 'Item Sold!', 'Sold ' || listing.quantity || 'x ' || item_name || ' for ' || listing.buy_now_price || ' ' || listing.currency);

    RETURN jsonb_build_object('success', true, 'message', 'Purchase complete');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- CANCEL LISTING RPC
-- =====================================================
CREATE OR REPLACE FUNCTION cancel_auction_listing(
    seller_id_input UUID,
    auction_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    listing RECORD;
    item_name TEXT;
BEGIN
    SELECT * INTO listing FROM public.auction_listings 
    WHERE id = auction_id_input AND seller_id = seller_id_input AND status = 'active';

    IF listing IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found');
    END IF;

    -- Can't cancel if there are bids
    IF listing.current_bidder_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel with active bids');
    END IF;

    -- Return item to seller
    INSERT INTO public.player_inventory (player_id, item_id, quantity)
    VALUES (seller_id_input, listing.item_id, listing.quantity)
    ON CONFLICT (player_id, item_id)
    DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;

    -- Update status
    UPDATE public.auction_listings SET status = 'cancelled' WHERE id = auction_id_input;

    SELECT name INTO item_name FROM public.item_definitions WHERE id = listing.item_id;
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (seller_id_input, 'system', 'Listing Cancelled', listing.quantity || 'x ' || item_name || ' returned to inventory');

    RETURN jsonb_build_object('success', true, 'message', 'Listing cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- CLAIM EXPIRED AUCTION RPC
-- =====================================================
-- Called to finalize expired auctions with winning bids
CREATE OR REPLACE FUNCTION claim_expired_auction(
    auction_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    listing RECORD;
    item_name TEXT;
BEGIN
    SELECT * INTO listing FROM public.auction_listings 
    WHERE id = auction_id_input AND status = 'active' AND expires_at < NOW();

    IF listing IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No expired auction to claim');
    END IF;

    SELECT name INTO item_name FROM public.item_definitions WHERE id = listing.item_id;

    -- If there was a winning bid
    IF listing.current_bidder_id IS NOT NULL AND listing.current_bid IS NOT NULL THEN
        -- Pay seller (bid already deducted from bidder)
        IF listing.currency = 'cash' THEN
            UPDATE public.players SET cash = cash + listing.current_bid WHERE id = listing.seller_id;
        ELSE
            UPDATE public.players SET diamonds = diamonds + listing.current_bid WHERE id = listing.seller_id;
        END IF;

        -- Give item to winner
        INSERT INTO public.player_inventory (player_id, item_id, quantity)
        VALUES (listing.current_bidder_id, listing.item_id, listing.quantity)
        ON CONFLICT (player_id, item_id)
        DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;

        UPDATE public.auction_listings SET status = 'sold' WHERE id = auction_id_input;

        -- Notifications
        INSERT INTO public.notifications (player_id, type, title, description)
        VALUES 
            (listing.current_bidder_id, 'purchase', 'Auction Won!', 'Won ' || listing.quantity || 'x ' || item_name),
            (listing.seller_id, 'income', 'Auction Sold!', 'Sold ' || listing.quantity || 'x ' || item_name || ' for ' || listing.current_bid);

        RETURN jsonb_build_object('success', true, 'message', 'Auction finalized - sold');
    ELSE
        -- No bids - return to seller
        INSERT INTO public.player_inventory (player_id, item_id, quantity)
        VALUES (listing.seller_id, listing.item_id, listing.quantity)
        ON CONFLICT (player_id, item_id)
        DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;

        UPDATE public.auction_listings SET status = 'expired' WHERE id = auction_id_input;

        INSERT INTO public.notifications (player_id, type, title, description)
        VALUES (listing.seller_id, 'system', 'Auction Expired', listing.quantity || 'x ' || item_name || ' returned - no bids');

        RETURN jsonb_build_object('success', true, 'message', 'Auction expired - item returned');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- GET ACTIVE AUCTIONS RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_auctions(
    viewer_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    seller_id UUID,
    seller_name TEXT,
    item_id UUID,
    item_name TEXT,
    item_description TEXT,
    quantity INTEGER,
    currency TEXT,
    starting_bid BIGINT,
    current_bid BIGINT,
    buy_now_price BIGINT,
    current_bidder_id UUID,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    is_my_listing BOOLEAN,
    is_my_bid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.seller_id,
        p.username AS seller_name,
        al.item_id,
        id.name AS item_name,
        id.description AS item_description,
        al.quantity,
        al.currency,
        al.starting_bid,
        al.current_bid,
        al.buy_now_price,
        al.current_bidder_id,
        al.expires_at,
        al.created_at,
        (al.seller_id = viewer_id) AS is_my_listing,
        (al.current_bidder_id = viewer_id) AS is_my_bid
    FROM public.auction_listings al
    JOIN public.players p ON al.seller_id = p.id
    JOIN public.item_definitions id ON al.item_id = id.id
    WHERE al.status = 'active' AND al.expires_at > NOW()
    ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
