-- =====================================================
-- EQUIPMENT ASSIGNMENT SYSTEM
-- =====================================================
-- Replaces the simple is_equipped boolean with quantity-based assignment
-- Allows assigning weapons/equipment in quantities to arm crew

-- =====================================================
-- 1. ADD ASSIGNED_QUANTITY COLUMN
-- =====================================================
ALTER TABLE public.player_inventory 
ADD COLUMN IF NOT EXISTS assigned_quantity INTEGER DEFAULT 0;

-- Constraint: assigned can't exceed owned and must be non-negative
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_assigned_quantity'
    ) THEN
        ALTER TABLE public.player_inventory 
        ADD CONSTRAINT check_assigned_quantity 
        CHECK (assigned_quantity >= 0 AND assigned_quantity <= quantity);
    END IF;
END $$;

-- Migrate existing equipped items: if is_equipped was true, set assigned_quantity = quantity
UPDATE public.player_inventory 
SET assigned_quantity = quantity 
WHERE is_equipped = true AND assigned_quantity = 0;


-- =====================================================
-- 2. ASSIGN EQUIPMENT RPC
-- =====================================================
-- Assigns a quantity of weapon/equipment to arm crew
CREATE OR REPLACE FUNCTION assign_equipment(
    player_id_input UUID,
    inventory_id_input UUID,
    assign_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
    item_record RECORD;
    max_assignable INTEGER;
    total_crew INTEGER;
    total_assigned_weapons INTEGER;
    total_assigned_equipment INTEGER;
BEGIN
    -- Get item details
    SELECT pi.*, id.name as item_name, id.category
    INTO item_record
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON id.id = pi.item_id
    WHERE pi.id = inventory_id_input AND pi.player_id = player_id_input;
    
    IF item_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;
    
    -- Only weapons and equipment can be assigned
    IF item_record.category NOT IN ('weapon', 'equipment') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only weapons and equipment can be assigned');
    END IF;
    
    -- Can't assign items in safe
    IF item_record.location = 'safe' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Remove item from safe first');
    END IF;
    
    -- Validate assign_count
    IF assign_count < 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;
    
    IF assign_count > item_record.quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot assign more than you own');
    END IF;
    
    -- Get total crew count
    SELECT COALESCE(SUM(quantity), 0) INTO total_crew
    FROM public.player_crew
    WHERE player_id = player_id_input;
    
    -- Get currently assigned items (excluding this item being modified)
    SELECT 
        COALESCE(SUM(CASE WHEN id.category = 'weapon' THEN pi.assigned_quantity ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN id.category = 'equipment' THEN pi.assigned_quantity ELSE 0 END), 0)
    INTO total_assigned_weapons, total_assigned_equipment
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON id.id = pi.item_id
    WHERE pi.player_id = player_id_input 
    AND pi.id != inventory_id_input;
    
    -- Calculate max assignable based on crew (can't assign more weapons than crew)
    IF item_record.category = 'weapon' THEN
        max_assignable := LEAST(item_record.quantity, GREATEST(0, total_crew - total_assigned_weapons));
    ELSE -- equipment
        max_assignable := LEAST(item_record.quantity, GREATEST(0, total_crew - total_assigned_equipment));
    END IF;
    
    IF assign_count > max_assignable THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Not enough crew to use that many. Max: ' || max_assignable,
            'max_assignable', max_assignable
        );
    END IF;
    
    -- Update the assigned quantity
    UPDATE public.player_inventory
    SET assigned_quantity = assign_count,
        location = CASE WHEN assign_count > 0 THEN 'equipped' ELSE 'inventory' END
    WHERE id = inventory_id_input;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Assigned ' || assign_count || ' ' || item_record.item_name,
        'assigned_quantity', assign_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 3. GET COMBAT STATS (UPDATED for assignment system)
-- =====================================================
CREATE OR REPLACE FUNCTION get_player_combat_stats(
    player_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    base_stats RECORD;
    crew_attack INTEGER;
    crew_defense INTEGER;
    assigned_attack INTEGER;
    assigned_defense INTEGER;
    total_crew INTEGER;
    total_assigned_weapons INTEGER;
    total_assigned_equipment INTEGER;
BEGIN
    -- Get base player stats
    SELECT level, respect INTO base_stats
    FROM public.players WHERE id = player_id_input;
    
    IF base_stats IS NULL THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;
    
    -- Get crew stats
    SELECT 
        COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER,
        COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER,
        COALESCE(SUM(pc.quantity), 0)::INTEGER
    INTO crew_attack, crew_defense, total_crew
    FROM public.player_crew pc
    JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE pc.player_id = player_id_input;
    
    -- Get ASSIGNED item bonuses (using assigned_quantity instead of is_equipped)
    SELECT 
        COALESCE(SUM(CASE WHEN id.category = 'weapon' THEN id.attack_bonus * pi.assigned_quantity ELSE 0 END), 0)::INTEGER,
        COALESCE(SUM(CASE WHEN id.category = 'equipment' THEN id.defense_bonus * pi.assigned_quantity ELSE 0 END), 0)::INTEGER,
        COALESCE(SUM(CASE WHEN id.category = 'weapon' THEN pi.assigned_quantity ELSE 0 END), 0)::INTEGER,
        COALESCE(SUM(CASE WHEN id.category = 'equipment' THEN pi.assigned_quantity ELSE 0 END), 0)::INTEGER
    INTO assigned_attack, assigned_defense, total_assigned_weapons, total_assigned_equipment
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON id.id = pi.item_id
    WHERE pi.player_id = player_id_input 
    AND pi.assigned_quantity > 0;
    
    RETURN jsonb_build_object(
        'level', base_stats.level,
        'respect', base_stats.respect,
        'crew_attack', crew_attack,
        'crew_defense', crew_defense,
        'assigned_attack', assigned_attack,
        'assigned_defense', assigned_defense,
        'total_attack', (base_stats.level * 10) + crew_attack + assigned_attack,
        'total_defense', (base_stats.level * 10) + crew_defense + assigned_defense,
        'total_crew', total_crew,
        'armed_weapons', total_assigned_weapons,
        'armed_equipment', total_assigned_equipment,
        'unarmed_crew', GREATEST(0, total_crew - total_assigned_weapons)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 4. GET ASSIGNMENT LIMITS RPC
-- =====================================================
-- Returns how many more weapons/equipment can be assigned
CREATE OR REPLACE FUNCTION get_assignment_limits(
    player_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    total_crew INTEGER;
    total_assigned_weapons INTEGER;
    total_assigned_equipment INTEGER;
BEGIN
    -- Get total crew count
    SELECT COALESCE(SUM(quantity), 0) INTO total_crew
    FROM public.player_crew
    WHERE player_id = player_id_input;
    
    -- Get currently assigned counts
    SELECT 
        COALESCE(SUM(CASE WHEN id.category = 'weapon' THEN pi.assigned_quantity ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN id.category = 'equipment' THEN pi.assigned_quantity ELSE 0 END), 0)
    INTO total_assigned_weapons, total_assigned_equipment
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON id.id = pi.item_id
    WHERE pi.player_id = player_id_input;
    
    RETURN jsonb_build_object(
        'total_crew', total_crew,
        'assigned_weapons', total_assigned_weapons,
        'assigned_equipment', total_assigned_equipment,
        'available_weapon_slots', GREATEST(0, total_crew - total_assigned_weapons),
        'available_equipment_slots', GREATEST(0, total_crew - total_assigned_equipment),
        'unarmed_crew', GREATEST(0, total_crew - total_assigned_weapons),
        'unarmored_crew', GREATEST(0, total_crew - total_assigned_equipment)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 5. DROP OLD is_equipped COLUMN (cleanup)
-- =====================================================
-- Commenting out for now - can be run manually after verifying new system works
-- ALTER TABLE public.player_inventory DROP COLUMN IF EXISTS is_equipped;
