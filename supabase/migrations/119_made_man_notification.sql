-- =====================================================
-- MADE MAN NOTIFICATION ENHANCEMENT
-- =====================================================
-- Adds Made Man prestige copy to PvP attack notifications
-- UI-only enhancement, no gameplay impact, prestige only

SET search_path = public;

-- =====================================================
-- 1. HELPER FUNCTION: CHECK IF PLAYER HAS MADE MAN
-- =====================================================

CREATE OR REPLACE FUNCTION has_made_man_badge(player_id_input UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM player_achievements pa
        JOIN achievement_definitions ad ON ad.id = pa.achievement_id
        WHERE pa.player_id = player_id_input 
          AND ad.name = 'Made Man' 
          AND pa.is_unlocked = true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

ALTER FUNCTION public.has_made_man_badge(UUID) SET search_path = public;

COMMENT ON FUNCTION has_made_man_badge IS 'Returns true if player has the Made Man achievement (Starter Pack badge)';

-- =====================================================
-- 2. ADD MADE MAN TO get_pvp_targets RETURN
-- =====================================================
-- This was already done in 118, but ensure it exists

-- =====================================================
-- 3. ADD MADE MAN TO get_revenge_targets RETURN
-- =====================================================
-- This was already done in 118, but ensure it exists
