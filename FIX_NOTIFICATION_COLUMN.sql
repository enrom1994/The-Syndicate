-- =====================================================
-- FIX: Notifications column name (message -> description)
-- Run this in Supabase SQL Editor
-- =====================================================
-- Issue: Family join RPCs try to insert into 'message' column
-- but the notifications table uses 'description' column


-- =====================================================
-- Fix request_to_join_family RPC
-- =====================================================
CREATE OR REPLACE FUNCTION request_to_join_family(
    requester_id UUID,
    family_id_input UUID,
    message_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    family_record RECORD;
    player_record RECORD;
    existing_request RECORD;
    existing_membership RECORD;
BEGIN
    -- Get family details
    SELECT * INTO family_record FROM families WHERE id = family_id_input;
    IF family_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Family not found.');
    END IF;
    
    -- Get player details
    SELECT * INTO player_record FROM players WHERE id = requester_id;
    
    -- Check if player is already in a family
    SELECT * INTO existing_membership FROM family_members WHERE player_id = requester_id;
    IF existing_membership IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are already in a family.');
    END IF;
    
    -- Check level requirement
    IF player_record.level < family_record.min_level_required THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'You need to be at least Level ' || family_record.min_level_required || ' to join.'
        );
    END IF;
    
    -- Check for existing pending request
    SELECT * INTO existing_request 
    FROM family_join_requests 
    WHERE family_id = family_id_input 
    AND player_id = requester_id 
    AND status = 'pending';
    
    IF existing_request IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already have a pending request for this family.');
    END IF;
    
    -- Create join request
    INSERT INTO family_join_requests (family_id, player_id, status, message)
    VALUES (family_id_input, requester_id, 'pending', message_input);
    
    -- Notify family boss (using 'description' column, not 'message')
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        family_record.boss_id, 
        'family', 
        'New Join Request', 
        COALESCE(player_record.username, player_record.first_name, 'Someone') || ' wants to join your family!'
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Join request sent to ' || family_record.name || '!'
    );
END;
$$;


-- =====================================================
-- Fix process_join_request RPC
-- =====================================================
CREATE OR REPLACE FUNCTION process_join_request(
    actor_id UUID,
    request_id UUID,
    action TEXT -- 'accept' or 'reject'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record RECORD;
    actor_membership RECORD;
    family_name TEXT;
BEGIN
    -- Validate action
    IF action NOT IN ('accept', 'reject') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid action. Use accept or reject.');
    END IF;
    
    -- Get actor's membership and role
    SELECT fm.*, f.name as fam_name, f.id as fam_id
    INTO actor_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = actor_id;
    
    IF actor_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check if actor has permission (Don or Consigliere)
    IF actor_membership.role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can process join requests.');
    END IF;
    
    family_name := actor_membership.fam_name;
    
    -- Get request details
    SELECT * INTO request_record 
    FROM family_join_requests 
    WHERE id = request_id 
    AND family_id = actor_membership.fam_id
    AND status = 'pending';
    
    IF request_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found or already processed.');
    END IF;
    
    IF action = 'accept' THEN
        -- Check if player is still not in a family
        IF EXISTS (SELECT 1 FROM family_members WHERE player_id = request_record.player_id) THEN
            UPDATE family_join_requests SET status = 'rejected' WHERE id = request_id;
            RETURN jsonb_build_object('success', false, 'message', 'Player is already in a family.');
        END IF;
        
        -- Add player to family
        INSERT INTO family_members (family_id, player_id, role)
        VALUES (actor_membership.fam_id, request_record.player_id, 'Recruit');
        
        -- Update request status
        UPDATE family_join_requests SET status = 'accepted', updated_at = NOW() WHERE id = request_id;
        
        -- Notify the requester (using 'description' column)
        INSERT INTO notifications (player_id, type, title, description)
        VALUES (
            request_record.player_id, 
            'family', 
            'Request Accepted!', 
            'Your request to join ' || family_name || ' has been accepted!'
        );
        
        RETURN jsonb_build_object('success', true, 'message', 'Player added to family as Recruit.');
    ELSE
        -- Reject request
        UPDATE family_join_requests SET status = 'rejected', updated_at = NOW() WHERE id = request_id;
        
        -- Notify the requester (using 'description' column)
        INSERT INTO notifications (player_id, type, title, description)
        VALUES (
            request_record.player_id, 
            'family', 
            'Request Declined', 
            'Your request to join ' || family_name || ' was declined.'
        );
        
        RETURN jsonb_build_object('success', true, 'message', 'Request declined.');
    END IF;
END;
$$;


-- =====================================================
-- Fix invite_to_family RPC
-- =====================================================
CREATE OR REPLACE FUNCTION invite_to_family(
    inviter_id UUID,
    invitee_username TEXT,
    message_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inviter_membership RECORD;
    invitee_record RECORD;
    family_name TEXT;
    existing_invite RECORD;
BEGIN
    -- Get inviter's membership
    SELECT fm.*, f.name as fam_name, f.id as fam_id
    INTO inviter_membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = inviter_id;
    
    IF inviter_membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check if inviter has permission
    IF inviter_membership.role NOT IN ('Don', 'Consigliere', 'Advisor', 'Lieutenant') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don, Consigliere, Advisor, or Lieutenant can invite members.');
    END IF;
    
    family_name := inviter_membership.fam_name;
    
    -- Find invitee by username
    SELECT * INTO invitee_record
    FROM players
    WHERE username = invitee_username OR first_name = invitee_username;
    
    IF invitee_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found.');
    END IF;
    
    -- Check if invitee is already in a family
    IF EXISTS (SELECT 1 FROM family_members WHERE player_id = invitee_record.id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This player is already in a family.');
    END IF;
    
    -- Check for pending invite
    SELECT * INTO existing_invite
    FROM family_invites
    WHERE family_id = inviter_membership.fam_id 
    AND invitee_id = invitee_record.id 
    AND status = 'pending';
    
    IF existing_invite IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'An invite is already pending for this player.');
    END IF;
    
    -- Create the invite
    INSERT INTO family_invites (family_id, inviter_id, invitee_id, message, status)
    VALUES (inviter_membership.fam_id, inviter_id, invitee_record.id, message_input, 'pending');
    
    -- Send notification to invitee (using 'description' column)
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        invitee_record.id,
        'family',
        'Family Invitation',
        'You have been invited to join ' || family_name || '!'
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Invite sent to ' || COALESCE(invitee_record.username, invitee_record.first_name) || '!'
    );
END;
$$;


-- =====================================================
-- Fix join_family_by_code RPC
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
    
    -- Get player info
    SELECT * INTO player_record FROM players WHERE id = player_id_input;
    
    -- Check level requirement
    IF player_record.level < family_record.min_level_required THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'You need to be at least Level ' || family_record.min_level_required || ' to join this family.'
        );
    END IF;
    
    -- If family requires request, create a request instead of direct join
    IF family_record.join_type = 'request' THEN
        -- Check for existing pending request
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
        
        -- Notify family Don (using 'description' column)
        INSERT INTO notifications (player_id, type, title, description)
        VALUES (
            family_record.boss_id, 
            'family', 
            'Join Request', 
            COALESCE(player_record.username, player_record.first_name, 'Someone') || ' wants to join via invite code!'
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
    
    -- Notify family Don (using 'description' column)
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        family_record.boss_id, 
        'family', 
        'New Member!', 
        COALESCE(player_record.username, player_record.first_name, 'Someone') || ' joined your family!'
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
-- Done!
-- =====================================================
SELECT 'Family notification column fix applied!' as status;
