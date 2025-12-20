-- =====================================================
-- RANK REQUIREMENTS: LEVEL → RESPECT/RANK MIGRATION
-- =====================================================
-- Replaces deprecated level-based gating with rank-based gating
-- Ranks are derived from Respect thresholds
-- =====================================================

SET search_path = public;

-- =====================================================
-- 1. RANK HELPER FUNCTION
-- =====================================================
-- Returns the rank name based on respect value
-- Must match frontend RankBadge.tsx thresholds

CREATE OR REPLACE FUNCTION get_rank_from_respect(respect_input INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF respect_input >= 10000 THEN RETURN 'Godfather';
    ELSIF respect_input >= 5000 THEN RETURN 'Boss';
    ELSIF respect_input >= 2500 THEN RETURN 'Underboss';
    ELSIF respect_input >= 1000 THEN RETURN 'Caporegime';
    ELSIF respect_input >= 250 THEN RETURN 'Soldier';
    ELSIF respect_input >= 100 THEN RETURN 'Enforcer';
    ELSE RETURN 'Street Thug';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER FUNCTION public.get_rank_from_respect(INTEGER) SET search_path = public;

COMMENT ON FUNCTION get_rank_from_respect IS 'Returns mafia rank name based on respect thresholds';

-- =====================================================
-- 2. RANK THRESHOLD FUNCTION (for requirement checks)
-- =====================================================
-- Returns the minimum respect required for a given rank

CREATE OR REPLACE FUNCTION get_respect_for_rank(rank_name TEXT)
RETURNS INTEGER AS $$
BEGIN
    CASE rank_name
        WHEN 'Godfather' THEN RETURN 10000;
        WHEN 'Boss' THEN RETURN 5000;
        WHEN 'Underboss' THEN RETURN 2500;
        WHEN 'Caporegime' THEN RETURN 1000;
        WHEN 'Soldier' THEN RETURN 250;
        WHEN 'Enforcer' THEN RETURN 100;
        WHEN 'Street Thug' THEN RETURN 0;
        ELSE RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER FUNCTION public.get_respect_for_rank(TEXT) SET search_path = public;

COMMENT ON FUNCTION get_respect_for_rank IS 'Returns minimum respect required for a given rank name';

-- =====================================================
-- 3. ADD required_rank COLUMNS
-- =====================================================

-- job_definitions
ALTER TABLE public.job_definitions 
    ADD COLUMN IF NOT EXISTS required_rank TEXT DEFAULT 'Street Thug';

COMMENT ON COLUMN public.job_definitions.required_rank IS 'Minimum rank required to execute this job';
COMMENT ON COLUMN public.job_definitions.required_level IS 'DEPRECATED - Use required_rank instead';

-- pve_targets (Heists)
ALTER TABLE public.pve_targets 
    ADD COLUMN IF NOT EXISTS required_rank TEXT DEFAULT 'Street Thug';

COMMENT ON COLUMN public.pve_targets.required_rank IS 'Minimum rank required to attempt this heist';
COMMENT ON COLUMN public.pve_targets.required_level IS 'DEPRECATED - Use required_rank instead';

-- high_stakes_jobs
ALTER TABLE public.high_stakes_jobs 
    ADD COLUMN IF NOT EXISTS required_rank TEXT DEFAULT 'Street Thug';

COMMENT ON COLUMN public.high_stakes_jobs.required_rank IS 'Minimum rank required to attempt this high stakes job';
COMMENT ON COLUMN public.high_stakes_jobs.required_level IS 'DEPRECATED - Use required_rank instead';

-- npc_bounty_definitions (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'npc_bounty_definitions') THEN
        EXECUTE 'ALTER TABLE public.npc_bounty_definitions ADD COLUMN IF NOT EXISTS required_rank TEXT DEFAULT ''Street Thug''';
        EXECUTE 'COMMENT ON COLUMN public.npc_bounty_definitions.required_rank IS ''Minimum rank required to hunt this bounty''';
    END IF;
END $$;

-- =====================================================
-- 4. MIGRATE EXISTING LEVEL VALUES → RANKS
-- =====================================================

-- job_definitions: Level → Rank mapping
UPDATE public.job_definitions SET required_rank = 'Street Thug' WHERE required_level <= 1;
UPDATE public.job_definitions SET required_rank = 'Enforcer' WHERE required_level BETWEEN 2 AND 4;
UPDATE public.job_definitions SET required_rank = 'Soldier' WHERE required_level BETWEEN 5 AND 7;
UPDATE public.job_definitions SET required_rank = 'Caporegime' WHERE required_level BETWEEN 8 AND 14;
UPDATE public.job_definitions SET required_rank = 'Underboss' WHERE required_level BETWEEN 15 AND 24;
UPDATE public.job_definitions SET required_rank = 'Boss' WHERE required_level BETWEEN 25 AND 49;
UPDATE public.job_definitions SET required_rank = 'Godfather' WHERE required_level >= 50;

-- pve_targets: Level → Rank mapping
UPDATE public.pve_targets SET required_rank = 'Street Thug' WHERE required_level <= 1;
UPDATE public.pve_targets SET required_rank = 'Enforcer' WHERE required_level BETWEEN 2 AND 4;
UPDATE public.pve_targets SET required_rank = 'Soldier' WHERE required_level BETWEEN 5 AND 7;
UPDATE public.pve_targets SET required_rank = 'Caporegime' WHERE required_level BETWEEN 8 AND 14;
UPDATE public.pve_targets SET required_rank = 'Underboss' WHERE required_level BETWEEN 15 AND 24;
UPDATE public.pve_targets SET required_rank = 'Boss' WHERE required_level BETWEEN 25 AND 49;
UPDATE public.pve_targets SET required_rank = 'Godfather' WHERE required_level >= 50;

-- high_stakes_jobs: Level → Rank mapping
UPDATE public.high_stakes_jobs SET required_rank = 'Street Thug' WHERE required_level <= 1;
UPDATE public.high_stakes_jobs SET required_rank = 'Enforcer' WHERE required_level BETWEEN 2 AND 4;
UPDATE public.high_stakes_jobs SET required_rank = 'Soldier' WHERE required_level BETWEEN 5 AND 7;
UPDATE public.high_stakes_jobs SET required_rank = 'Caporegime' WHERE required_level BETWEEN 8 AND 14;
UPDATE public.high_stakes_jobs SET required_rank = 'Underboss' WHERE required_level BETWEEN 15 AND 24;
UPDATE public.high_stakes_jobs SET required_rank = 'Boss' WHERE required_level BETWEEN 25 AND 49;
UPDATE public.high_stakes_jobs SET required_rank = 'Godfather' WHERE required_level >= 50;

-- npc_bounty_definitions (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'npc_bounty_definitions') THEN
        EXECUTE 'UPDATE public.npc_bounty_definitions SET required_rank = ''Street Thug'' WHERE required_level <= 1';
        EXECUTE 'UPDATE public.npc_bounty_definitions SET required_rank = ''Enforcer'' WHERE required_level BETWEEN 2 AND 4';
        EXECUTE 'UPDATE public.npc_bounty_definitions SET required_rank = ''Soldier'' WHERE required_level BETWEEN 5 AND 7';
        EXECUTE 'UPDATE public.npc_bounty_definitions SET required_rank = ''Caporegime'' WHERE required_level BETWEEN 8 AND 14';
        EXECUTE 'UPDATE public.npc_bounty_definitions SET required_rank = ''Underboss'' WHERE required_level BETWEEN 15 AND 24';
        EXECUTE 'UPDATE public.npc_bounty_definitions SET required_rank = ''Boss'' WHERE required_level BETWEEN 25 AND 49';
        EXECUTE 'UPDATE public.npc_bounty_definitions SET required_rank = ''Godfather'' WHERE required_level >= 50';
    END IF;
END $$;

-- =====================================================
-- 5. UPDATE complete_job RPC: CHECK RANK INSTEAD OF LEVEL
-- =====================================================

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
    player_record RECORD;
    player_rank TEXT;
    required_respect INTEGER;
    is_success BOOLEAN;
    
    -- Streak variables
    current_streak INTEGER;
    streak_bonus FLOAT := 0;
    final_cash BIGINT;
    final_respect INTEGER;
    chain_still_valid BOOLEAN;
BEGIN
    -- Get Job Details
    SELECT * INTO job_record FROM job_definitions WHERE id = job_id_input;
    IF job_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job not found');
    END IF;

    -- Get Player Stats (including streak)
    SELECT * INTO player_record FROM players WHERE id = player_id_input;

    -- RANK CHECK (replaces level check)
    player_rank := get_rank_from_respect(COALESCE(player_record.respect, 0));
    required_respect := get_respect_for_rank(COALESCE(job_record.required_rank, 'Street Thug'));
    
    IF COALESCE(player_record.respect, 0) < required_respect THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Requires ' || COALESCE(job_record.required_rank, 'Street Thug') || ' rank',
            'required_rank', job_record.required_rank,
            'player_rank', player_rank
        );
    END IF;

    -- Energy check
    IF player_record.energy < job_record.energy_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough energy');
    END IF;

    -- Deduct Energy
    UPDATE players SET energy = energy - job_record.energy_cost WHERE id = player_id_input;

    -- Check if previous chain is still valid
    chain_still_valid := player_record.job_chain_started_at IS NOT NULL 
                         AND player_record.job_chain_started_at > NOW() - INTERVAL '10 minutes'
                         AND player_record.job_chain_broken_at IS NULL;
    
    current_streak := COALESCE(player_record.job_chain_streak, 0);
    
    IF NOT chain_still_valid THEN
        current_streak := 0;
    END IF;

    -- Calculate streak bonus: 10% per streak level (max 50% at streak 5)
    streak_bonus := LEAST(current_streak, 5) * 0.10;

    -- Calculate Success
    is_success := (FLOOR(RANDOM() * 100) + 1) <= job_record.success_rate;

    -- Log Attempt (experience_earned set to 0 - deprecated)
    INSERT INTO job_log (player_id, job_id, success, cash_earned, experience_earned)
    VALUES (
        player_id_input, 
        job_id_input, 
        is_success, 
        CASE WHEN is_success THEN job_record.cash_reward ELSE 0 END, 
        0  -- XP deprecated
    );

    IF is_success THEN
        -- Calculate rewards with streak bonus
        final_cash := ROUND(job_record.cash_reward * (1 + streak_bonus));
        -- Respect = existing respect_reward + experience_reward (1:1 conversion)
        final_respect := ROUND((COALESCE(job_record.respect_reward, 0) + COALESCE(job_record.experience_reward, 0)) * (1 + streak_bonus));
        
        -- Increment streak (max 5)
        current_streak := LEAST(current_streak + 1, 5);
        
        -- Update player with rewards and streak (NO XP)
        UPDATE players
        SET cash = cash + final_cash,
            respect = respect + final_respect,
            total_jobs_completed = COALESCE(total_jobs_completed, 0) + 1,
            job_chain_streak = current_streak,
            job_chain_started_at = NOW(),
            job_chain_broken_at = NULL
        WHERE id = player_id_input;

        -- Log Transaction
        INSERT INTO transactions (player_id, amount, currency, transaction_type, description)
        VALUES (player_id_input, final_cash, 'cash', 'job_complete', 
                'Completed job: ' || job_record.name || 
                CASE WHEN streak_bonus > 0 THEN ' (+' || ROUND(streak_bonus * 100) || '% streak bonus)' ELSE '' END);

        -- Create notification
        PERFORM create_notification(
            player_id_input,
            'job',
            'Job Complete: ' || job_record.name,
            'Earned $' || final_cash::TEXT || ' and ' || final_respect::TEXT || ' Respect' ||
            CASE WHEN streak_bonus > 0 THEN ' (🔥 Streak ' || current_streak || ')' ELSE '' END
        );

        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Job completed!',
            'cash_earned', final_cash,
            'respect_earned', final_respect,
            'current_streak', current_streak,
            'streak_bonus_percent', ROUND(streak_bonus * 100)
        );
    ELSE
        -- FAILURE: Mark chain as broken
        UPDATE players
        SET job_chain_broken_at = NOW()
        WHERE id = player_id_input;
        
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Job failed... you got away safely but empty handed.',
            'chain_broken', current_streak > 0,
            'current_streak', current_streak,
            'can_continue_until', NOW() + INTERVAL '2 minutes'
        );
    END IF;
END;
$$;

ALTER FUNCTION public.complete_job(UUID, UUID) SET search_path = public;

-- =====================================================
-- 6. UPDATE execute_high_stakes_job: CHECK RANK
-- =====================================================

CREATE OR REPLACE FUNCTION execute_high_stakes_job(
    player_id_input UUID,
    job_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    job_record RECORD;
    cooldown_record RECORD;
    player_rank TEXT;
    required_respect INTEGER;
    is_success BOOLEAN;
    final_cash BIGINT;
    final_respect INTEGER;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = player_id_input;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Get job
    SELECT * INTO job_record FROM high_stakes_jobs WHERE id = job_id_input AND is_active = true;
    IF job_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'High stakes job not found');
    END IF;
    
    -- RANK CHECK (replaces level check)
    player_rank := get_rank_from_respect(COALESCE(player_record.respect, 0));
    required_respect := get_respect_for_rank(COALESCE(job_record.required_rank, 'Street Thug'));
    
    IF COALESCE(player_record.respect, 0) < required_respect THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Requires ' || COALESCE(job_record.required_rank, 'Street Thug') || ' rank',
            'required_rank', job_record.required_rank,
            'player_rank', player_rank
        );
    END IF;
    
    -- Check cooldown
    SELECT * INTO cooldown_record 
    FROM high_stakes_cooldowns 
    WHERE player_id = player_id_input AND job_id = job_id_input;
    
    IF cooldown_record IS NOT NULL THEN
        IF cooldown_record.last_attempted_at + (job_record.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'On cooldown',
                'cooldown_remaining', EXTRACT(EPOCH FROM (cooldown_record.last_attempted_at + (job_record.cooldown_minutes || ' minutes')::INTERVAL - NOW()))
            );
        END IF;
    END IF;
    
    -- Check diamonds (ENTRY FEE)
    IF player_record.diamonds < job_record.entry_cost_diamonds THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds (need ' || job_record.entry_cost_diamonds || '💎)');
    END IF;
    
    -- Check energy
    IF player_record.energy < job_record.energy_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough energy');
    END IF;
    
    -- DEDUCT DIAMONDS AND ENERGY
    UPDATE players 
    SET diamonds = diamonds - job_record.entry_cost_diamonds,
        energy = energy - job_record.energy_cost
    WHERE id = player_id_input;
    
    -- Log diamond transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'high_stakes_entry', 'diamonds', -job_record.entry_cost_diamonds, 
            'Entry fee for ' || job_record.name);
    
    -- Record cooldown
    INSERT INTO high_stakes_cooldowns (player_id, job_id, last_attempted_at)
    VALUES (player_id_input, job_id_input, NOW())
    ON CONFLICT (player_id, job_id) 
    DO UPDATE SET last_attempted_at = NOW();
    
    -- Roll for success
    is_success := (FLOOR(RANDOM() * 100) + 1) <= job_record.success_rate;
    
    IF is_success THEN
        -- Calculate rewards with multiplier
        final_cash := ROUND(job_record.base_cash_reward * job_record.cash_multiplier);
        -- Respect = base_xp_reward * xp_multiplier (1:1 conversion)
        final_respect := ROUND(job_record.base_xp_reward * job_record.xp_multiplier);
        
        -- Give rewards (NO XP)
        UPDATE players 
        SET cash = cash + final_cash,
            respect = respect + final_respect,
            total_jobs_completed = COALESCE(total_jobs_completed, 0) + 1
        WHERE id = player_id_input;
        
        -- Log cash transaction
        INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'high_stakes_win', 'cash', final_cash, 
                'High Stakes Victory: ' || job_record.name);
        
        -- Notification
        PERFORM create_notification(
            player_id_input,
            'job',
            '🎰 HIGH STAKES WIN!',
            job_record.name || ' - Won $' || final_cash::TEXT || ' and ' || final_respect || ' Respect!'
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'result', 'victory',
            'message', 'Incredible! You pulled off ' || job_record.name || '!',
            'cash_earned', final_cash,
            'respect_earned', final_respect,
            'diamonds_spent', job_record.entry_cost_diamonds
        );
    ELSE
        -- FAILURE
        PERFORM create_notification(
            player_id_input,
            'job',
            '💀 HIGH STAKES FAILED',
            job_record.name || ' - Lost ' || job_record.entry_cost_diamonds || '💎 entry fee'
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'result', 'defeat',
            'message', 'The job went south. You lost your ' || job_record.entry_cost_diamonds || '💎 entry fee.',
            'diamonds_lost', job_record.entry_cost_diamonds,
            'cash_earned', 0,
            'respect_earned', 0
        );
    END IF;
END;
$$;

ALTER FUNCTION public.execute_high_stakes_job(UUID, UUID) SET search_path = public;

-- =====================================================
-- 7. UPDATE get_pve_targets: RETURN RANK INFO
-- =====================================================
-- Also updates the player_meets_level to use rank instead
-- NOTE: Must drop first because return type is changing (adding required_rank)

DROP FUNCTION IF EXISTS get_pve_targets(uuid);

CREATE OR REPLACE FUNCTION get_pve_targets(viewer_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    difficulty TEXT,
    required_level INTEGER,
    required_rank TEXT,
    stamina_cost INTEGER,
    base_strength INTEGER,
    cash_reward INTEGER,
    xp_reward INTEGER,
    respect_reward INTEGER,
    base_success_rate INTEGER,
    cooldown_minutes INTEGER,
    is_available BOOLEAN,
    cooldown_remaining_seconds INTEGER,
    player_meets_level BOOLEAN  -- Kept for backwards compatibility, now based on rank
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    viewer_respect INTEGER;
BEGIN
    -- Get viewer's respect
    SELECT COALESCE(p.respect, 0) INTO viewer_respect
    FROM players p WHERE p.id = viewer_id;

    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.description,
        t.difficulty,
        t.required_level,
        COALESCE(t.required_rank, 'Street Thug')::TEXT as required_rank,
        t.stamina_cost,
        t.base_strength,
        t.cash_reward,
        t.xp_reward,
        t.respect_reward,
        t.base_success_rate,
        t.cooldown_minutes,
        -- Is available (not on cooldown)
        CASE 
            WHEN pc.last_attacked_at IS NULL THEN true
            WHEN pc.last_attacked_at + (t.cooldown_minutes || ' minutes')::INTERVAL < NOW() THEN true
            ELSE false
        END as is_available,
        -- Cooldown remaining
        CASE 
            WHEN pc.last_attacked_at IS NULL THEN 0
            WHEN pc.last_attacked_at + (t.cooldown_minutes || ' minutes')::INTERVAL < NOW() THEN 0
            ELSE EXTRACT(EPOCH FROM (pc.last_attacked_at + (t.cooldown_minutes || ' minutes')::INTERVAL - NOW()))::INTEGER
        END as cooldown_remaining_seconds,
        -- Player meets rank requirement (replaces level check)
        (viewer_respect >= get_respect_for_rank(COALESCE(t.required_rank, 'Street Thug'))) as player_meets_level
    FROM public.pve_targets t
    LEFT JOIN public.pve_cooldowns pc ON pc.target_id = t.id AND pc.player_id = viewer_id
    WHERE t.is_active = true
    ORDER BY t.required_level ASC, t.name ASC;
END;
$$;

ALTER FUNCTION public.get_pve_targets(UUID) SET search_path = public;

-- =====================================================
-- 8. UPDATE attack_pve: CHECK RANK
-- =====================================================
-- NOTE: Must drop first because parameter names are changing

DROP FUNCTION IF EXISTS attack_pve(uuid, uuid);

CREATE OR REPLACE FUNCTION attack_pve(
    attacker_id_input UUID,
    target_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target RECORD;
    attacker RECORD;
    player_rank TEXT;
    required_respect INTEGER;
    cooldown_record RECORD;
    attacker_strength INTEGER;
    target_strength INTEGER;
    win_chance INTEGER;
    roll INTEGER;
    did_win BOOLEAN;
    cash_earned INTEGER;
    respect_earned INTEGER;
BEGIN
    -- Get target
    SELECT * INTO target FROM public.pve_targets WHERE id = target_id_input AND is_active = true;
    IF target IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target not found');
    END IF;
    
    -- Get attacker
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER as crew_attack,
           COALESCE((SELECT SUM(id.attack_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_attack
    INTO attacker
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = attacker_id_input
    GROUP BY p.id;
    
    IF attacker IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- RANK CHECK (replaces level check)
    player_rank := get_rank_from_respect(COALESCE(attacker.respect, 0));
    required_respect := get_respect_for_rank(COALESCE(target.required_rank, 'Street Thug'));
    
    IF COALESCE(attacker.respect, 0) < required_respect THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Requires ' || COALESCE(target.required_rank, 'Street Thug') || ' rank',
            'required_rank', target.required_rank,
            'player_rank', player_rank
        );
    END IF;
    
    -- Check cooldown
    SELECT * INTO cooldown_record FROM public.pve_cooldowns 
    WHERE player_id = attacker_id_input AND target_id = target_id_input;
    
    IF cooldown_record IS NOT NULL THEN
        IF cooldown_record.last_attacked_at + (target.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'On cooldown',
                'cooldown_remaining', EXTRACT(EPOCH FROM (cooldown_record.last_attacked_at + (target.cooldown_minutes || ' minutes')::INTERVAL - NOW()))
            );
        END IF;
    END IF;
    
    -- Check stamina
    IF attacker.stamina < target.stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;
    
    -- Deduct stamina
    UPDATE public.players SET stamina = stamina - target.stamina_cost WHERE id = attacker_id_input;
    
    -- Record cooldown
    INSERT INTO public.pve_cooldowns (player_id, target_id, last_attacked_at)
    VALUES (attacker_id_input, target_id_input, NOW())
    ON CONFLICT (player_id, target_id) DO UPDATE SET last_attacked_at = NOW();
    
    -- Calculate strength using respect tier
    IF (SELECT to_regproc('get_respect_tier')) IS NOT NULL THEN
        attacker_strength := get_respect_tier(COALESCE(attacker.respect, 0)) + attacker.crew_attack + attacker.item_attack;
    ELSE
        attacker_strength := 10 + attacker.crew_attack + attacker.item_attack;
    END IF;
    target_strength := target.base_strength;
    
    -- Calculate win chance
    win_chance := target.base_success_rate + LEAST(20, (attacker_strength - target_strength) / 2);
    win_chance := GREATEST(10, LEAST(95, win_chance));
    
    -- Roll for success
    roll := FLOOR(RANDOM() * 100) + 1;
    did_win := roll <= win_chance;
    
    IF did_win THEN
        cash_earned := target.cash_reward;
        respect_earned := COALESCE(target.respect_reward, 0);
        
        -- Give rewards
        UPDATE public.players 
        SET cash = cash + cash_earned,
            respect = respect + respect_earned
        WHERE id = attacker_id_input;
        
        -- Log transaction
        INSERT INTO transactions (player_id, amount, currency, transaction_type, description)
        VALUES (attacker_id_input, cash_earned, 'cash', 'pve_victory', 'Defeated ' || target.name);
        
        RETURN jsonb_build_object(
            'success', true,
            'result', 'victory',
            'message', 'You defeated ' || target.name || '!',
            'cash_earned', cash_earned,
            'respect_earned', respect_earned,
            'win_chance', win_chance
        );
    ELSE
        RETURN jsonb_build_object(
            'success', true,
            'result', 'defeat',
            'message', target.name || ' was too strong. You escaped with your life.',
            'cash_earned', 0,
            'respect_earned', 0,
            'win_chance', win_chance
        );
    END IF;
END;
$$;

ALTER FUNCTION public.attack_pve(UUID, UUID) SET search_path = public;

-- =====================================================
-- DONE
-- =====================================================
