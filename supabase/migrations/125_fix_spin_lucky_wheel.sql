-- =====================================================
-- FIX spin_lucky_wheel - RESTORE CORRECT SIGNATURE
-- =====================================================
-- Migration 123 broke this RPC by changing the signature.
-- Original: (target_player_id UUID, use_diamonds BOOLEAN)
-- Broken:   (player_id_input UUID)
-- This restores the original signature with auth.uid() validation

SET search_path = public;

-- Drop the broken single-param version
DROP FUNCTION IF EXISTS spin_lucky_wheel(UUID);

-- Restore correct 2-param version with auth check
CREATE OR REPLACE FUNCTION spin_lucky_wheel(target_player_id UUID, use_diamonds BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    prize RECORD;
    random_weight INTEGER;
    cumulative_weight INTEGER := 0;
    total_weight INTEGER;
    spin_cost INTEGER := 10; -- Diamond cost for extra spin
    can_free_spin BOOLEAN;
    hours_until_free NUMERIC;
BEGIN
    -- SECURITY: Validate caller identity
    IF target_player_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Get player
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Check if can free spin (once per 24 hours)
    can_free_spin := player_record.last_free_spin IS NULL 
                     OR player_record.last_free_spin < NOW() - INTERVAL '24 hours';
    
    IF NOT can_free_spin AND NOT use_diamonds THEN
        hours_until_free := EXTRACT(EPOCH FROM (player_record.last_free_spin + INTERVAL '24 hours' - NOW())) / 3600;
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Free spin not available yet',
            'hours_remaining', ROUND(hours_until_free, 1)
        );
    END IF;
    
    -- If using diamonds, check balance
    IF use_diamonds THEN
        IF player_record.diamonds < spin_cost THEN
            RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds');
        END IF;
        -- Deduct diamonds
        UPDATE players SET diamonds = diamonds - spin_cost WHERE id = target_player_id;
    ELSE
        -- Update last free spin
        UPDATE players SET last_free_spin = NOW() WHERE id = target_player_id;
    END IF;
    
    -- Increment spin counter
    UPDATE players SET total_spins = COALESCE(total_spins, 0) + 1 WHERE id = target_player_id;
    
    -- Get total weight
    SELECT SUM(weight) INTO total_weight FROM lucky_wheel_prizes;
    
    -- Random weighted selection
    random_weight := FLOOR(RANDOM() * total_weight);
    
    FOR prize IN SELECT * FROM lucky_wheel_prizes ORDER BY id
    LOOP
        cumulative_weight := cumulative_weight + prize.weight;
        IF random_weight < cumulative_weight THEN
            -- Found our prize! Apply reward
            IF prize.prize_type = 'cash' THEN
                UPDATE players SET cash = cash + prize.amount WHERE id = target_player_id;
                INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
                VALUES (target_player_id, 'lucky_wheel', 'cash', prize.amount, 'Lucky Wheel: ' || prize.name);
            ELSIF prize.prize_type = 'diamonds' THEN
                UPDATE players SET diamonds = diamonds + prize.amount WHERE id = target_player_id;
                INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
                VALUES (target_player_id, 'lucky_wheel', 'diamonds', prize.amount, 'Lucky Wheel: ' || prize.name);
            ELSIF prize.prize_type = 'energy' THEN
                UPDATE players SET energy = LEAST(max_energy, energy + prize.amount) WHERE id = target_player_id;
            ELSIF prize.prize_type = 'stamina' THEN
                UPDATE players SET stamina = LEAST(max_stamina, stamina + prize.amount) WHERE id = target_player_id;
            ELSIF prize.prize_type = 'respect' THEN
                UPDATE players SET respect = respect + prize.amount WHERE id = target_player_id;
            ELSIF prize.prize_type = 'xp' THEN
                UPDATE players SET xp = xp + prize.amount WHERE id = target_player_id;
                PERFORM check_level_up(target_player_id);
            END IF;
            
            RETURN jsonb_build_object(
                'success', true,
                'prize_id', prize.id,
                'prize_name', prize.name,
                'prize_type', prize.prize_type,
                'amount', prize.amount,
                'icon', prize.icon,
                'color', prize.color,
                'used_diamonds', use_diamonds
            );
        END IF;
    END LOOP;
    
    -- Fallback (shouldn't happen)
    RETURN jsonb_build_object('success', true, 'prize_name', 'Try Again', 'prize_type', 'nothing', 'amount', 0, 'icon', '/images/icons/retry.png');
END;
$$;

COMMENT ON FUNCTION spin_lucky_wheel(UUID, BOOLEAN) IS 'Auth-locked: Requires auth.uid() = target_player_id';
