-- =====================================================
-- FAMILY ROLE NAME UPDATE
-- =====================================================
-- Update family roles to be distinct from player ranks
-- Old: Boss, Underboss, Consigliere, Caporegime, Soldier, Street Runner
-- New: Don, Consigliere, Advisor, Lieutenant, Associate, Recruit

-- 1. First migrate existing data (before changing constraint)
UPDATE family_members SET role = 'Don_temp' WHERE role = 'Boss';
UPDATE family_members SET role = 'Consigliere_temp' WHERE role = 'Underboss';
UPDATE family_members SET role = 'Advisor' WHERE role = 'Consigliere';
UPDATE family_members SET role = 'Lieutenant' WHERE role = 'Caporegime';
UPDATE family_members SET role = 'Associate' WHERE role = 'Soldier';
UPDATE family_members SET role = 'Recruit' WHERE role = 'Street Runner';

-- Resolve temp names
UPDATE family_members SET role = 'Don' WHERE role = 'Don_temp';
UPDATE family_members SET role = 'Consigliere' WHERE role = 'Consigliere_temp';

-- 2. Drop old constraint and add new one
ALTER TABLE family_members 
DROP CONSTRAINT IF EXISTS family_members_role_check;

ALTER TABLE family_members
ADD CONSTRAINT family_members_role_check 
CHECK (role IN ('Don', 'Consigliere', 'Advisor', 'Lieutenant', 'Associate', 'Recruit'));


-- 3. Update create_family function to use new role name
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
    
    -- Add creator as Don (changed from Boss)
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


-- 4. Update join_family function to use new role name
CREATE OR REPLACE FUNCTION join_family(
    joiner_id UUID,
    target_family_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_family RECORD;
    existing_membership RECORD;
    player_level INTEGER;
BEGIN
    -- Check if player is already in a family
    SELECT * INTO existing_membership 
    FROM family_members 
    WHERE player_id = joiner_id;
    
    IF existing_membership IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are already in a family.');
    END IF;
    
    -- Get family details
    SELECT * INTO target_family FROM families WHERE id = target_family_id;
    
    IF target_family IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Family not found.');
    END IF;
    
    IF NOT target_family.is_recruiting THEN
        RETURN jsonb_build_object('success', false, 'message', 'This family is not recruiting.');
    END IF;
    
    -- Check level requirement
    SELECT level INTO player_level FROM players WHERE id = joiner_id;
    IF player_level < target_family.min_level_required THEN
        RETURN jsonb_build_object('success', false, 'message', 'You need to be level ' || target_family.min_level_required || ' to join this family.');
    END IF;
    
    -- Add to family as Recruit (changed from Street Runner)
    INSERT INTO family_members (family_id, player_id, role)
    VALUES (target_family_id, joiner_id, 'Recruit');
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Welcome to ' || target_family.name || '!'
    );
END;
$$;


-- 5. Update set_member_role function for new role names
CREATE OR REPLACE FUNCTION set_member_role(
    actor_id UUID,
    target_player_id UUID,
    new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    actor_membership RECORD;
    target_membership RECORD;
BEGIN
    -- Validate role (updated to new names)
    IF new_role NOT IN ('Consigliere', 'Advisor', 'Lieutenant', 'Associate', 'Recruit') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid role.');
    END IF;
    
    -- Get actor's membership
    SELECT fm.*, f.boss_id INTO actor_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = actor_id;
    
    IF actor_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Only Don or Consigliere can change roles (updated from Boss/Underboss)
    IF actor_membership.role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can change roles.');
    END IF;
    
    -- Get target membership
    SELECT * INTO target_membership
    FROM family_members
    WHERE player_id = target_player_id AND family_id = actor_membership.family_id;
    
    IF target_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player is not in your family.');
    END IF;
    
    -- Cannot change Don role
    IF target_membership.role = 'Don' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot change the Don role.');
    END IF;
    
    -- Consigliere cannot promote to Consigliere
    IF actor_membership.role = 'Consigliere' AND new_role = 'Consigliere' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don can assign Consigliere.');
    END IF;
    
    -- Update role
    UPDATE family_members 
    SET role = new_role
    WHERE player_id = target_player_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Role updated to ' || new_role);
END;
$$;


-- 6. Update leave_family function for new role names
CREATE OR REPLACE FUNCTION leave_family(leaver_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_membership RECORD;
    family_info RECORD;
    member_count INTEGER;
BEGIN
    -- Get current membership
    SELECT fm.*, f.name as family_name, f.boss_id
    INTO current_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = leaver_id;
    
    IF current_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check if Don is leaving (updated from Boss)
    IF current_membership.role = 'Don' THEN
        -- Count remaining members
        SELECT COUNT(*) INTO member_count 
        FROM family_members 
        WHERE family_id = current_membership.family_id AND player_id != leaver_id;
        
        IF member_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'As Don, you must promote someone or kick everyone before leaving.');
        ELSE
            -- Delete the family if no other members
            DELETE FROM families WHERE id = current_membership.family_id;
            RETURN jsonb_build_object('success', true, 'message', 'Family disbanded.');
        END IF;
    END IF;
    
    -- Remove from family
    DELETE FROM family_members WHERE player_id = leaver_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'You left ' || current_membership.family_name);
END;
$$;


-- 7. Update kick_member function for new role names
CREATE OR REPLACE FUNCTION kick_member(
    actor_id UUID,
    target_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    actor_membership RECORD;
    target_membership RECORD;
BEGIN
    -- Get actor's membership
    SELECT fm.*, f.boss_id INTO actor_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = actor_id;
    
    IF actor_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Only Don or Consigliere can kick (updated from Boss/Underboss)
    IF actor_membership.role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can kick members.');
    END IF;
    
    -- Get target membership
    SELECT * INTO target_membership
    FROM family_members
    WHERE player_id = target_player_id AND family_id = actor_membership.family_id;
    
    IF target_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player is not in your family.');
    END IF;
    
    -- Cannot kick Don
    IF target_membership.role = 'Don' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot kick the Don.');
    END IF;
    
    -- Consigliere cannot kick Consigliere
    IF actor_membership.role = 'Consigliere' AND target_membership.role = 'Consigliere' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Consigliere cannot kick another Consigliere.');
    END IF;
    
    -- Remove from family
    DELETE FROM family_members WHERE player_id = target_player_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Member kicked from family.');
END;
$$;


-- 8. Update transfer_boss function (now transfer_don)
CREATE OR REPLACE FUNCTION transfer_don(
    current_don_id UUID,
    new_don_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    don_membership RECORD;
    new_don_membership RECORD;
BEGIN
    -- Verify current don
    SELECT fm.*, f.id as fam_id INTO don_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = current_don_id AND fm.role = 'Don';
    
    IF don_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not the Don.');
    END IF;
    
    -- Verify new don is in same family
    SELECT * INTO new_don_membership
    FROM family_members
    WHERE player_id = new_don_id AND family_id = don_membership.family_id;
    
    IF new_don_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player is not in your family.');
    END IF;
    
    -- Transfer
    UPDATE family_members SET role = 'Consigliere' WHERE player_id = current_don_id;
    UPDATE family_members SET role = 'Don' WHERE player_id = new_don_id;
    UPDATE families SET boss_id = new_don_id, updated_at = NOW() WHERE id = don_membership.fam_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Don role transferred!');
END;
$$;

-- Keep old function name as alias for backward compatibility
CREATE OR REPLACE FUNCTION transfer_boss(current_boss_id UUID, new_boss_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN transfer_don(current_boss_id, new_boss_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
