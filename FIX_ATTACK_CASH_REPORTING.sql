-- =====================================================
-- FIX: Offline Summary Not Showing PvP Cash Loss
-- Run this in Supabase SQL Editor
-- =====================================================
-- Issue: Offline summary shows attack happened but "$0 lost"
-- Root Cause: get_offline_summary uses 'cash_transferred' column
--             but perform_pvp_attack logs to 'cash_stolen' column


-- =====================================================
-- STEP 1: Update get_offline_summary to use BOTH columns
-- =====================================================

CREATE OR REPLACE FUNCTION get_offline_summary(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    hours_away NUMERIC;
    business_income BIGINT := 0;
    attacks_received INTEGER := 0;
    cash_lost BIGINT := 0;
    last_login TIMESTAMPTZ;
BEGIN
    -- Get player info
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    last_login := COALESCE(player_record.last_login_at, player_record.created_at);
    hours_away := EXTRACT(EPOCH FROM (NOW() - last_login)) / 3600;
    
    -- Only show summary if away for more than 1 hour
    IF hours_away < 1 THEN
        -- Update last login and return empty
        UPDATE players SET last_login_at = NOW() WHERE id = target_player_id;
        RETURN jsonb_build_object(
            'success', true,
            'show_summary', false,
            'hours_away', ROUND(hours_away, 1)
        );
    END IF;
    
    -- Calculate business income earned while away
    SELECT COALESCE(SUM(
        CASE 
            WHEN pb.last_collected IS NOT NULL AND pb.last_collected < NOW() - INTERVAL '1 hour'
            THEN bd.base_income_per_hour * pb.level * 
                LEAST(24, EXTRACT(EPOCH FROM (NOW() - GREATEST(pb.last_collected, last_login))) / 3600)
            ELSE 0
        END
    ), 0)::BIGINT INTO business_income
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.player_id = target_player_id;
    
    -- Count attacks received since last login
    -- FIX: Use COALESCE to check BOTH cash_transferred AND cash_stolen columns
    SELECT 
        COUNT(*),
        COALESCE(SUM(COALESCE(cash_stolen, 0) + COALESCE(cash_transferred, 0)), 0)::BIGINT
    INTO attacks_received, cash_lost
    FROM attack_log
    WHERE defender_id = target_player_id
    AND attacker_won = true
    AND created_at > last_login;
    
    -- Update last login time
    UPDATE players SET last_login_at = NOW() WHERE id = target_player_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'show_summary', true,
        'hours_away', ROUND(hours_away, 1),
        'business_income', business_income,
        'attacks_received', attacks_received,
        'cash_lost', cash_lost,
        'net_earnings', business_income - cash_lost
    );
END;
$$;


-- =====================================================
-- STEP 2: Verify cash was actually deducted from defender
-- Run this to check the attack log and verify
-- =====================================================

-- Check recent attacks with cash stolen
SELECT 
    al.created_at,
    attacker.username as attacker,
    defender.username as defender,
    al.attacker_won,
    al.attack_type,
    al.cash_transferred,
    al.cash_stolen,
    COALESCE(al.cash_stolen, 0) + COALESCE(al.cash_transferred, 0) as total_stolen
FROM attack_log al
JOIN players attacker ON al.attacker_id = attacker.id
JOIN players defender ON al.defender_id = defender.id
ORDER BY al.created_at DESC
LIMIT 10;
