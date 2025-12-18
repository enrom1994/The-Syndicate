-- =====================================================
-- FAMILY LEADERBOARD & MADE MAN BADGE
-- =====================================================
-- 1. Add 'families' leaderboard type
-- 2. Add 'has_made_man' flag to player leaderboards
-- =====================================================

SET search_path = public;

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS public.get_leaderboard(TEXT, INTEGER) CASCADE;

-- Recreate leaderboard function with families type and has_made_man
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
        -- NEW: Family leaderboard by total respect
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY f.total_respect DESC) as rank,
            f.id as player_id,  -- Actually family_id but using same column name
            f.name as username,  -- Family name
            f.total_respect::BIGINT as value,
            false as has_made_man  -- N/A for families
        FROM public.families f
        WHERE f.is_recruiting = true OR EXISTS (
            SELECT 1 FROM family_members fm WHERE fm.family_id = f.id
        )
        ORDER BY f.total_respect DESC
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

COMMENT ON FUNCTION get_leaderboard IS 'Leaderboard: networth, respect, wins, families. Includes has_made_man badge flag.';


-- =====================================================
-- FUNCTION: Get family member details with Made Man
-- =====================================================
-- For FamilyPage to show Made Man badge on members

CREATE OR REPLACE FUNCTION get_family_members_with_badges(
    family_id_input UUID
)
RETURNS TABLE (
    player_id UUID,
    username TEXT,
    first_name TEXT,
    role TEXT,
    contribution BIGINT,
    level INTEGER,
    respect BIGINT,
    joined_at TIMESTAMPTZ,
    has_made_man BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fm.player_id,
        p.username,
        p.first_name,
        fm.role,
        COALESCE(fm.contribution, 0)::BIGINT,
        p.level,
        p.respect::BIGINT,
        fm.joined_at,
        COALESCE(p.starter_pack_claimed, false) as has_made_man
    FROM family_members fm
    JOIN players p ON p.id = fm.player_id
    WHERE fm.family_id = family_id_input
    ORDER BY 
        CASE fm.role 
            WHEN 'Don' THEN 1
            WHEN 'Consigliere' THEN 2
            WHEN 'Advisor' THEN 3
            WHEN 'Lieutenant' THEN 4
            WHEN 'Associate' THEN 5
            WHEN 'Recruit' THEN 6
            ELSE 7
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_family_members_with_badges(UUID) SET search_path = public;
