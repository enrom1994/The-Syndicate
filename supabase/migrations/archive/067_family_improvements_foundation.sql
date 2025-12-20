-- =====================================================
-- FAMILY IMPROVEMENTS: DATABASE FOUNDATION
-- =====================================================
-- Phase 1: Tables and Schema
-- - family_join_requests: Stores join requests for request-only families
-- - family_invites: Stores invitations from family members
-- - join_type: Configures if family is open or request-only

-- 1. Create family join requests table
CREATE TABLE IF NOT EXISTS family_join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate pending requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_join_request 
ON family_join_requests(family_id, player_id) 
WHERE status = 'pending';

-- Index for finding pending requests by family
CREATE INDEX IF NOT EXISTS idx_join_requests_family 
ON family_join_requests(family_id) 
WHERE status = 'pending';

-- Index for finding requests by player
CREATE INDEX IF NOT EXISTS idx_join_requests_player 
ON family_join_requests(player_id);


-- 2. Create family invites table
CREATE TABLE IF NOT EXISTS family_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    message TEXT,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate pending invites
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invite 
ON family_invites(family_id, invitee_id) 
WHERE status = 'pending';

-- Index for finding invites by invitee
CREATE INDEX IF NOT EXISTS idx_invites_invitee 
ON family_invites(invitee_id) 
WHERE status = 'pending';

-- Index for finding invites by family
CREATE INDEX IF NOT EXISTS idx_invites_family 
ON family_invites(family_id);


-- 3. Add join_type column to families table
ALTER TABLE families 
ADD COLUMN IF NOT EXISTS join_type TEXT NOT NULL DEFAULT 'open' 
CHECK (join_type IN ('open', 'request'));

-- 4. Update create_family function to accept join_type
CREATE OR REPLACE FUNCTION create_family(
    creator_id UUID,
    family_name TEXT,
    family_tag TEXT,
    family_description TEXT DEFAULT NULL,
    family_join_type TEXT DEFAULT 'open'
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
    
    -- Validate join_type
    IF family_join_type NOT IN ('open', 'request') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid join type. Must be open or request.');
    END IF;
    
    -- Deduct diamonds
    UPDATE players 
    SET diamonds = diamonds - diamond_cost, updated_at = NOW()
    WHERE id = creator_id;
    
    -- Create family with join_type
    INSERT INTO families (name, tag, description, boss_id, join_type)
    VALUES (family_name, family_tag, family_description, creator_id, family_join_type)
    RETURNING id INTO new_family_id;
    
    -- Add creator as Don
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


-- 5. Update search_families to show join_type
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
        'join_type', f.join_type,
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
