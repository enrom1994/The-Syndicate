-- =====================================================
-- AUTO-COLLECT CRON JOB (pg_cron)
-- =====================================================
-- Requires pg_cron extension enabled on 'extensions' schema

-- Create a wrapper function that collects for ALL auto-collect players
CREATE OR REPLACE FUNCTION run_auto_collect_for_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    total_players INTEGER := 0;
    total_collected BIGINT := 0;
    player_collection JSONB;
BEGIN
    -- Loop through all players with auto-collect enabled
    FOR player_record IN 
        SELECT id FROM players WHERE auto_collect_businesses = true
    LOOP
        -- Call the collection function for each player
        SELECT auto_collect_all_businesses(player_record.id) INTO player_collection;
        
        IF (player_collection->>'success')::boolean THEN
            total_collected := total_collected + COALESCE((player_collection->>'collected')::bigint, 0);
            total_players := total_players + 1;
        END IF;
    END LOOP;
    
    -- Log the run (optional - for debugging)
    RAISE NOTICE 'Auto-collect completed: % players, $% total', total_players, total_collected;
END;
$$;

-- Schedule the cron job to run every hour
-- Format: minute hour day month day-of-week
SELECT cron.schedule(
    'auto-collect-businesses',  -- Job name
    '0 * * * *',                -- Every hour at minute 0
    $$SELECT run_auto_collect_for_all()$$
);

-- To view scheduled jobs: SELECT * FROM cron.job;
-- To unschedule: SELECT cron.unschedule('auto-collect-businesses');
