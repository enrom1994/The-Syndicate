-- =====================================================
-- FIX: Family System - Search Visibility & Invite Links
-- Run this in Supabase SQL Editor
-- =====================================================
-- Issues to fix:
-- 1. 400 error when inviting - missing notification types
-- 2. Request-only families not showing in search
-- 3. Add family invite codes like referral links


-- =====================================================
-- STEP 1: Fix notification type constraint (for 400 error)
-- =====================================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'attack', 
    'income', 
    'job', 
    'family', 
    'system', 
    'bounty', 
    'purchase', 
    'upgrade', 
    'reward', 
    'business',
    'level',
    'achievement',
    'family_invite',
    'family_invite_accepted',
    'family_invite_rejected',
    'family_join_request',
    'family_join_accepted',
    'family_join_rejected'
));


-- =====================================================
-- STEP 2: Create family_invites table if missing
-- =====================================================
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invite 
ON family_invites(family_id, invitee_id) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invites_invitee 
ON family_invites(invitee_id) 
WHERE status = 'pending';


-- =====================================================
-- STEP 3: Add invite_code to families table
-- Like referral codes but for family invites
-- =====================================================
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate invite codes for existing families
UPDATE public.families 
SET invite_code = UPPER(SUBSTR(MD5(id::TEXT || NOW()::TEXT), 1, 8))
WHERE invite_code IS NULL;


-- =====================================================
-- STEP 4: Fix search_families to show request-only families
-- They should be visible but show "Request to Join" button
-- =====================================================
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
        'join_type', f.join_type,  -- 'open' or 'request'
        'invite_code', f.invite_code,
        'min_level_required', f.min_level_required,
        'member_count', (SELECT COUNT(*) FROM family_members WHERE family_id = f.id),
        'boss_name', (SELECT COALESCE(username, first_name) FROM players WHERE id = f.boss_id)
    ) ORDER BY f.total_respect DESC)
    INTO families_array
    FROM families f
    WHERE f.is_recruiting = true  -- Only show recruiting families
    AND (
        search_query IS NULL 
        OR f.name ILIKE '%' || search_query || '%'
        OR f.tag ILIKE '%' || search_query || '%'
    )
    LIMIT result_limit;
    
    RETURN COALESCE(families_array, '[]'::jsonb);
END;
$$;


-- =====================================================
-- STEP 5: Join family by invite code (like referral)
-- =====================================================
CREATE OR REPLACE FUNCTION join_family_by_code(
    player_id_input UUID,
    invite_code_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    family_record RECORD;
    player_record RECORD;
    player_level INTEGER;
BEGIN
    -- Find family by invite code
    SELECT * INTO family_record
    FROM families
    WHERE invite_code = UPPER(TRIM(invite_code_input));
    
    IF family_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid invite code.');
    END IF;
    
    -- Check if player is already in a family
    IF EXISTS (SELECT 1 FROM family_members WHERE player_id = player_id_input) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are already in a family.');
    END IF;
    
    -- Check level requirement
    SELECT level INTO player_level FROM players WHERE id = player_id_input;
    IF player_level < family_record.min_level_required THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'You need to be at least Level ' || family_record.min_level_required || ' to join this family.'
        );
    END IF;
    
    -- If family requires request, create a request instead of direct join
    IF family_record.join_type = 'request' THEN
        -- Check if there's already a pending request
        IF EXISTS (
            SELECT 1 FROM family_join_requests 
            WHERE family_id = family_record.id 
            AND player_id = player_id_input 
            AND status = 'pending'
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'You already have a pending request for this family.');
        END IF;
        
        -- Create join request
        INSERT INTO family_join_requests (family_id, player_id, status, message)
        VALUES (family_record.id, player_id_input, 'pending', 'Joined via invite code');
        
        -- Notify family Don
        INSERT INTO notifications (player_id, type, title, message)
        VALUES (
            family_record.boss_id, 
            'family_join_request', 
            'Join Request', 
            (SELECT COALESCE(username, first_name, 'Someone') FROM players WHERE id = player_id_input) 
            || ' wants to join via invite code!'
        );
        
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Join request sent to ' || family_record.name || '! Wait for approval.',
            'requires_approval', true
        );
    END IF;
    
    -- Open family - join directly
    INSERT INTO family_members (family_id, player_id, role)
    VALUES (family_record.id, player_id_input, 'Recruit');
    
    -- Notify family Don
    INSERT INTO notifications (player_id, type, title, message)
    VALUES (
        family_record.boss_id, 
        'family', 
        'New Member!', 
        (SELECT COALESCE(username, first_name, 'Someone') FROM players WHERE id = player_id_input) 
        || ' joined your family!'
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Welcome to ' || family_record.name || '!',
        'family_id', family_record.id,
        'requires_approval', false
    );
END;
$$;


-- =====================================================
-- STEP 6: Get family invite link info
-- Returns the invite code for sharing
-- =====================================================
CREATE OR REPLACE FUNCTION get_family_invite_info(player_id_input UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    membership RECORD;
    family_record RECORD;
BEGIN
    -- Get player's family
    SELECT fm.*, f.id as fam_id, f.name as fam_name, f.invite_code as fam_invite_code
    INTO membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = player_id_input;
    
    IF membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check if player can invite (Don, Consigliere, Advisor, Lieutenant)
    IF membership.role NOT IN ('Don', 'Consigliere', 'Advisor', 'Lieutenant') THEN
        RETURN jsonb_build_object('success', false, 'message', 'You do not have permission to invite members.');
    END IF;
    
    -- Generate invite code if missing
    IF membership.fam_invite_code IS NULL THEN
        UPDATE families 
        SET invite_code = UPPER(SUBSTR(MD5(id::TEXT || NOW()::TEXT), 1, 8))
        WHERE id = membership.fam_id
        RETURNING invite_code INTO membership.fam_invite_code;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'family_name', membership.fam_name,
        'invite_code', membership.fam_invite_code
    );
END;
$$;


-- =====================================================
-- Verify fixes
-- =====================================================
SELECT 'Family system fixes applied!' as status;

-- Show sample family with invite code
SELECT id, name, invite_code, join_type, is_recruiting 
FROM families 
LIMIT 5;
