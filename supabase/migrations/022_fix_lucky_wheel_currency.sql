-- =====================================================
-- FIX: Lucky Wheel transaction currency constraint
-- =====================================================

-- Update transactions currency check to allow lucky wheel prize types
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_currency_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_currency_check 
    CHECK (currency IN ('cash', 'diamonds', 'ton', 'energy', 'stamina', 'respect'));

-- Update spin_lucky_wheel to not log 'nothing' type and use proper currency
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
                -- Energy not logged to transactions
            ELSIF prize.prize_type = 'stamina' THEN
                UPDATE players SET stamina = LEAST(max_stamina, stamina + prize.amount) WHERE id = target_player_id;
                -- Stamina not logged to transactions
            ELSIF prize.prize_type = 'respect' THEN
                UPDATE players SET respect = respect + prize.amount WHERE id = target_player_id;
                -- Respect not logged to transactions (or log as 'cash' if needed)
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
    RETURN jsonb_build_object('success', true, 'prize_name', 'Try Again', 'prize_type', 'nothing', 'amount', 0);
END;
$$;
