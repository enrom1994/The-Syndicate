-- =====================================================
-- CREW UPKEEP SYSTEM
-- =====================================================
-- Automatic hourly deduction based on hired crew upkeep_per_hour
-- If player can't afford, crew leaves and weapons are lost

-- 1. Add last_upkeep column to players
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS last_upkeep_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create upkeep processing function
CREATE OR REPLACE FUNCTION process_crew_upkeep()
RETURNS TABLE (
    processed_players INTEGER,
    total_upkeep_collected BIGINT,
    crew_left_count INTEGER
) AS $$
DECLARE
    player_rec RECORD;
    total_upkeep BIGINT;
    players_processed INTEGER := 0;
    total_collected BIGINT := 0;
    crew_left INTEGER := 0;
    random_crew RECORD;
    weapon_to_remove RECORD;
BEGIN
    FOR player_rec IN 
        SELECT p.id, p.cash,
               COALESCE(SUM(cd.upkeep_per_hour * pc.quantity), 0)::BIGINT as hourly_upkeep
        FROM players p
        LEFT JOIN player_crew pc ON pc.player_id = p.id
        LEFT JOIN crew_definitions cd ON cd.id = pc.crew_id
        GROUP BY p.id, p.cash
        HAVING COALESCE(SUM(cd.upkeep_per_hour * pc.quantity), 0) > 0
    LOOP
        total_upkeep := player_rec.hourly_upkeep;
        players_processed := players_processed + 1;
        
        IF player_rec.cash >= total_upkeep THEN
            -- Deduct upkeep
            UPDATE players 
            SET cash = cash - total_upkeep,
                last_upkeep_at = NOW()
            WHERE id = player_rec.id;
            
            total_collected := total_collected + total_upkeep;
            
            -- Log transaction
            INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
            VALUES (player_rec.id, 'crew_upkeep', 'cash', -total_upkeep, 
                    'Hourly crew upkeep');
        ELSE
            -- Can't afford - 1 random crew member leaves with their assigned weapon
            SELECT pc.id as crew_record_id, pc.crew_id, cd.name as crew_name
            INTO random_crew
            FROM player_crew pc
            JOIN crew_definitions cd ON cd.id = pc.crew_id
            WHERE pc.player_id = player_rec.id AND pc.quantity > 0
            ORDER BY random() LIMIT 1;
            
            IF random_crew IS NOT NULL THEN
                -- Reduce crew quantity
                UPDATE player_crew 
                SET quantity = quantity - 1
                WHERE id = random_crew.crew_record_id;
                
                -- Remove 1 assigned weapon (if any) - weapon is LOST
                SELECT pi.id INTO weapon_to_remove
                FROM player_inventory pi
                JOIN item_definitions id ON pi.item_id = id.id
                WHERE pi.player_id = player_rec.id 
                  AND id.category IN ('weapon', 'equipment')
                  AND pi.assigned_quantity > 0
                ORDER BY random() LIMIT 1;
                
                IF weapon_to_remove IS NOT NULL THEN
                    UPDATE player_inventory
                    SET quantity = GREATEST(0, quantity - 1),
                        assigned_quantity = GREATEST(0, assigned_quantity - 1)
                    WHERE id = weapon_to_remove.id;
                END IF;
                
                crew_left := crew_left + 1;
                
                -- Notify player
                INSERT INTO notifications (player_id, type, title, description)
                VALUES (player_rec.id, 'system', 'Crew Left!', 
                        random_crew.crew_name || ' left because you couldn''t afford upkeep. Their weapon was lost.');
                        
                -- Update last_upkeep time even though we couldn't collect
                UPDATE players SET last_upkeep_at = NOW() WHERE id = player_rec.id;
            END IF;
        END IF;
    END LOOP;
    
    processed_players := players_processed;
    total_upkeep_collected := total_collected;
    crew_left_count := crew_left;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Create RPC to get player's current upkeep cost
CREATE OR REPLACE FUNCTION get_player_upkeep(player_id_input UUID)
RETURNS TABLE (
    total_hourly_upkeep BIGINT,
    can_afford BOOLEAN,
    hours_until_broke NUMERIC
) AS $$
DECLARE
    player_cash BIGINT;
    upkeep BIGINT;
BEGIN
    SELECT cash INTO player_cash FROM players WHERE id = player_id_input;
    
    SELECT COALESCE(SUM(cd.upkeep_per_hour * pc.quantity), 0)::BIGINT
    INTO upkeep
    FROM player_crew pc
    JOIN crew_definitions cd ON cd.id = pc.crew_id
    WHERE pc.player_id = player_id_input;
    
    total_hourly_upkeep := upkeep;
    can_afford := player_cash >= upkeep;
    
    IF upkeep > 0 THEN
        hours_until_broke := ROUND((player_cash::NUMERIC / upkeep::NUMERIC), 1);
    ELSE
        hours_until_broke := NULL;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Schedule CRON job (runs every hour at minute 0)
-- Note: pg_cron extension must be enabled in Supabase dashboard
-- This creates the scheduled job if pg_cron is available
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove old job if exists
        PERFORM cron.unschedule('crew-upkeep-hourly');
        -- Schedule new job
        PERFORM cron.schedule('crew-upkeep-hourly', '0 * * * *', 'SELECT process_crew_upkeep()');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- pg_cron not available, skip scheduling
        RAISE NOTICE 'pg_cron not available. Crew upkeep must be triggered manually or via Edge Function.';
END $$;
