-- =====================================================
-- FIX: GIVE PLAYERS 1 FREE SAFE SLOT BY DEFAULT
-- =====================================================
-- Updates get_safe_info to return 1 slot for players without purchased slots

-- Update the get_safe_info RPC to default to 1 free slot
CREATE OR REPLACE FUNCTION get_safe_info(
    player_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    safe_slots INTEGER;
    items_in_safe INTEGER;
    default_free_slots INTEGER := 1; -- Every player gets 1 free slot
BEGIN
    -- Get total safe slots from purchased packages
    SELECT COALESCE(total_slots, 0) INTO safe_slots
    FROM public.player_safe_slots
    WHERE player_id = player_id_input;
    
    IF safe_slots IS NULL THEN
        safe_slots := 0;
    END IF;
    
    -- Add the free slot to purchased slots
    safe_slots := safe_slots + default_free_slots;
    
    -- Count items in safe (each unique item type uses 1 slot)
    SELECT COUNT(*) INTO items_in_safe
    FROM public.player_inventory
    WHERE player_id = player_id_input AND location = 'safe';
    
    RETURN jsonb_build_object(
        'total_slots', safe_slots,
        'used_slots', items_in_safe,
        'available_slots', GREATEST(0, safe_slots - items_in_safe)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
