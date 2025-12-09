-- =====================================================
-- ECONOMY V2: SAFE STORAGE SYSTEM
-- =====================================================
-- RPCs for moving items to/from safe storage
-- Premium vault purchase with TON

-- =====================================================
-- MOVE ITEM TO SAFE
-- =====================================================
-- Moves an item to safe storage with 10 minute cooldown
CREATE OR REPLACE FUNCTION move_item_to_safe(
    player_id_input UUID,
    inventory_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    item_record RECORD;
    safe_info JSONB;
    available_slots INTEGER;
BEGIN
    -- Get item details
    SELECT pi.*, id.name as item_name
    INTO item_record
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON id.id = pi.item_id
    WHERE pi.id = inventory_id_input AND pi.player_id = player_id_input;
    
    IF item_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found in your inventory');
    END IF;
    
    -- Can't move if already in safe
    IF item_record.location = 'safe' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item is already in safe');
    END IF;
    
    -- Can't move equipped items directly (must unequip first)
    IF item_record.is_equipped THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unequip item before moving to safe');
    END IF;
    
    -- Check safe capacity
    SELECT get_safe_info(player_id_input) INTO safe_info;
    available_slots := (safe_info->>'available_slots')::INTEGER;
    
    IF available_slots <= 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'No safe slots available. Purchase a vault upgrade.',
            'total_slots', (safe_info->>'total_slots')::INTEGER,
            'used_slots', (safe_info->>'used_slots')::INTEGER
        );
    END IF;
    
    -- Move item to safe with 10 minute cooldown before it can be moved out
    UPDATE public.player_inventory
    SET location = 'safe',
        safe_until = NOW() + INTERVAL '10 minutes'
    WHERE id = inventory_id_input;
    
    -- Create notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (player_id_input, 'system', 'Item Secured', 
            item_record.item_name || ' moved to safe. Protected from theft!');
    
    RETURN jsonb_build_object(
        'success', true,
        'message', item_record.item_name || ' moved to safe',
        'cooldown_until', NOW() + INTERVAL '10 minutes'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- MOVE ITEM FROM SAFE
-- =====================================================
-- Moves an item from safe back to inventory
CREATE OR REPLACE FUNCTION move_item_from_safe(
    player_id_input UUID,
    inventory_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    item_record RECORD;
BEGIN
    -- Get item details
    SELECT pi.*, id.name as item_name
    INTO item_record
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON id.id = pi.item_id
    WHERE pi.id = inventory_id_input AND pi.player_id = player_id_input;
    
    IF item_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;
    
    -- Check it's actually in safe
    IF item_record.location != 'safe' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item is not in safe');
    END IF;
    
    -- Check cooldown (10 min delay when moving OUT of safe)
    IF item_record.safe_until IS NOT NULL AND item_record.safe_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Item is in cooldown. Wait before removing from safe.',
            'cooldown_until', item_record.safe_until,
            'remaining_seconds', EXTRACT(EPOCH FROM (item_record.safe_until - NOW()))::INTEGER
        );
    END IF;
    
    -- Move item back to inventory
    UPDATE public.player_inventory
    SET location = 'inventory',
        safe_until = NULL
    WHERE id = inventory_id_input;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', item_record.item_name || ' moved to inventory'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- PURCHASE SAFE SLOTS
-- =====================================================
-- Purchase safe vault upgrade (requires TON payment verification separately)
CREATE OR REPLACE FUNCTION purchase_safe_slots(
    player_id_input UUID,
    package_id_input TEXT
)
RETURNS JSONB AS $$
DECLARE
    package RECORD;
    current_slots INTEGER;
    new_total_slots INTEGER;
BEGIN
    -- Get package details
    SELECT * INTO package FROM public.safe_packages WHERE id = package_id_input AND is_active = true;
    
    IF package IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid package');
    END IF;
    
    -- Get current slots
    SELECT COALESCE(total_slots, 0) INTO current_slots
    FROM public.player_safe_slots
    WHERE player_id = player_id_input;
    
    -- Calculate new total (packages stack, they don't replace)
    new_total_slots := COALESCE(current_slots, 0) + package.slots;
    
    -- Upsert safe slots
    INSERT INTO public.player_safe_slots (player_id, total_slots, package)
    VALUES (player_id_input, new_total_slots, package_id_input)
    ON CONFLICT (player_id)
    DO UPDATE SET 
        total_slots = new_total_slots,
        package = package_id_input,
        purchased_at = NOW();
    
    -- Create notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (player_id_input, 'purchase', 'Vault Upgraded!', 
            'Purchased ' || package.name || '. You now have ' || new_total_slots || ' safe slots!');
    
    -- Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'safe_purchase', 'ton', -(package.price_ton * 1000000000)::BIGINT, 
            'Purchased ' || package.name);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Purchased ' || package.name,
        'new_slots', package.slots,
        'total_slots', new_total_slots
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- GET SAFE PACKAGES RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_safe_packages()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    slots INTEGER,
    price_ton NUMERIC(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT sp.id, sp.name, sp.slots, sp.price_ton
    FROM public.safe_packages sp
    WHERE sp.is_active = true
    ORDER BY sp.price_ton;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
