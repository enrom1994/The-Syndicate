-- =====================================================
-- FIX FAMILY LEADERBOARD RESPECT CALCULATION
-- =====================================================
-- Calculate family respect as SUM of all member respect
-- instead of using the stored total_respect column
-- =====================================================

SET search_path = public;

-- Drop existing function to allow changes
DROP FUNCTION IF EXISTS public.get_leaderboard(TEXT, INTEGER) CASCADE;

-- Recreate leaderboard function with CALCULATED family respect
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
            ROW_NUMBER() OVER (ORDER BY (p.cash + p.banked_cash) DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            (p.cash + p.banked_cash)::BIGINT as value,
            COALESCE(p.starter_pack_claimed, false) as has_made_man
        FROM public.players p
        ORDER BY value DESC
        LIMIT limit_count;
        
    ELSIF leaderboard_type = 'respect' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.respect DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            p.respect::BIGINT as value,
            COALESCE(p.starter_pack_claimed, false) as has_made_man
        FROM public.players p
        ORDER BY p.respect DESC
        LIMIT limit_count;
        
    ELSIF leaderboard_type = 'wins' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.total_attacks_won DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            p.total_attacks_won::BIGINT as value,
            COALESCE(p.starter_pack_claimed, false) as has_made_man
        FROM public.players p
        ORDER BY p.total_attacks_won DESC
        LIMIT limit_count;
        
    ELSIF leaderboard_type = 'families' THEN
        -- FIX: Calculate family respect as SUM of member respect
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY total_member_respect DESC) as rank,
            f.id as player_id,
            f.name as username,
            total_member_respect as value,
            false as has_made_man
        FROM public.families f
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(p.respect), 0)::BIGINT as total_member_respect
            FROM family_members fm
            JOIN players p ON p.id = fm.player_id
            WHERE fm.family_id = f.id
        ) member_stats ON true
        WHERE EXISTS (SELECT 1 FROM family_members fm WHERE fm.family_id = f.id)
        ORDER BY total_member_respect DESC
        LIMIT limit_count;
        
    ELSE
        -- Default to networth
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY (p.cash + p.banked_cash) DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            (p.cash + p.banked_cash)::BIGINT as value,
            COALESCE(p.starter_pack_claimed, false) as has_made_man
        FROM public.players p
        ORDER BY value DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_leaderboard(TEXT, INTEGER) SET search_path = public;

COMMENT ON FUNCTION get_leaderboard IS 'Leaderboard: networth, respect, wins, families. Family respect is SUM of member respect.';
