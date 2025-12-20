-- =====================================================
-- FIX TOURNAMENT NET WORTH CALCULATION
-- =====================================================
-- Include business value in tournament ranking to match
-- the main leaderboard calculation
-- =====================================================

SET search_path = public;

-- Drop and recreate the function with correct net worth calculation
DROP FUNCTION IF EXISTS public.get_current_tournament(UUID);

CREATE OR REPLACE FUNCTION public.get_current_tournament(
    player_id_input UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_player_id UUID;
    v_tournament RECORD;
    v_is_registered BOOLEAN := FALSE;
    v_is_founder BOOLEAN := FALSE;
    v_player_rank INTEGER;
    v_player_networth BIGINT;
    v_participant_count INTEGER;
BEGIN
    -- Get player ID
    v_player_id := COALESCE(player_id_input, auth.uid());
    
    -- Find active tournament (current time between start and end)
    SELECT * INTO v_tournament
    FROM tournaments
    WHERE is_active = TRUE
      AND NOW() >= starts_at
      AND NOW() < ends_at
    ORDER BY starts_at DESC
    LIMIT 1;
    
    -- No active tournament
    IF v_tournament.id IS NULL THEN
        -- Check for upcoming tournament
        SELECT * INTO v_tournament
        FROM tournaments
        WHERE is_active = TRUE
          AND NOW() < starts_at
        ORDER BY starts_at ASC
        LIMIT 1;
        
        IF v_tournament.id IS NULL THEN
            RETURN jsonb_build_object(
                'has_tournament', false
            );
        END IF;
    END IF;
    
    -- Get participant count
    SELECT COUNT(*) INTO v_participant_count
    FROM tournament_participants
    WHERE tournament_id = v_tournament.id;
    
    -- Check player status if provided
    IF v_player_id IS NOT NULL THEN
        -- Check if founder
        SELECT founder_bonus_claimed INTO v_is_founder
        FROM players
        WHERE id = v_player_id;
        
        -- Check if registered
        SELECT EXISTS(
            SELECT 1 FROM tournament_participants
            WHERE tournament_id = v_tournament.id
              AND player_id = v_player_id
        ) INTO v_is_registered;
        
        -- Get player's current rank and net worth INCLUDING BUSINESS VALUE
        -- This matches the main leaderboard calculation exactly
        WITH ranked AS (
            SELECT 
                p.id,
                (
                    COALESCE(p.cash, 0) + 
                    COALESCE(p.banked_cash, 0) + 
                    COALESCE((
                        SELECT SUM(bd.base_purchase_cost * pb.level)
                        FROM player_businesses pb
                        JOIN business_definitions bd ON pb.business_id = bd.id
                        WHERE pb.player_id = p.id
                    ), 0)
                )::BIGINT as networth,
                ROW_NUMBER() OVER (
                    ORDER BY (
                        COALESCE(p.cash, 0) + 
                        COALESCE(p.banked_cash, 0) + 
                        COALESCE((
                            SELECT SUM(bd.base_purchase_cost * pb.level)
                            FROM player_businesses pb
                            JOIN business_definitions bd ON pb.business_id = bd.id
                            WHERE pb.player_id = p.id
                        ), 0)
                    ) DESC
                ) as rank
            FROM players p
            INNER JOIN tournament_participants tp ON tp.player_id = p.id
            WHERE tp.tournament_id = v_tournament.id
        )
        SELECT rank, networth INTO v_player_rank, v_player_networth
        FROM ranked
        WHERE id = v_player_id;
    END IF;
    
    RETURN jsonb_build_object(
        'has_tournament', true,
        'tournament', jsonb_build_object(
            'id', v_tournament.id,
            'name', v_tournament.name,
            'description', v_tournament.description,
            'prize_amount', v_tournament.prize_amount,
            'prize_currency', v_tournament.prize_currency,
            'starts_at', v_tournament.starts_at,
            'ends_at', v_tournament.ends_at,
            'ranking_metric', v_tournament.ranking_metric,
            'eligibility', v_tournament.eligibility,
            'is_started', NOW() >= v_tournament.starts_at,
            'is_ended', NOW() >= v_tournament.ends_at,
            'participant_count', v_participant_count
        ),
        'player', jsonb_build_object(
            'is_founder', COALESCE(v_is_founder, false),
            'is_registered', v_is_registered,
            'current_rank', v_player_rank,
            'current_networth', v_player_networth
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_tournament(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_tournament(UUID) TO anon;

COMMENT ON FUNCTION get_current_tournament IS 'Get active tournament info with player rank (net worth includes business value).';
