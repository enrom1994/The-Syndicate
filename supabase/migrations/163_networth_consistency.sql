-- =====================================================
-- FIX NET WORTH CONSISTENCY
-- =====================================================
-- Include business value in net worth calculation to match
-- ProfilePage and provide a consistent "total empire value"
-- =====================================================

SET search_path = public;

-- Drop existing function to allow changes
DROP FUNCTION IF EXISTS public.get_leaderboard(TEXT, INTEGER) CASCADE;

-- Recreate leaderboard function with business value included in net worth
CREATE OR REPLACE FUNCTION get_leaderboard(
    leaderboard_type TEXT,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    rank BIGINT,
    player_id UUID,
    username TEXT,
    value BIGINT,
    has_made_man BOOLEAN
) AS $$
BEGIN
    IF leaderboard_type = 'networth' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY (
                COALESCE(p.cash, 0) + 
                COALESCE(p.banked_cash, 0) + 
                COALESCE((
                    SELECT SUM(bd.base_purchase_cost * pb.level)
                    FROM player_businesses pb
                    JOIN business_definitions bd ON pb.business_id = bd.id
                    WHERE pb.player_id = p.id
                ), 0)
            ) DESC, p.created_at ASC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            (
                COALESCE(p.cash, 0) + 
                COALESCE(p.banked_cash, 0) + 
                COALESCE((
                    SELECT SUM(bd.base_purchase_cost * pb.level)
                    FROM player_businesses pb
                    JOIN business_definitions bd ON pb.business_id = bd.id
                    WHERE pb.player_id = p.id
                ), 0)
            )::BIGINT as value,
            COALESCE(p.starter_pack_claimed, false) as has_made_man
        FROM public.players p
        ORDER BY value DESC, p.created_at ASC
        LIMIT limit_count;
        
    ELSIF leaderboard_type = 'respect' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.respect, 0) DESC, p.created_at ASC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            COALESCE(p.respect, 0)::BIGINT as value,
            COALESCE(p.starter_pack_claimed, false) as has_made_man
        FROM public.players p
        ORDER BY COALESCE(p.respect, 0) DESC, p.created_at ASC
        LIMIT limit_count;
        
    ELSIF leaderboard_type = 'wins' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_attacks_won, 0) DESC, p.created_at ASC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            COALESCE(p.total_attacks_won, 0)::BIGINT as value,
            COALESCE(p.starter_pack_claimed, false) as has_made_man
        FROM public.players p
        ORDER BY COALESCE(p.total_attacks_won, 0) DESC, p.created_at ASC
        LIMIT limit_count;
        
    ELSIF leaderboard_type = 'families' THEN
        -- Calculate family respect as SUM of member respect
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY total_member_respect DESC, f.created_at ASC) as rank,
            f.id as player_id,
            f.name as username,
            total_member_respect as value,
            false as has_made_man
        FROM public.families f
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(COALESCE(p.respect, 0)), 0)::BIGINT as total_member_respect
            FROM family_members fm
            JOIN players p ON p.id = fm.player_id
            WHERE fm.family_id = f.id
        ) member_stats ON true
        WHERE EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = f.id)
        ORDER BY total_member_respect DESC, f.created_at ASC
        LIMIT limit_count;
        
    ELSE
        -- Default to networth with business value
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY (
                COALESCE(p.cash, 0) + 
                COALESCE(p.banked_cash, 0) + 
                COALESCE((
                    SELECT SUM(bd.base_purchase_cost * pb.level)
                    FROM player_businesses pb
                    JOIN business_definitions bd ON pb.business_id = bd.id
                    WHERE pb.player_id = p.id
                ), 0)
            ) DESC, p.created_at ASC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            (
                COALESCE(p.cash, 0) + 
                COALESCE(p.banked_cash, 0) + 
                COALESCE((
                    SELECT SUM(bd.base_purchase_cost * pb.level)
                    FROM player_businesses pb
                    JOIN business_definitions bd ON pb.business_id = bd.id
                    WHERE pb.player_id = p.id
                ), 0)
            )::BIGINT as value,
            COALESCE(p.starter_pack_claimed, false) as has_made_man
        FROM public.players p
        ORDER BY value DESC, p.created_at ASC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_leaderboard(TEXT, INTEGER) SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INTEGER) TO anon;

COMMENT ON FUNCTION get_leaderboard IS 'Leaderboard: networth (includes business value), respect, wins, families.';

-- =====================================================
-- UPDATE GET_PLAYER_RANK TO INCLUDE BUSINESS VALUE
-- =====================================================

DROP FUNCTION IF EXISTS public.get_player_rank(UUID);

CREATE OR REPLACE FUNCTION get_player_rank(
    player_id_input UUID
)
RETURNS TABLE (
    rank BIGINT,
    networth BIGINT,
    total_players BIGINT
) AS $$
DECLARE
    v_networth BIGINT;
BEGIN
    -- Get the player's net worth including business value
    SELECT (
        COALESCE(p.cash, 0) + 
        COALESCE(p.banked_cash, 0) + 
        COALESCE((
            SELECT SUM(bd.base_purchase_cost * pb.level)
            FROM player_businesses pb
            JOIN business_definitions bd ON pb.business_id = bd.id
            WHERE pb.player_id = p.id
        ), 0)
    )::BIGINT
    INTO v_networth
    FROM players p
    WHERE p.id = player_id_input;
    
    IF v_networth IS NULL THEN
        RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;
    
    -- Calculate rank by counting players with higher net worth (including their businesses)
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) + 1 FROM players p2 
         WHERE (
            COALESCE(p2.cash, 0) + 
            COALESCE(p2.banked_cash, 0) + 
            COALESCE((
                SELECT SUM(bd.base_purchase_cost * pb.level)
                FROM player_businesses pb
                JOIN business_definitions bd ON pb.business_id = bd.id
                WHERE pb.player_id = p2.id
            ), 0)
         ) > v_networth)::BIGINT as rank,
        v_networth as networth,
        (SELECT COUNT(*) FROM players)::BIGINT as total_players;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_player_rank(UUID) SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_player_rank(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_rank(UUID) TO anon;

COMMENT ON FUNCTION get_player_rank IS 'Get player net worth rank (includes cash + bank + business value).';
