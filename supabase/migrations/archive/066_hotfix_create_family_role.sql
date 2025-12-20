-- HOTFIX: Update create_family to use 'Don' instead of 'boss'
-- This fixes the family_members_role_check constraint violation

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
    existing_membership RECORD;
    diamond_cost INTEGER := 100;
    player_diamonds INTEGER;
BEGIN
    -- Check if player is already in a family
    SELECT * INTO existing_membership 
    FROM family_members 
    WHERE player_id = creator_id;
    
    IF existing_membership IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are already in a family. Leave first to create a new one.');
    END IF;
    
    -- Check diamonds
    SELECT diamonds INTO player_diamonds FROM players WHERE id = creator_id;
    IF player_diamonds < diamond_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'You need 100 diamonds to create a family.');
    END IF;
    
    -- Check if name or tag already exists
    IF EXISTS (SELECT 1 FROM families WHERE name = family_name) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A family with this name already exists.');
    END IF;
    
    IF family_tag IS NOT NULL AND EXISTS (SELECT 1 FROM families WHERE tag = family_tag) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A family with this tag already exists.');
    END IF;
    
    -- Deduct diamonds
    UPDATE players 
    SET diamonds = diamonds - diamond_cost, updated_at = NOW()
    WHERE id = creator_id;
    
    -- Create family
    INSERT INTO families (name, tag, description, boss_id)
    VALUES (family_name, family_tag, family_description, creator_id)
    RETURNING id INTO new_family_id;
    
    -- Add creator as Don (NOT boss)
    INSERT INTO family_members (family_id, player_id, role)
    VALUES (new_family_id, creator_id, 'Don');
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (creator_id, 'family_creation', 'diamonds', -diamond_cost, 'Created family: ' || family_name);
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Family created successfully!',
        'family_id', new_family_id
    );
END;
$$;
