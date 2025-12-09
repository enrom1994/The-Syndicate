-- =====================================================
-- P2 ECONOMY FEATURES
-- =====================================================
-- 1. Golden Revolver +20 respect passive
-- 2. Family creation TON fee update (handled in RPC)

-- =====================================================
-- 1. ADD RESPECT BONUS TO GOLDEN REVOLVER
-- =====================================================
-- Update Golden Revolver to have a respect_bonus column
-- We'll add a new column for special bonuses if it doesn't exist

-- First, add respect_bonus column to item_definitions
ALTER TABLE public.item_definitions 
ADD COLUMN IF NOT EXISTS respect_bonus INTEGER DEFAULT 0;

-- Update Golden Revolver with +20 respect bonus
UPDATE public.item_definitions
SET respect_bonus = 20
WHERE name = 'Golden Revolver';

-- Add comment
COMMENT ON COLUMN public.item_definitions.respect_bonus IS 'Bonus respect gained when this item is equipped (+X% to respect rewards)';


-- =====================================================
-- 2. UPDATE create_family TO REQUIRE 0.5 TON
-- =====================================================
-- The TON payment is handled externally, but we update the RPC
-- to track the fee and log the transaction properly

CREATE OR REPLACE FUNCTION create_family(
    creator_id UUID,
    family_name TEXT,
    family_tag TEXT,
    family_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_family_id UUID;
    existing_family RECORD;
    diamond_cost INTEGER := 100;
    ton_cost NUMERIC := 0.5;
BEGIN
    -- Check if player already has a family
    SELECT f.id, f.name INTO existing_family
    FROM families f
    JOIN family_members fm ON f.id = fm.family_id
    WHERE fm.player_id = creator_id;
    
    IF existing_family.id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are already in a family');
    END IF;
    
    -- Check if name is taken
    IF EXISTS (SELECT 1 FROM families WHERE LOWER(name) = LOWER(family_name)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Family name already taken');
    END IF;
    
    -- Check if tag is taken
    IF EXISTS (SELECT 1 FROM families WHERE LOWER(tag) = LOWER(family_tag)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Family tag already taken');
    END IF;
    
    -- Deduct diamonds (TON is handled externally before this call)
    UPDATE players 
    SET diamonds = diamonds - diamond_cost 
    WHERE id = creator_id AND diamonds >= diamond_cost;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds (need 100💎)');
    END IF;
    
    -- Create family
    INSERT INTO families (name, tag, boss_id, description)
    VALUES (family_name, family_tag, creator_id, family_description)
    RETURNING id INTO new_family_id;
    
    -- Add creator as boss member
    INSERT INTO family_members (family_id, player_id, role, joined_at)
    VALUES (new_family_id, creator_id, 'boss', NOW());
    
    -- Log transactions
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES 
        (creator_id, 'family_creation', 'diamonds', -diamond_cost, 'Created family: ' || family_name),
        (creator_id, 'family_creation', 'ton', -ton_cost, 'Family creation TON fee');
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Family created successfully!',
        'family_id', new_family_id,
        'family_name', family_name,
        'family_tag', family_tag
    );
END;
$$;


-- =====================================================
-- 3. UPDATE RESPECT BONUS APPLICATION
-- =====================================================
-- Create/update helper to calculate respect bonus from equipped items
CREATE OR REPLACE FUNCTION get_respect_bonus(target_player_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_bonus INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(id.respect_bonus), 0) INTO total_bonus
    FROM player_inventory pi
    JOIN item_definitions id ON pi.item_id = id.id
    WHERE pi.player_id = target_player_id 
    AND pi.is_equipped = true
    AND id.respect_bonus > 0;
    
    RETURN total_bonus;
END;
$$;


-- Add comments
COMMENT ON FUNCTION get_respect_bonus IS 'Returns total respect bonus from equipped items';
