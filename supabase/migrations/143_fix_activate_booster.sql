-- =====================================================
-- FIX ACTIVATE_BOOSTER FUNCTION
-- =====================================================
-- ISSUE: ShopPage calls activate_booster with diamond cost but function
--        doesn't deduct diamonds or check balance
-- FIX: Add diamond_cost parameter and proper deduction logic

SET search_path = public;

-- Drop existing versions
DROP FUNCTION IF EXISTS activate_booster(UUID, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS activate_booster(UUID, TEXT) CASCADE;

-- Create fixed version with diamond cost handling
CREATE OR REPLACE FUNCTION activate_booster(
    player_id_input UUID,
    booster_type_input TEXT,
    duration_hours_input INTEGER DEFAULT 24,
    diamond_cost_input INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    existing_booster RECORD;
    new_expires TIMESTAMPTZ;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = player_id_input;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    -- Check diamond balance if cost > 0
    IF diamond_cost_input > 0 THEN
        IF player_record.diamonds < diamond_cost_input THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Not enough diamonds',
                'required', diamond_cost_input,
                'available', player_record.diamonds
            );
        END IF;
        
        -- Deduct diamonds
        UPDATE players 
        SET diamonds = diamonds - diamond_cost_input 
        WHERE id = player_id_input;
        
        -- Log transaction
        INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'booster_purchase', 'diamonds', -diamond_cost_input, 
                'Purchased ' || booster_type_input || ' booster');
    END IF;

    -- Check for existing booster of same type
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
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Booster extended!',
            'expires_at', new_expires,
            'extended', true,
            'diamonds_spent', diamond_cost_input
        );
    ELSE
        -- Create new booster
        new_expires := NOW() + (duration_hours_input || ' hours')::INTERVAL;
        
        INSERT INTO player_boosters (player_id, booster_type, expires_at)
        VALUES (player_id_input, booster_type_input, new_expires);
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Booster activated!',
            'expires_at', new_expires,
            'extended', false,
            'diamonds_spent', diamond_cost_input
        );
    END IF;
END;
$$;

ALTER FUNCTION activate_booster(UUID, TEXT, INTEGER, INTEGER) SET search_path = public;

COMMENT ON FUNCTION activate_booster(UUID, TEXT, INTEGER, INTEGER) IS 
    'Activates or extends a booster. Optionally deducts diamond cost. Uses player_boosters table.';
