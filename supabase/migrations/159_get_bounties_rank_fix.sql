-- =====================================================
-- HOTFIX: UPDATE get_bounties TO USE RANK
-- =====================================================
-- Update get_bounties RPC to return required_rank 
-- and calculate player_meets_rank
-- =====================================================

SET search_path = public;

DROP FUNCTION IF EXISTS get_bounties(uuid);

CREATE OR REPLACE FUNCTION get_bounties(requester_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    npc_bounties JSONB;
    player_bounties JSONB;
    my_bounties JSONB;
    player_respect INTEGER;
BEGIN
    -- Expire old bounties
    UPDATE bounties 
    SET status = 'expired' 
    WHERE status = 'active' AND expires_at < NOW();
    
    -- Get player respect
    SELECT COALESCE(respect, 0) INTO player_respect FROM players WHERE id = requester_id;
    
    -- Get NPC bounties with cooldowns and rank info
    SELECT json_agg(json_build_object(
        'id', bd.id,
        'type', 'npc',
        'target_name', bd.target_name,
        'description', bd.description,
        'difficulty', bd.difficulty,
        'min_reward', bd.min_reward,
        'max_reward', bd.max_reward,
        'respect_reward', bd.respect_reward,
        'required_level', bd.required_level,
        'required_rank', COALESCE(bd.required_rank, 'Street Thug'),
        'cooldown_hours', bd.cooldown_hours,
        'available_at', pbc.available_at,
        'is_available', (pbc.available_at IS NULL OR pbc.available_at <= NOW()),
        'player_meets_rank', (player_respect >= get_respect_for_rank(COALESCE(bd.required_rank, 'Street Thug')))
    ) ORDER BY bd.required_level, bd.difficulty)
    INTO npc_bounties
    FROM bounty_definitions bd
    LEFT JOIN player_bounty_cooldowns pbc ON pbc.bounty_definition_id = bd.id AND pbc.player_id = requester_id
    WHERE bd.is_active = true;
    
    -- Get active player-placed bounties (not placed by requester, not targeting requester)
    SELECT json_agg(json_build_object(
        'id', b.id,
        'type', 'player',
        'target_player_id', b.target_player_id,
        'target_name', COALESCE(p.username, p.first_name, 'Unknown'),
        'target_level', p.level,
        'target_rank', get_rank_from_respect(COALESCE(p.respect, 0)),
        'bounty_amount', b.bounty_amount,
        'placed_by', COALESCE(placer.username, placer.first_name, 'Anonymous'),
        'expires_at', b.expires_at,
        'time_remaining', EXTRACT(EPOCH FROM (b.expires_at - NOW()))::INTEGER
    ) ORDER BY b.bounty_amount DESC)
    INTO player_bounties
    FROM bounties b
    JOIN players p ON p.id = b.target_player_id
    JOIN players placer ON placer.id = b.placed_by_player_id
    WHERE b.bounty_type = 'player' 
      AND b.status = 'active'
      AND b.target_player_id != requester_id
      AND b.placed_by_player_id != requester_id;
    
    -- Get bounties I placed
    SELECT json_agg(json_build_object(
        'id', b.id,
        'target_player_id', b.target_player_id,
        'target_name', COALESCE(p.username, p.first_name, 'Unknown'),
        'target_rank', get_rank_from_respect(COALESCE(p.respect, 0)),
        'bounty_amount', b.bounty_amount,
        'status', b.status,
        'expires_at', b.expires_at,
        'time_remaining', EXTRACT(EPOCH FROM (b.expires_at - NOW()))::INTEGER,
        'claimed_by', COALESCE(claimer.username, claimer.first_name)
    ) ORDER BY b.created_at DESC)
    INTO my_bounties
    FROM bounties b
    JOIN players p ON p.id = b.target_player_id
    LEFT JOIN players claimer ON claimer.id = b.claimed_by_player_id
    WHERE b.placed_by_player_id = requester_id AND b.bounty_type = 'player';
    
    RETURN jsonb_build_object(
        'npc_bounties', COALESCE(npc_bounties, '[]'::jsonb),
        'player_bounties', COALESCE(player_bounties, '[]'::jsonb),
        'my_bounties', COALESCE(my_bounties, '[]'::jsonb)
    );
END;
$$;

ALTER FUNCTION public.get_bounties(UUID) SET search_path = public;

COMMENT ON FUNCTION get_bounties IS 'Returns available bounties with rank information';
