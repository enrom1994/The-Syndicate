-- =====================================================
-- FAMILY SYSTEM RPC FUNCTIONS
-- =====================================================

-- Function to create a new family
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
    diamond_cost INTEGER := 100; -- Cost to create a family
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
    
    -- Add creator as Boss
    INSERT INTO family_members (family_id, player_id, role)
    VALUES (new_family_id, creator_id, 'Boss');
    
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

-- Function to join a family
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
    
    -- Add to family
    INSERT INTO family_members (family_id, player_id, role)
    VALUES (target_family_id, joiner_id, 'Street Runner');
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Welcome to ' || target_family.name || '!'
    );
END;
$$;

-- Function to leave a family
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
    
    -- Check if boss is leaving
    IF current_membership.role = 'Boss' THEN
        -- Count remaining members
        SELECT COUNT(*) INTO member_count 
        FROM family_members 
        WHERE family_id = current_membership.family_id AND player_id != leaver_id;
        
        IF member_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'As Boss, you must promote someone or kick everyone before leaving.');
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

-- Function to promote/demote a member
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
    -- Validate role
    IF new_role NOT IN ('Underboss', 'Consigliere', 'Caporegime', 'Soldier', 'Street Runner') THEN
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
    
    -- Only Boss or Underboss can change roles
    IF actor_membership.role NOT IN ('Boss', 'Underboss') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Boss or Underboss can change roles.');
    END IF;
    
    -- Get target membership
    SELECT * INTO target_membership
    FROM family_members
    WHERE player_id = target_player_id AND family_id = actor_membership.family_id;
    
    IF target_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player is not in your family.');
    END IF;
    
    -- Cannot change Boss role
    IF target_membership.role = 'Boss' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot change the Boss role.');
    END IF;
    
    -- Underboss cannot promote to Underboss
    IF actor_membership.role = 'Underboss' AND new_role = 'Underboss' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Boss can assign Underboss.');
    END IF;
    
    -- Update role
    UPDATE family_members 
    SET role = new_role
    WHERE player_id = target_player_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Role updated to ' || new_role);
END;
$$;

-- Function to kick a member
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
    
    -- Only Boss or Underboss can kick
    IF actor_membership.role NOT IN ('Boss', 'Underboss') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Boss or Underboss can kick members.');
    END IF;
    
    -- Get target membership
    SELECT * INTO target_membership
    FROM family_members
    WHERE player_id = target_player_id AND family_id = actor_membership.family_id;
    
    IF target_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player is not in your family.');
    END IF;
    
    -- Cannot kick Boss
    IF target_membership.role = 'Boss' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot kick the Boss.');
    END IF;
    
    -- Underboss cannot kick Underboss
    IF actor_membership.role = 'Underboss' AND target_membership.role = 'Underboss' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Underboss cannot kick another Underboss.');
    END IF;
    
    -- Remove from family
    DELETE FROM family_members WHERE player_id = target_player_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Member kicked from family.');
END;
$$;

-- Function to contribute to treasury
CREATE OR REPLACE FUNCTION contribute_to_treasury(
    contributor_id UUID,
    amount BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_membership RECORD;
    player_cash BIGINT;
BEGIN
    IF amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Amount must be positive.');
    END IF;
    
    -- Get membership
    SELECT fm.*, f.name as family_name INTO current_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = contributor_id;
    
    IF current_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check cash
    SELECT cash INTO player_cash FROM players WHERE id = contributor_id;
    IF player_cash < amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient cash.');
    END IF;
    
    -- Deduct from player
    UPDATE players 
    SET cash = cash - amount, updated_at = NOW()
    WHERE id = contributor_id;
    
    -- Add to treasury
    UPDATE families 
    SET treasury = treasury + amount, updated_at = NOW()
    WHERE id = current_membership.family_id;
    
    -- Update contribution
    UPDATE family_members 
    SET contribution = contribution + amount
    WHERE player_id = contributor_id;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (contributor_id, 'family_contribution', 'cash', -amount, 'Contributed to ' || current_membership.family_name);
    
    RETURN jsonb_build_object('success', true, 'message', 'Contributed $' || amount || ' to treasury!');
END;
$$;

-- Function to get player's family details
CREATE OR REPLACE FUNCTION get_player_family(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    membership RECORD;
    family_data RECORD;
    members_array JSONB;
BEGIN
    -- Get membership
    SELECT fm.*, f.*
    INTO membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = target_player_id;
    
    IF membership IS NULL THEN
        RETURN jsonb_build_object('has_family', false);
    END IF;
    
    -- Get all members
    SELECT json_agg(json_build_object(
        'player_id', fm.player_id,
        'username', p.username,
        'first_name', p.first_name,
        'role', fm.role,
        'contribution', fm.contribution,
        'level', p.level,
        'respect', p.respect,
        'joined_at', fm.joined_at
    ) ORDER BY 
        CASE fm.role 
            WHEN 'Boss' THEN 1 
            WHEN 'Underboss' THEN 2 
            WHEN 'Consigliere' THEN 3 
            WHEN 'Caporegime' THEN 4 
            WHEN 'Soldier' THEN 5 
            ELSE 6 
        END
    )
    INTO members_array
    FROM family_members fm
    JOIN players p ON fm.player_id = p.id
    WHERE fm.family_id = membership.family_id;
    
    RETURN jsonb_build_object(
        'has_family', true,
        'family', jsonb_build_object(
            'id', membership.family_id,
            'name', membership.name,
            'tag', membership.tag,
            'description', membership.description,
            'treasury', membership.treasury,
            'total_respect', membership.total_respect,
            'is_recruiting', membership.is_recruiting,
            'min_level_required', membership.min_level_required,
            'created_at', membership.created_at
        ),
        'my_role', membership.role,
        'my_contribution', membership.contribution,
        'members', COALESCE(members_array, '[]'::jsonb)
    );
END;
$$;

-- Function to search families
CREATE OR REPLACE FUNCTION search_families(
    search_query TEXT DEFAULT NULL,
    result_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    families_array JSONB;
BEGIN
    SELECT json_agg(json_build_object(
        'id', f.id,
        'name', f.name,
        'tag', f.tag,
        'description', f.description,
        'treasury', f.treasury,
        'total_respect', f.total_respect,
        'is_recruiting', f.is_recruiting,
        'min_level_required', f.min_level_required,
        'member_count', (SELECT COUNT(*) FROM family_members WHERE family_id = f.id),
        'boss_name', (SELECT COALESCE(username, first_name) FROM players WHERE id = f.boss_id)
    ) ORDER BY f.total_respect DESC)
    INTO families_array
    FROM families f
    WHERE f.is_recruiting = true
    AND (
        search_query IS NULL 
        OR f.name ILIKE '%' || search_query || '%'
        OR f.tag ILIKE '%' || search_query || '%'
    )
    LIMIT result_limit;
    
    RETURN COALESCE(families_array, '[]'::jsonb);
END;
$$;

-- Function to transfer Boss role
CREATE OR REPLACE FUNCTION transfer_boss(
    current_boss_id UUID,
    new_boss_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    boss_membership RECORD;
    new_boss_membership RECORD;
BEGIN
    -- Verify current boss
    SELECT fm.*, f.id as fam_id INTO boss_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = current_boss_id AND fm.role = 'Boss';
    
    IF boss_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not the Boss.');
    END IF;
    
    -- Verify new boss is in same family
    SELECT * INTO new_boss_membership
    FROM family_members
    WHERE player_id = new_boss_id AND family_id = boss_membership.family_id;
    
    IF new_boss_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player is not in your family.');
    END IF;
    
    -- Transfer
    UPDATE family_members SET role = 'Underboss' WHERE player_id = current_boss_id;
    UPDATE family_members SET role = 'Boss' WHERE player_id = new_boss_id;
    UPDATE families SET boss_id = new_boss_id, updated_at = NOW() WHERE id = boss_membership.fam_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Boss role transferred!');
END;
$$;
