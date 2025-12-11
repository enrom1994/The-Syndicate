-- =====================================================
-- CRITICAL HOTFIX: Update ALL family settings RPCs to use new role names
-- =====================================================
-- This fixes BOTH update_family_settings AND get_family_settings
-- to check for Don/Consigliere instead of Boss/Underboss

-- 1. Fix update_family_settings
CREATE OR REPLACE FUNCTION update_family_settings(
    actor_id UUID,
    new_name TEXT,
    new_tag TEXT,
    new_description TEXT,
    new_is_recruiting BOOLEAN,
    new_min_level INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_family_id UUID;
    player_role TEXT;
BEGIN
    -- Get player's family and role from FAMILY_MEMBERS table
    SELECT family_id, role INTO player_family_id, player_role
    FROM family_members
    WHERE player_id = actor_id;
    
    IF player_family_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check FAMILY ROLE (not player rank) - only Don or Consigliere
    IF player_role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can update family settings.');
    END IF;
    
    -- Check name uniqueness
    IF new_name IS NOT NULL AND EXISTS (
        SELECT 1 FROM families 
        WHERE name = new_name AND id != player_family_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A family with this name already exists.');
    END IF;
    
    -- Check tag uniqueness
    IF new_tag IS NOT NULL AND EXISTS (
        SELECT 1 FROM families 
        WHERE tag = new_tag AND id != player_family_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A family with this tag already exists.');
    END IF;
    
    -- Update family settings
    UPDATE families
    SET 
        name = COALESCE(new_name, name),
        tag = new_tag,
        description = new_description,
        is_recruiting = COALESCE(new_is_recruiting, is_recruiting),
        min_level_required = COALESCE(new_min_level, min_level_required),
        updated_at = NOW()
    WHERE id = player_family_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Family settings updated successfully.');
END;
$$;


-- 2. Fix get_family_settings
CREATE OR REPLACE FUNCTION get_family_settings(actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_family UUID;
    player_role TEXT;
    family_data JSONB;
BEGIN
    -- Get player's family and role from FAMILY_MEMBERS table
    SELECT family_id, role INTO player_family, player_role
    FROM family_members
    WHERE player_id = actor_id;
    
    IF player_family IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check FAMILY ROLE (not player rank) - only Don or Consigliere
    IF player_role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can access family settings.');
    END IF;
    
    -- Get family data
    SELECT jsonb_build_object(
        'id', f.id,
        'name', f.name,
        'tag', f.tag,
        'description', f.description,
        'treasury', f.treasury,
        'total_respect', f.total_respect,
        'is_recruiting', f.is_recruiting,
        'join_type', f.join_type,
        'min_level_required', f.min_level_required,
        'created_at', f.created_at
    ) INTO family_data
    FROM families f
    WHERE f.id = player_family;
    
    RETURN jsonb_build_object(
        'success', true,
        'family', family_data,
        'is_boss', player_role = 'Don'
    );
END;
$$;


-- 3. Fix disband_family as well
CREATE OR REPLACE FUNCTION disband_family(boss_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_family_id UUID;
    player_role TEXT;
    family_treasury INTEGER;
BEGIN
    -- Get player's family and role
    SELECT family_id, role INTO player_family_id, player_role
    FROM family_members
    WHERE player_id = boss_id;
    
    IF player_family_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Only Don can disband
    IF player_role != 'Don' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the Don can disband the family.');
    END IF;
    
    -- Get treasury to return
    SELECT treasury INTO family_treasury
    FROM families
    WHERE id = player_family_id;
    
    -- Return treasury to Don
    IF family_treasury > 0 THEN
        UPDATE players
        SET cash = cash + family_treasury
        WHERE id = boss_id;
        
        INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
        VALUES (boss_id, 'family_disband_refund', 'cash', family_treasury, 'Family treasury returned');
    END IF;
    
    -- Delete family (cascade will remove members)
    DELETE FROM families WHERE id = player_family_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Family disbanded. Treasury returned to your account.'
    );
END;
$$;
