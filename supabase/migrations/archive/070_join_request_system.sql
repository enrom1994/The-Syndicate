-- =====================================================
-- FAMILY IMPROVEMENTS: REQUEST TO JOIN SYSTEM
-- =====================================================
-- RPCs for players to request joining request-only families
-- and for family leaders to approve/reject requests

-- 1. Request to join a family
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
    existing_request RECORD;
    player_level INTEGER;
BEGIN
    -- Get family details
    SELECT * INTO family_record
    FROM families
    WHERE id = family_id_input;
    
    IF family_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Family not found.');
    END IF;
    
    -- Check if family allows requests
    IF family_record.join_type = 'open' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This family is open to join. No request needed.');
    END IF;
    
    -- Check if player is already in a family
    IF EXISTS (SELECT 1 FROM family_members WHERE player_id = requester_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are already in a family.');
    END IF;
    
    -- Check if there's already a pending request
    SELECT * INTO existing_request
    FROM family_join_requests
    WHERE family_id = family_id_input 
    AND player_id = requester_id 
    AND status = 'pending';
    
    IF existing_request IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already have a pending request for this family.');
    END IF;
    
    -- Check player level requirement
    SELECT level INTO player_level FROM players WHERE id = requester_id;
    IF player_level < family_record.min_level_required THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'You need to be at least Level ' || family_record.min_level_required || ' to join.'
        );
    END IF;
    
    -- Create the join request
    INSERT INTO family_join_requests (family_id, player_id, message, status)
    VALUES (family_id_input, requester_id, message_input, 'pending');
    
    -- Notify family Don
    INSERT INTO notifications (player_id, type, title, message)
    SELECT boss_id, 'family_join_request', 'Join Request', 
           COALESCE((SELECT username FROM players WHERE id = requester_id), 
                    (SELECT first_name FROM players WHERE id = requester_id)) || ' wants to join your family!'
    FROM families WHERE id = family_id_input;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Join request sent to ' || family_record.name || '!'
    );
END;
$$;


-- 2. Process a join request (accept or reject)
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
    actor_role TEXT;
    player_name TEXT;
BEGIN
    -- Validate action
    IF action NOT IN ('accept', 'reject') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid action.');
    END IF;
    
    -- Get request details
    SELECT fjr.*, f.name as family_name
    INTO request_record
    FROM family_join_requests fjr
    JOIN families f ON fjr.family_id = f.id
    WHERE fjr.id = request_id AND fjr.status = 'pending';
    
    IF request_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found or already processed.');
    END IF;
    
    -- Check if actor is Don or Consigliere of this family
    SELECT role INTO actor_role
    FROM family_members
    WHERE player_id = actor_id AND family_id = request_record.family_id;
    
    IF actor_role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can process join requests.');
    END IF;
    
    -- Get player name
    SELECT COALESCE(username, first_name) INTO player_name
    FROM players WHERE id = request_record.player_id;
    
    -- Check if player is still not in a family
    IF EXISTS (SELECT 1 FROM family_members WHERE player_id = request_record.player_id) THEN
        UPDATE family_join_requests SET status = 'rejected' WHERE id = request_id;
        RETURN jsonb_build_object('success', false, 'message', 'Player is already in a family.');
    END IF;
    
    IF action = 'accept' THEN
        -- Add player to family as Recruit
        INSERT INTO family_members (family_id, player_id, role)
        VALUES (request_record.family_id, request_record.player_id, 'Recruit');
        
        -- Update request status
        UPDATE family_join_requests SET status = 'accepted' WHERE id = request_id;
        
        -- Notify player
        INSERT INTO notifications (player_id, type, title, message)
        VALUES (
            request_record.player_id,
            'family_join_accepted',
            'Request Accepted',
            'Your request to join ' || request_record.family_name || ' has been accepted!'
        );
        
        RETURN jsonb_build_object('success', true, 'message', player_name || ' has joined the family!');
    ELSE
        -- Reject request
        UPDATE family_join_requests SET status = 'rejected' WHERE id = request_id;
        
        -- Notify player
        INSERT INTO notifications (player_id, type, title, message)
        VALUES (
            request_record.player_id,
            'family_join_rejected',
            'Request Declined',
            'Your request to join ' || request_record.family_name || ' was declined.'
        );
        
        RETURN jsonb_build_object('success', true, 'message', 'Request declined.');
    END IF;
END;
$$;


-- 3. Get pending join requests for a family (for leaders)
CREATE OR REPLACE FUNCTION get_family_join_requests(
    actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    actor_family UUID;
    actor_role TEXT;
    requests_array JSONB;
BEGIN
    -- Get actor's family and role
    SELECT family_id, role INTO actor_family, actor_role
    FROM family_members
    WHERE player_id = actor_id;
    
    IF actor_family IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    IF actor_role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can view join requests.');
    END IF;
    
    -- Get pending requests
    SELECT json_agg(json_build_object(
        'request_id', fjr.id,
        'player_id', p.id,
        'player_name', COALESCE(p.username, p.first_name),
        'player_level', p.level,
        'player_respect', p.respect,
        'message', fjr.message,
        'created_at', fjr.created_at
    ) ORDER BY fjr.created_at ASC)
    INTO requests_array
    FROM family_join_requests fjr
    JOIN players p ON fjr.player_id = p.id
    WHERE fjr.family_id = actor_family 
    AND fjr.status = 'pending';
    
    RETURN jsonb_build_object(
        'success', true,
        'requests', COALESCE(requests_array, '[]'::jsonb)
    );
END;
$$;
