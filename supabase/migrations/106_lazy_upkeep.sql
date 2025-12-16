-- =====================================================
-- LAZY UPKEEP ENFORCEMENT
-- =====================================================
-- Guarantees upkeep is processed on player login,
-- not just relying on pg_cron
-- This is a CRITICAL economy safety mechanism

-- 1. Create function to calculate and apply pending upkeep
CREATE OR REPLACE FUNCTION apply_pending_upkeep(player_id_input UUID)
RETURNS JSONB AS $$
DECLARE
    player_rec RECORD;
    hourly_upkeep BIGINT;
    hours_missed INTEGER;
    total_owed BIGINT;
    total_deducted BIGINT := 0;
    crew_lost INTEGER := 0;
    random_crew RECORD;
    weapon_to_remove RECORD;
    i INTEGER;
BEGIN
    -- Get player's last upkeep time, current cash, and calculate hourly upkeep
    SELECT 
        p.id, 
        p.cash, 
        p.last_upkeep_at,
        COALESCE(SUM(cd.upkeep_per_hour * pc.quantity), 0)::BIGINT as hourly_upkeep
    INTO player_rec
    FROM players p
    LEFT JOIN player_crew pc ON pc.player_id = p.id
    LEFT JOIN crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = player_id_input
    GROUP BY p.id, p.cash, p.last_upkeep_at;

    IF player_rec IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    hourly_upkeep := player_rec.hourly_upkeep;
    
    -- No crew = no upkeep needed
    IF hourly_upkeep = 0 THEN
        RETURN jsonb_build_object(
            'success', true, 
            'hours_processed', 0,
            'total_deducted', 0,
            'crew_lost', 0,
            'message', 'No crew upkeep required'
        );
    END IF;

    -- Calculate hours since last upkeep
    -- Cap at 24 hours to prevent punishing long-absent players too harshly
    hours_missed := LEAST(24, FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(player_rec.last_upkeep_at, NOW()))) / 3600)::INTEGER);
    
    -- Less than 1 hour = no upkeep due yet
    IF hours_missed <= 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'hours_processed', 0,
            'total_deducted', 0,
            'crew_lost', 0,
            'message', 'Upkeep not due yet'
        );
    END IF;

    total_owed := hourly_upkeep * hours_missed;

    -- Can afford full upkeep
    IF player_rec.cash >= total_owed THEN
        -- Deduct full amount
        UPDATE players 
        SET cash = cash - total_owed,
            last_upkeep_at = NOW()
        WHERE id = player_id_input;
        
        total_deducted := total_owed;
        
        -- Log transaction
        INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'crew_upkeep', 'cash', -total_owed, 
                'Crew upkeep: ' || hours_missed || ' hour(s)');
                
        -- Create notification for Activity Page
        INSERT INTO notifications (player_id, type, title, description)
        VALUES (player_id_input, 'system', '💰 Crew Upkeep Paid', 
                '$' || total_owed || ' paid for ' || hours_missed || ' hour(s) of crew upkeep.');
                
    ELSE
        -- Can't afford full upkeep - pay what they can, crew starts leaving
        total_deducted := player_rec.cash;
        
        -- Calculate how many hours of upkeep they could afford
        -- Remaining unpaid hours cause crew loss
        crew_lost := GREATEST(0, hours_missed - COALESCE(FLOOR(player_rec.cash::NUMERIC / hourly_upkeep::NUMERIC), 0)::INTEGER);
        
        -- Deduct whatever cash they have
        UPDATE players 
        SET cash = 0,
            last_upkeep_at = NOW()
        WHERE id = player_id_input;
        
        -- Log transaction for partial payment
        IF total_deducted > 0 THEN
            INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
            VALUES (player_id_input, 'crew_upkeep', 'cash', -total_deducted, 
                    'Partial crew upkeep (insufficient funds)');
        END IF;
        
        -- Remove crew members for each unpaid hour (up to crew_lost count)
        FOR i IN 1..LEAST(crew_lost, 5) LOOP  -- Cap at 5 crew lost per login to prevent total wipe
            -- Find a random crew member
            SELECT pc.id as crew_record_id, pc.crew_id, cd.name as crew_name
            INTO random_crew
            FROM player_crew pc
            JOIN crew_definitions cd ON cd.id = pc.crew_id
            WHERE pc.player_id = player_id_input AND pc.quantity > 0
            ORDER BY random() LIMIT 1;
            
            EXIT WHEN random_crew IS NULL;  -- No more crew to remove
            
            -- Reduce crew quantity
            UPDATE player_crew 
            SET quantity = quantity - 1
            WHERE id = random_crew.crew_record_id;
            
            -- Remove 1 assigned weapon (if any) - weapon is LOST
            SELECT pi.id INTO weapon_to_remove
            FROM player_inventory pi
            JOIN item_definitions id ON pi.item_id = id.id
            WHERE pi.player_id = player_id_input 
              AND id.category IN ('weapon', 'equipment')
              AND pi.assigned_quantity > 0
            ORDER BY random() LIMIT 1;
            
            IF weapon_to_remove IS NOT NULL THEN
                UPDATE player_inventory
                SET quantity = GREATEST(0, quantity - 1),
                    assigned_quantity = GREATEST(0, assigned_quantity - 1)
                WHERE id = weapon_to_remove.id;
            END IF;
        END LOOP;
        
        -- Create notification about crew leaving (for Activity Page)
        IF crew_lost > 0 THEN
            INSERT INTO notifications (player_id, type, title, description)
            VALUES (player_id_input, 'system', '⚠️ Crew Left!', 
                    crew_lost || ' crew member(s) left due to unpaid upkeep. Their weapons were lost.');
        END IF;
        
        -- If there was any payment, notify about partial payment
        IF total_deducted > 0 THEN
            INSERT INTO notifications (player_id, type, title, description)
            VALUES (player_id_input, 'system', '💰 Partial Upkeep', 
                    'Paid $' || total_deducted || ' but couldn''t cover full crew costs.');
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'hours_processed', hours_missed,
        'total_deducted', total_deducted,
        'crew_lost', crew_lost,
        'hourly_upkeep', hourly_upkeep,
        'message', CASE 
            WHEN crew_lost > 0 THEN 'Crew members left due to unpaid upkeep'
            WHEN total_deducted > 0 THEN 'Crew upkeep paid successfully'
            ELSE 'No upkeep required'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Set search_path for security
ALTER FUNCTION public.apply_pending_upkeep(UUID) SET search_path = public;

-- 3. Add comment
COMMENT ON FUNCTION apply_pending_upkeep IS 'Calculate and apply missed crew upkeep on player login (Lazy Upkeep). Max 24 hours, max 5 crew lost per check.';
