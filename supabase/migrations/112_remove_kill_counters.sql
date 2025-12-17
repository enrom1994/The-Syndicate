-- =====================================================
-- ADD WINS LEADERBOARD TYPE
-- =====================================================
-- Adds 'wins' leaderboard type using total_attacks_won
-- Replaces 'kills' which tracked crew deaths (operational losses only)

SET search_path = public;

-- Drop ALL existing function signatures to allow return type change
DROP FUNCTION IF EXISTS public.get_leaderboard(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_leaderboard(TEXT, INTEGER) CASCADE;

-- Recreate leaderboard function with 'wins' type
CREATE OR REPLACE FUNCTION get_leaderboard(
    leaderboard_type TEXT,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    rank BIGINT,
    player_id UUID,
    username TEXT,
    value BIGINT
) AS $$
BEGIN
    IF leaderboard_type = 'networth' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY (p.cash + p.banked_cash) DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            (p.cash + p.banked_cash)::BIGINT as value
        FROM public.players p
        ORDER BY value DESC
        LIMIT limit_count;
    ELSIF leaderboard_type = 'respect' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.respect DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            p.respect::BIGINT as value
        FROM public.players p
        ORDER BY p.respect DESC
        LIMIT limit_count;
    ELSIF leaderboard_type = 'wins' THEN
        -- NEW: Wins leaderboard (total_attacks_won)
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.total_attacks_won DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            p.total_attacks_won::BIGINT as value
        FROM public.players p
        ORDER BY p.total_attacks_won DESC
        LIMIT limit_count;
    ELSIF leaderboard_type = 'kills' THEN
        -- DEPRECATED: Redirect to wins for backward compatibility
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.total_attacks_won DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            p.total_attacks_won::BIGINT as value
        FROM public.players p
        ORDER BY p.total_attacks_won DESC
        LIMIT limit_count;
    ELSE
        -- Default to networth
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY (p.cash + p.banked_cash) DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, p.first_name, 'Player') as username,
            (p.cash + p.banked_cash)::BIGINT as value
        FROM public.players p
        ORDER BY value DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_leaderboard(TEXT, INTEGER) SET search_path = public;

COMMENT ON FUNCTION get_leaderboard IS 'Leaderboard: networth, respect, wins. Kills deprecated and redirects to wins.';
