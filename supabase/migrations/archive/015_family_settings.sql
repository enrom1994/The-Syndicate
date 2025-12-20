-- =====================================================
-- FAMILY SETTINGS RPC FUNCTIONS
-- =====================================================

-- Function to update family settings (Boss only)
CREATE OR REPLACE FUNCTION update_family_settings(
    actor_id UUID,
    new_name TEXT DEFAULT NULL,
    new_tag TEXT DEFAULT NULL,
    new_description TEXT DEFAULT NULL,
    new_is_recruiting BOOLEAN DEFAULT NULL,
    new_min_level INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    actor_membership RECORD;
    family_record RECORD;
BEGIN
    -- Get actor's membership and verify they are Boss
    SELECT fm.*, f.id as fam_id, f.name as current_name, f.tag as current_tag
    INTO actor_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = actor_id AND fm.role IN ('Boss', 'Underboss');
    
    IF actor_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Boss or Underboss can update family settings.');
    END IF;
    
    -- Validate new name if provided
    IF new_name IS NOT NULL AND new_name != actor_membership.current_name THEN
        IF LENGTH(new_name) < 3 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Family name must be at least 3 characters.');
        END IF;
        IF EXISTS (SELECT 1 FROM families WHERE name = new_name AND id != actor_membership.fam_id) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A family with this name already exists.');
        END IF;
    END IF;
    
    -- Validate new tag if provided
    IF new_tag IS NOT NULL AND new_tag != actor_membership.current_tag THEN
        IF LENGTH(new_tag) < 2 OR LENGTH(new_tag) > 4 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Family tag must be 2-4 characters.');
        END IF;
        IF EXISTS (SELECT 1 FROM families WHERE tag = new_tag AND id != actor_membership.fam_id) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A family with this tag already exists.');
        END IF;
    END IF;
    
    -- Validate min level
    IF new_min_level IS NOT NULL AND (new_min_level < 1 OR new_min_level > 100) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Minimum level must be between 1 and 100.');
    END IF;
    
    -- Update family settings
    UPDATE families
    SET 
        name = COALESCE(new_name, name),
        tag = COALESCE(new_tag, tag),
        description = COALESCE(new_description, description),
        is_recruiting = COALESCE(new_is_recruiting, is_recruiting),
        min_level_required = COALESCE(new_min_level, min_level_required),
        updated_at = NOW()
    WHERE id = actor_membership.fam_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Family settings updated successfully!');
END;
$$;

-- Function to disband family (Boss only)
CREATE OR REPLACE FUNCTION disband_family(boss_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    boss_membership RECORD;
    family_name TEXT;
    treasury_amount BIGINT;
    member_count INTEGER;
BEGIN
    -- Verify the actor is the Boss
    SELECT fm.*, f.id as fam_id, f.name as fam_name, f.treasury as fam_treasury
    INTO boss_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = boss_id AND fm.role = 'Boss';
    
    IF boss_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the Boss can disband the family.');
    END IF;
    
    family_name := boss_membership.fam_name;
    treasury_amount := boss_membership.fam_treasury;
    
    -- Count members
    SELECT COUNT(*) INTO member_count 
    FROM family_members 
    WHERE family_id = boss_membership.fam_id;
    
    -- Return treasury to boss if any
    IF treasury_amount > 0 THEN
        UPDATE players 
        SET cash = cash + treasury_amount, updated_at = NOW()
        WHERE id = boss_id;
        
        INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
        VALUES (boss_id, 'family_disband', 'cash', treasury_amount, 'Treasury returned from disbanded family: ' || family_name);
    END IF;
    
    -- Delete family (cascade will remove members)
    DELETE FROM families WHERE id = boss_membership.fam_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Family "' || family_name || '" has been disbanded.',
        'treasury_returned', treasury_amount
    );
END;
$$;

-- Function to get family settings (for settings page)
CREATE OR REPLACE FUNCTION get_family_settings(actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    membership RECORD;
BEGIN
    -- Get membership and family data
    SELECT fm.role, f.*
    INTO membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = actor_id;
    
    IF membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Only Boss or Underboss can view settings
    IF membership.role NOT IN ('Boss', 'Underboss') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Boss or Underboss can access family settings.');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'is_boss', membership.role = 'Boss',
        'family', jsonb_build_object(
            'id', membership.id,
            'name', membership.name,
            'tag', membership.tag,
            'description', membership.description,
            'treasury', membership.treasury,
            'is_recruiting', membership.is_recruiting,
            'min_level_required', membership.min_level_required,
            'created_at', membership.created_at
        )
    );
END;
$$;
