-- =====================================================
-- MADE MAN BADGE VISIBILITY
-- =====================================================
-- Adds has_made_man flag to PvP target queries
-- UI-only enhancement, no gameplay impact, prestige only
--
-- The Made Man badge is granted to players who purchased
-- the Starter Pack. This migration surfaces that badge
-- in PvP contexts for social prestige.

SET search_path = public;

-- =====================================================
-- 1. CREATE GET_PVP_TARGETS RPC
-- =====================================================
-- Replaces the direct query in OpsPage with an RPC
-- that includes Made Man status

DROP FUNCTION IF EXISTS get_pvp_targets(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_pvp_targets(
    player_id_input UUID,
    target_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    cash BIGINT,
    defense INTEGER,
    attack INTEGER,
    has_made_man BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.cash,
        COALESCE(
            (SELECT SUM(cd.defense_bonus * pc.quantity)::INTEGER 
             FROM player_crew pc 
             JOIN crew_definitions cd ON cd.id = pc.crew_id 
             WHERE pc.player_id = p.id), 0
        ) + COALESCE(
            (SELECT SUM(id.defense_bonus * pi.quantity)::INTEGER 
             FROM player_inventory pi 
             JOIN item_definitions id ON pi.item_id = id.id 
             WHERE pi.player_id = p.id), 0
        ) AS defense,
        COALESCE(
            (SELECT SUM(cd.attack_bonus * pc.quantity)::INTEGER 
             FROM player_crew pc 
             JOIN crew_definitions cd ON cd.id = pc.crew_id 
             WHERE pc.player_id = p.id), 0
        ) + COALESCE(
            (SELECT SUM(id.attack_bonus * pi.quantity)::INTEGER 
             FROM player_inventory pi 
             JOIN item_definitions id ON pi.item_id = id.id 
             WHERE pi.player_id = p.id), 0
        ) AS attack,
        -- Made Man check (prestige only)
        EXISTS (
            SELECT 1 FROM player_achievements pa
            JOIN achievement_definitions ad ON ad.id = pa.achievement_id
            WHERE pa.player_id = p.id 
              AND ad.name = 'Made Man' 
              AND pa.is_unlocked = true
        ) AS has_made_man
    FROM public.players p
    WHERE p.id != player_id_input
      AND p.cash > 1000
    ORDER BY random()
    LIMIT target_limit;
END;
$$;

ALTER FUNCTION public.get_pvp_targets(UUID, INTEGER) SET search_path = public;

COMMENT ON FUNCTION get_pvp_targets IS 'Returns PvP targets with Made Man badge status for prestige display';

-- =====================================================
-- 2. UPDATE GET_REVENGE_TARGETS RPC
-- =====================================================
-- Add has_made_man flag to revenge targets

DROP FUNCTION IF EXISTS get_revenge_targets(UUID);

CREATE OR REPLACE FUNCTION get_revenge_targets(player_id_input UUID)
RETURNS TABLE (
    attack_log_id UUID,
    attacker_id UUID,
    attacker_name TEXT,
    attacked_at TIMESTAMPTZ,
    hours_remaining INTEGER,
    attacker_has_shield BOOLEAN,
    attacker_has_npp BOOLEAN,
    has_made_man BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id AS attack_log_id,
        al.attacker_id,
        p.username AS attacker_name,
        al.created_at AS attacked_at,
        (24 - EXTRACT(HOUR FROM (NOW() - al.created_at)))::INTEGER AS hours_remaining,
        EXISTS (
            SELECT 1 FROM player_boosters pb 
            WHERE pb.player_id = al.attacker_id 
            AND pb.booster_type = 'shield' 
            AND pb.expires_at > NOW()
        ) AS attacker_has_shield,
        (p.newbie_shield_expires_at > NOW()) AS attacker_has_npp,
        -- Made Man check (prestige only)
        EXISTS (
            SELECT 1 FROM player_achievements pa
            JOIN achievement_definitions ad ON ad.id = pa.achievement_id
            WHERE pa.player_id = al.attacker_id 
              AND ad.name = 'Made Man' 
              AND pa.is_unlocked = true
        ) AS has_made_man
    FROM public.attack_log al
    JOIN public.players p ON p.id = al.attacker_id
    WHERE al.defender_id = player_id_input
      AND al.attacker_won = true
      AND al.revenge_taken = false
      AND al.created_at > NOW() - INTERVAL '24 hours'
    ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_revenge_targets(UUID) SET search_path = public;

COMMENT ON FUNCTION get_revenge_targets IS 'Returns eligible revenge targets with Made Man badge status for prestige display';
