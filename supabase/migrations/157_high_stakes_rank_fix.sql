-- =====================================================
-- HOTFIX: UPDATE get_high_stakes_jobs TO USE RANK
-- =====================================================
-- The function was still using level-based requirements
-- This updates it to use the new rank-based system
-- =====================================================

SET search_path = public;

DROP FUNCTION IF EXISTS get_high_stakes_jobs(uuid);

CREATE OR REPLACE FUNCTION get_high_stakes_jobs(viewer_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    entry_cost_diamonds INTEGER,
    energy_cost INTEGER,
    cash_reward BIGINT,
    xp_reward INTEGER,
    respect_reward INTEGER,
    success_rate INTEGER,
    required_level INTEGER,
    required_rank TEXT,
    cooldown_minutes INTEGER,
    is_available BOOLEAN,
    cooldown_remaining_seconds INTEGER,
    player_meets_level BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_respect INTEGER;
BEGIN
    -- Get viewer's respect for rank check
    SELECT COALESCE(p.respect, 0) INTO player_respect
    FROM players p WHERE p.id = viewer_id;
    
    RETURN QUERY
    SELECT 
        hsj.id,
        hsj.name,
        hsj.description,
        hsj.entry_cost_diamonds,
        hsj.energy_cost,
        ROUND(hsj.base_cash_reward * hsj.cash_multiplier)::BIGINT as cash_reward,
        ROUND(hsj.base_xp_reward * hsj.xp_multiplier)::INTEGER as xp_reward,
        ROUND(hsj.base_xp_reward * hsj.xp_multiplier)::INTEGER as respect_reward,
        hsj.success_rate,
        hsj.required_level,
        COALESCE(hsj.required_rank, 'Street Thug')::TEXT as required_rank,
        hsj.cooldown_minutes,
        (hsc.last_attempted_at IS NULL OR 
         hsc.last_attempted_at + (hsj.cooldown_minutes || ' minutes')::INTERVAL <= NOW()) as is_available,
        GREATEST(0, EXTRACT(EPOCH FROM (
            COALESCE(hsc.last_attempted_at, NOW() - INTERVAL '1 day') + 
            (hsj.cooldown_minutes || ' minutes')::INTERVAL - NOW()
        )))::INTEGER as cooldown_remaining_seconds,
        -- Use respect-based rank check instead of level
        (player_respect >= get_respect_for_rank(COALESCE(hsj.required_rank, 'Street Thug'))) as player_meets_level
    FROM high_stakes_jobs hsj
    LEFT JOIN high_stakes_cooldowns hsc ON hsj.id = hsc.job_id AND hsc.player_id = viewer_id
    WHERE hsj.is_active = true
    ORDER BY hsj.required_level ASC;
END;
$$;

ALTER FUNCTION public.get_high_stakes_jobs(UUID) SET search_path = public;

COMMENT ON FUNCTION get_high_stakes_jobs IS 'Returns high stakes jobs with rank-based requirements';
