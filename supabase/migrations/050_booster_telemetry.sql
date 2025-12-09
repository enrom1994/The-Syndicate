-- =====================================================
-- BOOSTER TELEMETRY & ECONOMY IMPROVEMENTS
-- =====================================================
-- P1 Fixes:
-- 1. Add booster usage telemetry table
-- 2. Track booster activations vs actual usage

-- =====================================================
-- 1. BOOSTER USAGE TELEMETRY TABLE
-- =====================================================
-- Tracks when boosters are purchased/activated and when they're used

CREATE TABLE IF NOT EXISTS public.booster_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    booster_type TEXT NOT NULL,
    
    -- Lifecycle tracking
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,          -- How many times the buff was applied
    last_used_at TIMESTAMPTZ,              -- Last time it was applied in combat
    
    -- Source of activation
    source TEXT NOT NULL DEFAULT 'purchase', -- 'purchase', 'reward', 'gift', 'admin'
    diamond_cost INTEGER DEFAULT 0,         -- Cost paid (if purchased)
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booster_telemetry_player ON public.booster_telemetry(player_id);
CREATE INDEX IF NOT EXISTS idx_booster_telemetry_type ON public.booster_telemetry(booster_type);
CREATE INDEX IF NOT EXISTS idx_booster_telemetry_active ON public.booster_telemetry(expires_at) WHERE expires_at > NOW();

-- RLS
ALTER TABLE public.booster_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own telemetry"
    ON public.booster_telemetry FOR SELECT
    USING (player_id = auth.uid());


-- =====================================================
-- 2. UPDATE activate_booster TO LOG TELEMETRY
-- =====================================================
CREATE OR REPLACE FUNCTION activate_booster(
    player_id_input UUID,
    booster_type_input TEXT,
    duration_hours_input INTEGER DEFAULT 24
)
RETURNS JSONB AS $$
DECLARE
    existing_booster RECORD;
    new_expires TIMESTAMPTZ;
    diamond_cost INTEGER := 0;
BEGIN
    -- Determine cost based on type (for telemetry)
    IF booster_type_input = '2x_income' THEN
        diamond_cost := 50;
    ELSIF booster_type_input = '2x_attack' THEN
        diamond_cost := 30;
    ELSIF booster_type_input = 'shield' THEN
        diamond_cost := 100;
    ELSIF booster_type_input = 'vip_pass' THEN
        diamond_cost := 200;
    END IF;

    -- Check for existing active booster of same type
    SELECT * INTO existing_booster
    FROM player_boosters
    WHERE player_id = player_id_input
      AND booster_type = booster_type_input
      AND expires_at > NOW();

    IF existing_booster IS NOT NULL THEN
        -- Extend existing booster
        new_expires := existing_booster.expires_at + (duration_hours_input || ' hours')::INTERVAL;
        
        UPDATE player_boosters
        SET expires_at = new_expires
        WHERE id = existing_booster.id;

        -- Log extension in telemetry
        INSERT INTO booster_telemetry (player_id, booster_type, activated_at, expires_at, source, diamond_cost)
        VALUES (player_id_input, booster_type_input, NOW(), new_expires, 'purchase', diamond_cost);

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Booster extended!',
            'expires_at', new_expires,
            'extended', true
        );
    ELSE
        -- Create new booster
        new_expires := NOW() + (duration_hours_input || ' hours')::INTERVAL;
        
        INSERT INTO player_boosters (player_id, booster_type, activated_at, expires_at)
        VALUES (player_id_input, booster_type_input, NOW(), new_expires);

        -- Log activation in telemetry
        INSERT INTO booster_telemetry (player_id, booster_type, activated_at, expires_at, source, diamond_cost)
        VALUES (player_id_input, booster_type_input, NOW(), new_expires, 'purchase', diamond_cost);

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Booster activated!',
            'expires_at', new_expires,
            'extended', false
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 3. LOG BOOSTER USAGE IN PVP
-- =====================================================
-- Function to record when a booster is actually used
CREATE OR REPLACE FUNCTION log_booster_usage(
    player_id_input UUID,
    booster_type_input TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Update the most recent active telemetry record for this booster
    UPDATE booster_telemetry
    SET times_used = times_used + 1,
        last_used_at = NOW()
    WHERE id = (
        SELECT id FROM booster_telemetry
        WHERE player_id = player_id_input
          AND booster_type = booster_type_input
          AND expires_at > NOW()
        ORDER BY activated_at DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 4. ANALYTICS VIEWS
-- =====================================================

-- View: Booster purchase vs usage stats
CREATE OR REPLACE VIEW booster_analytics AS
SELECT 
    booster_type,
    COUNT(*) as total_activations,
    SUM(diamond_cost) as total_diamonds_spent,
    AVG(times_used) as avg_uses_per_activation,
    COUNT(CASE WHEN times_used = 0 THEN 1 END) as unused_boosters,
    ROUND(COUNT(CASE WHEN times_used = 0 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as unused_percentage
FROM booster_telemetry
WHERE source = 'purchase'
GROUP BY booster_type;

-- View: Daily booster revenue
CREATE OR REPLACE VIEW booster_daily_revenue AS
SELECT 
    DATE(activated_at) as date,
    booster_type,
    COUNT(*) as activations,
    SUM(diamond_cost) as diamonds_spent
FROM booster_telemetry
WHERE source = 'purchase'
GROUP BY DATE(activated_at), booster_type
ORDER BY date DESC;


-- =====================================================
-- 5. GET BOOSTER TELEMETRY RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_booster_telemetry_summary()
RETURNS TABLE (
    booster_type TEXT,
    total_activations BIGINT,
    total_diamonds_spent BIGINT,
    avg_uses_per_activation NUMERIC,
    unused_count BIGINT,
    unused_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.booster_type,
        COUNT(*)::BIGINT as total_activations,
        COALESCE(SUM(bt.diamond_cost), 0)::BIGINT as total_diamonds_spent,
        ROUND(AVG(bt.times_used), 2) as avg_uses_per_activation,
        COUNT(CASE WHEN bt.times_used = 0 THEN 1 END)::BIGINT as unused_count,
        ROUND(COUNT(CASE WHEN bt.times_used = 0 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC * 100, 2) as unused_percentage
    FROM booster_telemetry bt
    WHERE bt.source = 'purchase'
    GROUP BY bt.booster_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Add comments
COMMENT ON TABLE booster_telemetry IS 'Tracks booster activations and usage for analytics';
COMMENT ON FUNCTION log_booster_usage IS 'Records when a booster is actually applied in combat';
COMMENT ON FUNCTION get_booster_telemetry_summary IS 'Returns aggregated booster usage stats for admin dashboard';
