# Implement Leveling & Jobs

Now we enable **Player Progression**.
This SQL script does two things:
1.  **Leveling System:** Checks if you have enough XP, levels you up, and refills energy!
2.  **Jobs System:** Allows you to do jobs in `OpsPage`, burn energy, and gain XP + Cash.

## Instructions

1.  Open your **Supabase Dashboard**.
2.  Go to the **SQL Editor**.
3.  Click **New Query**.
4.  Copy the code below entirely and paste it into the editor.
5.  Click **Run**.

```sql
-- =====================================================
-- LEVELING SYSTEM & JOBS
-- =====================================================

-- 1. Helper: Calculate XP needed for next level
-- Curve: 100 * (Level ^ 1.5)
CREATE OR REPLACE FUNCTION calculate_next_level_xp(current_level INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN FLOOR(100 * POWER(current_level, 1.5))::INTEGER;
END;
$$;

-- 2. Central Function: Add Experience & Handle Level Up
CREATE OR REPLACE FUNCTION add_experience(
    player_id_input UUID,
    xp_amount_input INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_level INTEGER;
    p_xp INTEGER;
    xp_needed INTEGER;
    leveled_up BOOLEAN := false;
    levels_gained INTEGER := 0;
BEGIN
    -- Get current stats
    SELECT level, experience INTO p_level, p_xp
    FROM players
    WHERE id = player_id_input;

    -- Add XP
    p_xp := p_xp + xp_amount_input;
    
    -- Level Up Loop (handling multiple levels at once)
    LOOP
        xp_needed := calculate_next_level_xp(p_level);
        
        IF p_xp >= xp_needed THEN
            p_xp := p_xp - xp_needed;
            p_level := p_level + 1;
            levels_gained := levels_gained + 1;
            leveled_up := true;
        ELSE
            EXIT; -- Exit loop when XP is not enough for next level
        END IF;
    END LOOP;

    -- Update Player
    UPDATE players
    SET 
        level = p_level,
        experience = p_xp,
        -- Refill Energy & Stamina on Level Up
        energy = CASE WHEN levels_gained > 0 THEN max_energy ELSE energy END,
        stamina = CASE WHEN levels_gained > 0 THEN max_stamina ELSE stamina END,
        updated_at = NOW()
    WHERE id = player_id_input;

    RETURN jsonb_build_object(
        'success', true,
        'leveled_up', leveled_up,
        'new_level', p_level,
        'new_xp', p_xp,
        'xp_needed', calculate_next_level_xp(p_level)
    );
END;
$$;


-- 3. Job Execution (PvE)
-- This is how players GET XP.
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
            respect = respect + job_record.respect_reward
        WHERE id = player_id_input;

        -- Add XP (triggers level up check)
        xp_result := add_experience(player_id_input, job_record.experience_reward);

        -- Log Transaction
        INSERT INTO transactions (player_id, amount, currency, transaction_type, description)
        VALUES (player_id_input, job_record.cash_reward, 'cash', 'job_complete', 'Completed job: ' || job_record.name);

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
```
