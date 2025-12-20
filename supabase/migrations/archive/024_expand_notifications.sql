-- =====================================================
-- EXPAND NOTIFICATIONS TO ALL GAME EVENTS
-- =====================================================

-- Update complete_job to create a notification on success
CREATE OR REPLACE FUNCTION complete_job(
    player_id_input UUID,
    job_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    job_record RECORD;
    player_energy INTEGER;
    player_level INTEGER;
    is_success BOOLEAN;
    xp_result JSONB;
    final_cash BIGINT;
BEGIN
    -- Get Job Details
    SELECT * INTO job_record
    FROM job_definitions
    WHERE id = job_id_input;

    IF job_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job not found');
    END IF;

    -- Get Player Stats
    SELECT energy, level INTO player_energy, player_level
    FROM players
    WHERE id = player_id_input;

    -- Checks
    IF player_level < job_record.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Level too low');
    END IF;

    IF player_energy < job_record.energy_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough energy');
    END IF;

    -- Deduct Energy
    UPDATE players
    SET energy = energy - job_record.energy_cost
    WHERE id = player_id_input;

    -- Calculate Success (Random roll 1-100)
    is_success := (FLOOR(RANDOM() * 100) + 1) <= job_record.success_rate;

    -- Log Attempt
    INSERT INTO job_log (player_id, job_id, success, cash_earned, experience_earned)
    VALUES (
        player_id_input, 
        job_id_input, 
        is_success, 
        CASE WHEN is_success THEN job_record.cash_reward ELSE 0 END, 
        CASE WHEN is_success THEN job_record.experience_reward ELSE 0 END
    );

    IF is_success THEN
        -- Add Cash
        UPDATE players
        SET cash = cash + job_record.cash_reward,
            respect = respect + job_record.respect_reward,
            total_jobs_completed = COALESCE(total_jobs_completed, 0) + 1
        WHERE id = player_id_input;

        -- Add XP (triggers level up check)
        xp_result := add_experience(player_id_input, job_record.experience_reward);

        -- Log Transaction
        INSERT INTO transactions (player_id, amount, currency, transaction_type, description)
        VALUES (player_id_input, job_record.cash_reward, 'cash', 'job_complete', 'Completed job: ' || job_record.name);

        -- CREATE NOTIFICATION for activity feed
        PERFORM create_notification(
            player_id_input,
            'job',
            'Job Complete: ' || job_record.name,
            'Earned $' || job_record.cash_reward::TEXT || ' and ' || job_record.experience_reward::TEXT || ' XP'
        );

        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Job completed!',
            'cash_earned', job_record.cash_reward,
            'xp_earned', job_record.experience_reward,
            'leveled_up', (xp_result->>'leveled_up')::BOOLEAN,
            'new_level', (xp_result->>'new_level')::INTEGER
        );
    ELSE
         RETURN jsonb_build_object(
            'success', false, 
            'message', 'Job failed... you got away safely but empty handed.'
        );
    END IF;
END;
$$;

-- Update spin_lucky_wheel to create a notification on prize win
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
            ELSIF prize.prize_type = 'stamina' THEN
                UPDATE players SET stamina = LEAST(max_stamina, stamina + prize.amount) WHERE id = target_player_id;
            ELSIF prize.prize_type = 'respect' THEN
                UPDATE players SET respect = respect + prize.amount WHERE id = target_player_id;
            END IF;
            
            -- CREATE NOTIFICATION for activity feed (skip 'nothing' prizes)
            IF prize.prize_type != 'nothing' THEN
                PERFORM create_notification(
                    target_player_id,
                    'reward',
                    'Lucky Wheel: ' || prize.name,
                    CASE 
                        WHEN prize.prize_type IN ('cash', 'diamonds') THEN '+' || prize.amount::TEXT || ' ' || prize.prize_type
                        ELSE '+' || prize.amount::TEXT || ' ' || prize.prize_type
                    END
                );
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

-- Update perform_attack to call notify_attack_result (if not already doing so)
-- The notify_attack_result function already exists and creates notifications
