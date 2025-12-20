-- =====================================================
-- STARTER PACK SYSTEM
-- =====================================================
-- Adds "Made Man" achievement and starter pack purchase tracking

-- =====================================================
-- 1. ADD STATUS COLUMN TO PLAYER_BUSINESSES
-- =====================================================
-- This allows businesses to be in a "broken" state (needs repair)
ALTER TABLE public.player_businesses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add constraint for valid statuses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'player_businesses_status_check'
    ) THEN
        ALTER TABLE public.player_businesses 
        ADD CONSTRAINT player_businesses_status_check 
        CHECK (status IN ('active', 'broken'));
    END IF;
END $$;

-- =====================================================
-- 2. ADD STARTER_PACK_CLAIMED COLUMN TO PLAYERS
-- =====================================================
-- Track if player has claimed the starter pack
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS starter_pack_claimed BOOLEAN DEFAULT false;

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS starter_pack_claimed_at TIMESTAMPTZ;

-- =====================================================
-- 3. ADD "MADE MAN" ACHIEVEMENT
-- =====================================================
-- This is given to players who purchase the starter pack
INSERT INTO public.achievement_definitions (name, description, category, target_value, reward_type, reward_amount, icon)
VALUES (
    'Made Man',
    'Purchased the Mobster Starter Pack',
    'milestone',
    1,
    'cash',
    0,
    'badge'
)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 4. BUY STARTER PACK RPC
-- =====================================================
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
    
    -- 3. Add 100 Diamonds
    UPDATE players
    SET diamonds = diamonds + 100,
        updated_at = NOW()
    WHERE id = buyer_id;
    
    -- 4. Add "Half-built" Speakeasy (broken status)
    INSERT INTO player_businesses (player_id, business_id, level, status)
    VALUES (buyer_id, speakeasy_id, 1, 'broken')
    ON CONFLICT (player_id, business_id) DO NOTHING; -- Don't give duplicate if they already own one
    
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
        (buyer_id, 'starter_pack', 'diamonds', 100, 'Starter Pack: +100 Diamonds');
    
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
            'diamonds', 100,
            'whiskey', 10,
            'business', 'Speakeasy (Needs Repair)'
        )
    );
END;
$$;
