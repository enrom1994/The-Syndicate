-- =====================================================
-- FIX: Drop existing get_active_boosters function first
-- =====================================================
-- The previous migration failed because the function already existed with different return type

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_active_boosters(UUID);

-- Now recreate it with correct return type
CREATE OR REPLACE FUNCTION get_active_boosters(player_id_input UUID)
RETURNS TABLE (
    booster_type TEXT,
    expires_at TIMESTAMPTZ,
    time_remaining_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pb.booster_type,
        pb.expires_at,
        GREATEST(0, EXTRACT(EPOCH FROM (pb.expires_at - NOW())) / 60)::INTEGER as time_remaining_minutes
    FROM player_boosters pb
    WHERE pb.player_id = player_id_input
    AND pb.expires_at > NOW()
    ORDER BY pb.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure comment is added
COMMENT ON FUNCTION get_active_boosters IS 'Returns all active boosters for a player with time remaining';
