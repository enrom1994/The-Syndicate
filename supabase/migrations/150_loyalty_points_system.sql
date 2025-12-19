-- =====================================================
-- LOYALTY POINTS SYSTEM + CONTRIBUTION FIXES
-- =====================================================
-- 1. Add loyalty_points column to family_members
-- 2. Update contribute_item_to_family to:
--    - Enforce quantity <= unassigned quantity
--    - Award raw contribution value as loyalty points

-- =====================================================
-- 1. ADD LOYALTY_POINTS COLUMN
-- =====================================================
ALTER TABLE public.family_members
ADD COLUMN IF NOT EXISTS loyalty_points BIGINT DEFAULT 0;

COMMENT ON COLUMN public.family_members.loyalty_points IS 
'Family-scoped, non-transferable points earned from item contributions. Raw contributed value stored. Used for future War participation and rewards.';


-- =====================================================
-- 2. UPDATE CONTRIBUTE_ITEM_TO_FAMILY RPC
-- =====================================================
-- Now enforces: quantity_input <= quantity - assigned_quantity
-- Awards loyalty_points = item_value * quantity_input (raw value, no ratio)

DROP FUNCTION IF EXISTS contribute_item_to_family(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION contribute_item_to_family(
    player_id_input UUID,
    item_id_input UUID,
    quantity_input INTEGER
)
RETURNS JSONB AS $$
DECLARE
    membership RECORD;
    player_item RECORD;
    item_def RECORD;
    current_fam_qty INTEGER;
    available_qty INTEGER;
    contribution_value BIGINT;
BEGIN
    -- Validate quantity
    IF quantity_input <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;

    -- Check Membership
    SELECT * INTO membership FROM public.family_members WHERE player_id = player_id_input;
    IF membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family');
    END IF;

    -- Get Item Definition
    SELECT * INTO item_def FROM public.item_definitions WHERE id = item_id_input;
    IF item_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    -- Check Player Inventory
    SELECT * INTO player_item 
    FROM public.player_inventory 
    WHERE player_id = player_id_input AND item_id = item_id_input;

    IF player_item IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You do not own this item');
    END IF;

    -- Calculate available (unassigned) quantity
    available_qty := player_item.quantity - COALESCE(player_item.assigned_quantity, 0);

    -- Enforce: can only contribute unassigned items
    IF quantity_input > available_qty THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Can only contribute unassigned items. Available: ' || available_qty,
            'available_qty', available_qty
        );
    END IF;

    -- Calculate contribution value (raw value, no ratio)
    contribution_value := COALESCE(item_def.sell_price, 0) * quantity_input;

    -- Deduct from Player Inventory
    UPDATE public.player_inventory
    SET quantity = quantity - quantity_input
    WHERE id = player_item.id;

    -- Delete row if quantity reaches 0
    DELETE FROM public.player_inventory
    WHERE id = player_item.id AND quantity <= 0;

    -- Add to Family Inventory (JSONB manipulation)
    UPDATE public.families
    SET inventory = jsonb_set(
        COALESCE(inventory, '{}'::jsonb),
        ARRAY[item_id_input::text],
        to_jsonb(
            COALESCE((inventory->>item_id_input::text)::int, 0) + quantity_input
        )
    ),
    updated_at = NOW()
    WHERE id = membership.family_id;

    -- Award Loyalty Points (raw value, no hardcoded ratio)
    UPDATE public.family_members
    SET loyalty_points = loyalty_points + contribution_value
    WHERE player_id = player_id_input;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contributed ' || quantity_input || 'x ' || item_def.name || ' to your family.',
        'quantity', quantity_input,
        'item_name', item_def.name,
        'loyalty_points_earned', contribution_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.contribute_item_to_family(UUID, UUID, INTEGER) SET search_path = public;

COMMENT ON FUNCTION contribute_item_to_family IS 'Contributes unassigned items to family. Enforces qty <= available. Awards raw value as loyalty_points.';
