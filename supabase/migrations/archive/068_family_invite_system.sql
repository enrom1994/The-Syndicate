-- =====================================================
-- FAMILY IMPROVEMENTS: INVITE SYSTEM
-- =====================================================
-- RPCs for inviting players to join the family

-- 1. Invite a player to join the family
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
    
    -- Check if inviter has permission (Don, Consigliere, Advisor, Lieutenant)
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
    
    -- Check if there's already a pending invite
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
    
    -- Send notification to invitee
    INSERT INTO notifications (player_id, type, title, message)
    VALUES (
        invitee_record.id,
        'family_invite',
        'Family Invitation',
        'You have been invited to join ' || family_name || '!'
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Invite sent to ' || COALESCE(invitee_record.username, invitee_record.first_name) || '!'
    );
END;
$$;


-- 2. Process a family invite (accept or reject)
CREATE OR REPLACE FUNCTION process_family_invite(
    player_id_input UUID,
    invite_id UUID,
    action TEXT -- 'accept' or 'reject'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invite_record RECORD;
    family_name TEXT;
    inviter_name TEXT;
BEGIN
    -- Validate action
    IF action NOT IN ('accept', 'reject') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid action.');
    END IF;
    
    -- Get invite details
    SELECT fi.*, f.name as fam_name, p.username as inv_username, p.first_name as inv_first_name
    INTO invite_record
    FROM family_invites fi
    JOIN families f ON fi.family_id = f.id
    JOIN players p ON fi.inviter_id = p.id
    WHERE fi.id = invite_id AND fi.invitee_id = player_id_input AND fi.status = 'pending';
    
    IF invite_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invite not found or already processed.');
    END IF;
    
    family_name := invite_record.fam_name;
    inviter_name := COALESCE(invite_record.inv_username, invite_record.inv_first_name);
    
    -- Check if invite has expired
    IF invite_record.expires_at < NOW() THEN
        UPDATE family_invites SET status = 'expired' WHERE id = invite_id;
        RETURN jsonb_build_object('success', false, 'message', 'This invite has expired.');
    END IF;
    
    -- Check if player is already in a family
    IF EXISTS (SELECT 1 FROM family_members WHERE player_id = player_id_input) THEN
        UPDATE family_invites SET status = 'rejected' WHERE id = invite_id;
        RETURN jsonb_build_object('success', false, 'message', 'You are already in a family.');
    END IF;
    
    IF action = 'accept' THEN
        -- Add player to family as Recruit
        INSERT INTO family_members (family_id, player_id, role)
        VALUES (invite_record.family_id, player_id_input, 'Recruit');
        
        -- Update invite status
        UPDATE family_invites SET status = 'accepted' WHERE id = invite_id;
        
        -- Notify inviter
        INSERT INTO notifications (player_id, type, title, message)
        VALUES (
            invite_record.inviter_id,
            'family_invite_accepted',
            'Invite Accepted',
            COALESCE((SELECT username FROM players WHERE id = player_id_input), 
                     (SELECT first_name FROM players WHERE id = player_id_input)) || ' joined your family!'
        );
        
        RETURN jsonb_build_object('success', true, 'message', 'Welcome to ' || family_name || '!');
    ELSE
        -- Reject invite
        UPDATE family_invites SET status = 'rejected' WHERE id = invite_id;
        
        -- Notify inviter
        INSERT INTO notifications (player_id, type, title, message)
        VALUES (
            invite_record.inviter_id,
            'family_invite_rejected',
            'Invite Declined',
            COALESCE((SELECT username FROM players WHERE id = player_id_input), 
                     (SELECT first_name FROM players WHERE id = player_id_input)) || ' declined your invite.'
        );
        
        RETURN jsonb_build_object('success', true, 'message', 'Invite declined.');
    END IF;
END;
$$;


-- 3. Get my pending family invites
CREATE OR REPLACE FUNCTION get_my_family_invites(
    player_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invites_array JSONB;
BEGIN
    SELECT json_agg(json_build_object(
        'invite_id', fi.id,
        'family_id', f.id,
        'family_name', f.name,
        'family_tag', f.tag,
        'inviter_name', COALESCE(p.username, p.first_name),
        'message', fi.message,
        'expires_at', fi.expires_at,
        'created_at', fi.created_at
    ))
    INTO invites_array
    FROM family_invites fi
    JOIN families f ON fi.family_id = f.id
    JOIN players p ON fi.inviter_id = p.id
    WHERE fi.invitee_id = player_id_input 
    AND fi.status = 'pending'
    AND fi.expires_at > NOW()
    ORDER BY fi.created_at DESC;
    
    RETURN COALESCE(invites_array, '[]'::jsonb);
END;
$$;
