-- =====================================================
-- OFFLINE EARNINGS SUMMARY
-- =====================================================

-- Track last login time for calculating offline duration
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();

-- RPC to calculate offline earnings (called on login)
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
    -- This estimates based on business holdings and time
    SELECT COALESCE(SUM(
        CASE 
            WHEN pb.last_collected_at IS NOT NULL AND pb.last_collected_at < NOW() - INTERVAL '1 hour'
            THEN bd.base_income * pb.level * 
                LEAST(24, EXTRACT(EPOCH FROM (NOW() - GREATEST(pb.last_collected_at, last_login))) / 3600)
            ELSE 0
        END
    ), 0)::BIGINT INTO business_income
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.player_id = target_player_id;
    
    -- Count attacks received since last login
    SELECT 
        COUNT(*),
        COALESCE(SUM(cash_transferred), 0)::BIGINT
    INTO attacks_received, cash_lost
    FROM attack_log
    WHERE defender_id = target_player_id
    AND attacker_won = true
    AND attacked_at > last_login;
    
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
