-- =====================================================
-- TELEGRAM DAILY REMINDER SYSTEM
-- =====================================================

-- 1. Add tracking column to players
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS last_telegram_push_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.players.last_telegram_push_at IS 'Timestamp of the last daily reminder sent via Telegram to prevent spam.';

-- 2. Create the targeting function
-- This identifies players who:
-- - Have a telegram_id
-- - Can claim their daily reward (>= 20 hours since last claim)
-- - Haven''t been messaged in >= 20 hours
-- - Haven''t been messaged at all today (calendar day failsafe)
CREATE OR REPLACE FUNCTION get_players_for_daily_reminder()
RETURNS TABLE (
    player_id UUID,
    telegram_id BIGINT,
    username TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        players.telegram_id,
        players.username
    FROM public.players
    WHERE 
        -- Must have a Telegram ID
        players.telegram_id IS NOT NULL
        -- Daily reward must be available (logic from 053_fix_daily_rewards.sql)
        AND (last_daily_claim IS NULL OR NOW() - last_daily_claim >= INTERVAL '20 hours')
        -- Cooling period for notifications (20 hours)
        AND (last_telegram_push_at IS NULL OR NOW() - last_telegram_push_at >= INTERVAL '20 hours')
        -- Calendar day failsafe (Once per day max)
        AND (last_telegram_push_at IS NULL OR last_telegram_push_at::date < CURRENT_DATE)
    LIMIT 100; -- Batch size to avoid timeouts in Edge Function
END;
$$;

-- 3. Schedule the cron job
-- Run every 6 hours (00:00, 06:00, 12:00, 18:00)
SELECT cron.schedule(
    'telegram-daily-reminder',
    '0 */6 * * *',
    $$SELECT http_post(
        'https://giwolutowfkvkcxlcwus.supabase.co/functions/v1/telegram-daily-reminder',
        '{"Content-Type": "application/json"}',
        '{}'
    )$$
);

-- Note: http_post requires pg_net extension and appropriate permissions.
-- If net.http_post is not available, the edge function can also be triggered 
-- by a simple SQL task that hits the endpoint, but usually we recommend 
-- triggering the edge function directly or using a helper function.
