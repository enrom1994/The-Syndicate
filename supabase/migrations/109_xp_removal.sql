-- =====================================================
-- XP REMOVAL: RESPECT-ONLY PROGRESSION
-- =====================================================
-- XP is deprecated. Respect is the sole progression metric.
-- Level remains as derived UI concept from respect milestones.

SET search_path = public;

-- =====================================================
-- 1. RESPECT TIER FUNCTION (for PvP strength calculation)
-- =====================================================
-- Maps raw respect to a capped tier for balanced PvP
-- Tier 1: 0-999 respect = 10 power
-- Tier 2: 1000-2499 = 20 power
-- Tier 3: 2500-4999 = 30 power
-- Tier 4: 5000-9999 = 40 power
-- Tier 5: 10000+ = 50 power (max)

CREATE OR REPLACE FUNCTION get_respect_tier(respect_input INTEGER)
RETURNS INTEGER AS $$
BEGIN
    CASE
        WHEN respect_input >= 10000 THEN RETURN 50;
        WHEN respect_input >= 5000 THEN RETURN 40;
        WHEN respect_input >= 2500 THEN RETURN 30;
        WHEN respect_input >= 1000 THEN RETURN 20;
        ELSE RETURN 10;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_respect_tier IS 'Returns PvP power value (10-50) based on respect milestones';


-- =====================================================
-- 2. UPDATE PERFORM_JOB: RESPECT ONLY (no XP)
-- =====================================================

DROP FUNCTION IF EXISTS perform_job(UUID, UUID);

CREATE OR REPLACE FUNCTION perform_job(
    player_id_input UUID,
    job_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    job_def RECORD;
    player_rec RECORD;
    energy_cost INTEGER;
    player_item_qty INTEGER;
    respect_earned INTEGER;
BEGIN
    -- Get job details
    SELECT * INTO job_def FROM public.job_definitions WHERE id = job_id_input;
    IF job_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job not found');
    END IF;

    -- Get player details
    SELECT * INTO player_rec FROM public.players WHERE id = player_id_input;
    IF player_rec IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    -- Check Requirements (Respect instead of Level)
    -- Uses respect milestones: required_level 1 = 0 respect, 5 = 1000, 10 = 2500, etc.
    -- For now, keep using required_level but convert logic later
    IF player_rec.level < job_def.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Level too low');
    END IF;

    -- Check Requirements (Item Consumption)
    IF job_def.required_item_id IS NOT NULL AND job_def.required_item_quantity > 0 THEN
        SELECT quantity INTO player_item_qty 
        FROM public.player_inventory 
        WHERE player_id = player_id_input AND item_id = job_def.required_item_id;

        IF COALESCE(player_item_qty, 0) < job_def.required_item_quantity THEN
             RETURN jsonb_build_object('success', false, 'message', 'Missing required items for this job');
        END IF;
    END IF;

    -- Check Energy
    energy_cost := job_def.energy_cost;
    IF player_rec.energy < energy_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough energy');
    END IF;

    -- EXECUTE JOB
    
    -- Deduct Energy
    UPDATE public.players 
    SET energy = energy - energy_cost, 
        last_energy_update = NOW()
    WHERE id = player_id_input;

    -- Deduct Consumables (The Burn)
    IF job_def.required_item_id IS NOT NULL AND job_def.required_item_quantity > 0 THEN
        UPDATE public.player_inventory
        SET quantity = quantity - job_def.required_item_quantity
        WHERE player_id = player_id_input AND item_id = job_def.required_item_id;
    END IF;

    -- Calculate Respect: Use experience_reward value as respect bonus
    -- (1:1 conversion as per user request)
    respect_earned := COALESCE(job_def.respect_reward, 0) + COALESCE(job_def.experience_reward, 0);
    
    -- Award Cash & Respect (NO XP)
    UPDATE public.players
    SET cash = cash + job_def.cash_reward,
        respect = respect + respect_earned,
        total_jobs_completed = total_jobs_completed + 1
    WHERE id = player_id_input;

    -- Return Result
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Job completed!',
        'cash_earned', job_def.cash_reward,
        'respect_earned', respect_earned,
        'items_consumed', job_def.required_item_quantity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.perform_job(UUID, UUID) SET search_path = public;

COMMENT ON FUNCTION perform_job IS 'Execute a job - awards Cash and Respect (XP deprecated)';


-- =====================================================
-- 3. UPDATE COMPLETE_JOB: RESPECT ONLY (no XP)
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

    -- Level check (kept for now)
    IF player_record.level < job_record.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Level too low');
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

COMMENT ON FUNCTION complete_job IS 'Execute a job with streak tracking - awards Respect (XP deprecated)';


-- =====================================================
-- 4. UPDATE EXECUTE_HIGH_STAKES_JOB: RESPECT ONLY
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
    
    -- Check level (kept for now)
    IF player_record.level < job_record.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Requires level ' || job_record.required_level);
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

COMMENT ON FUNCTION execute_high_stakes_job IS 'Execute high stakes job - awards Respect (XP deprecated)';


-- =====================================================
-- 5. UPDATE PVP STRENGTH FORMULA (use respect tiers)
-- =====================================================
-- This updates perform_pvp_attack to use get_respect_tier() instead of level*10

CREATE OR REPLACE FUNCTION perform_pvp_attack(
    attacker_id_input UUID,
    defender_id_input UUID,
    attack_type_input TEXT
)
RETURNS JSONB AS $$
DECLARE
    attack_type RECORD;
    attacker RECORD;
    defender RECORD;
    attacker_strength INTEGER;
    defender_strength INTEGER;
    strength_ratio FLOAT;
    
    -- Consumable check
    consumable_item RECORD;
    player_consumable_qty INTEGER;
    
    -- Booster checks
    has_attack_boost BOOLEAN := false;
    has_shield BOOLEAN := false;
    
    -- Insurance
    defender_insurance RECORD;
    insurance_applied BOOLEAN := false;
    insurance_savings BIGINT := 0;
    
    win_chance INTEGER;
    roll INTEGER;
    attacker_wins BOOLEAN;
    
    -- Respect bonus for consumable attacks
    respect_bonus INTEGER := 5;
    
    -- Losses/gains
    base_cash_stolen BIGINT := 0;
    cash_stolen BIGINT := 0;
    vault_stolen BIGINT := 0;
    contraband_stolen INTEGER := 0;
    respect_stolen INTEGER := 0;
    crew_killed INTEGER := 0;
    
    -- Attacker losses on defeat
    attacker_consumable_loss INTEGER := 0;
    attacker_crew_loss INTEGER := 0;
    attacker_respect_loss INTEGER := 0;
    
    random_item_id UUID;
    random_qty INTEGER;
    stolen_item_name TEXT;
BEGIN
    -- Get attack type
    SELECT * INTO attack_type FROM public.pvp_attack_types WHERE id = attack_type_input AND is_active = true;
    IF attack_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid attack type');
    END IF;

    -- Set respect bonus based on consumable requirement
    IF attack_type.requires_consumables THEN
        respect_bonus := 10;
    ELSE
        respect_bonus := 5;
    END IF;

    -- Can't attack self
    IF attacker_id_input = defender_id_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot attack yourself');
    END IF;

    -- Get attacker with crew stats and items
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER as crew_defense,
           COALESCE(SUM(pc.quantity), 0)::INTEGER as total_crew,
           COALESCE((SELECT SUM(id.attack_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_attack,
           COALESCE((SELECT SUM(id.defense_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_defense
    INTO attacker
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = attacker_id_input
    GROUP BY p.id;

    -- Get defender with crew stats and items
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER as crew_defense,
           COALESCE(SUM(pc.quantity), 0)::INTEGER as total_crew,
           COALESCE((SELECT SUM(id.attack_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_attack,
           COALESCE((SELECT SUM(id.defense_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_defense
    INTO defender
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = defender_id_input
    GROUP BY p.id;

    IF attacker IS NULL OR defender IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    -- CHECK NEW PLAYER PROTECTION (NPP)
    IF defender.newbie_shield_expires_at > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Target is under New Player Protection',
            'npp_expires_at', defender.newbie_shield_expires_at
        );
    END IF;

    -- Check stamina
    IF attacker.stamina < attack_type.stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;

    -- Check crew requirement
    IF attack_type.requires_crew AND attacker.total_crew = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'This attack requires crew members');
    END IF;

    -- Check consumable requirement
    IF attack_type.requires_consumables AND attack_type.consumable_item_name IS NOT NULL THEN
        SELECT * INTO consumable_item FROM public.item_definitions WHERE name = attack_type.consumable_item_name;
        
        IF consumable_item IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Consumable item not found: ' || attack_type.consumable_item_name);
        END IF;
        
        SELECT COALESCE(quantity, 0) INTO player_consumable_qty
        FROM public.player_inventory
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id;
        
        IF player_consumable_qty < attack_type.consumable_qty THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Need ' || attack_type.consumable_qty || 'x ' || attack_type.consumable_item_name || ' (have ' || COALESCE(player_consumable_qty, 0) || ')'
            );
        END IF;
        
        -- Deduct consumables
        UPDATE public.player_inventory 
        SET quantity = quantity - attack_type.consumable_qty
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id;
        
        DELETE FROM public.player_inventory 
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id AND quantity <= 0;
    END IF;

    -- Check for boosters
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = attacker_id_input 
        AND booster_type = '2x_attack' 
        AND expires_at > NOW()
    ) INTO has_attack_boost;
    
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = defender_id_input 
        AND booster_type = 'shield' 
        AND expires_at > NOW()
    ) INTO has_shield;

    -- Calculate strengths using RESPECT TIERS (not level*10)
    attacker_strength := get_respect_tier(attacker.respect) + attacker.crew_attack + attacker.item_attack;
    defender_strength := get_respect_tier(defender.respect) + defender.crew_defense + defender.item_defense;
    
    IF has_attack_boost THEN
        attacker_strength := attacker_strength * 2;
    END IF;
    
    IF has_shield THEN
        defender_strength := defender_strength * 2;
    END IF;

    IF defender_strength < 1 THEN defender_strength := 1; END IF;

    -- Calculate win chance
    strength_ratio := attacker_strength::FLOAT / defender_strength::FLOAT;
    
    IF strength_ratio >= 2.0 THEN
        win_chance := 85;
    ELSIF strength_ratio >= 1.5 THEN
        win_chance := 70;
    ELSIF strength_ratio >= 1.0 THEN
        win_chance := 55;
    ELSIF strength_ratio >= 0.75 THEN
        win_chance := 40;
    ELSIF strength_ratio >= 0.5 THEN
        win_chance := 25;
    ELSE
        win_chance := 15;
    END IF;

    -- Deduct stamina
    UPDATE public.players SET stamina = stamina - attack_type.stamina_cost WHERE id = attacker_id_input;

    -- Roll for victory
    roll := floor(random() * 100) + 1;
    attacker_wins := roll <= win_chance;

    -- ATTACKER WINS
    IF attacker_wins THEN
        IF attack_type.steals_cash THEN
            base_cash_stolen := LEAST(
                (defender.cash * attack_type.cash_steal_percent / 100)::BIGINT,
                (defender.cash * 0.45)::BIGINT
            );
            cash_stolen := base_cash_stolen;
        END IF;

        IF attack_type.steals_vault THEN
            vault_stolen := LEAST(
                (defender.banked_cash * attack_type.vault_steal_percent / 100)::BIGINT,
                (defender.banked_cash * 0.15)::BIGINT
            );
        END IF;

        IF attack_type.steals_respect THEN
            respect_stolen := LEAST((defender.respect * 0.10)::INTEGER, 100);
        END IF;

        IF attack_type.kills_crew THEN
            crew_killed := LEAST(defender.total_crew / 4, 5);
        END IF;

        -- APPLY INSURANCE
        IF NOT has_shield AND (cash_stolen > 0 OR vault_stolen > 0) THEN
            SELECT * INTO defender_insurance
            FROM public.player_insurance
            WHERE player_id = defender_id_input AND claims_remaining > 0
            ORDER BY mitigation_percent DESC
            LIMIT 1;
            
            IF defender_insurance IS NOT NULL THEN
                insurance_applied := true;
                
                insurance_savings := LEAST(
                    ((cash_stolen + vault_stolen) * defender_insurance.mitigation_percent / 100)::BIGINT,
                    defender_insurance.max_coverage
                );
                
                IF cash_stolen > 0 THEN
                    cash_stolen := GREATEST(0, cash_stolen - insurance_savings);
                END IF;
                
                UPDATE public.player_insurance 
                SET claims_remaining = claims_remaining - 1 
                WHERE id = defender_insurance.id;
                
                DELETE FROM public.player_insurance WHERE id = defender_insurance.id AND claims_remaining <= 0;
            END IF;
        END IF;

        -- Apply gains/losses
        UPDATE public.players SET 
            cash = cash + cash_stolen + vault_stolen,
            respect = respect + respect_stolen + respect_bonus
        WHERE id = attacker_id_input;

        UPDATE public.players SET 
            cash = GREATEST(0, cash - cash_stolen),
            banked_cash = GREATEST(0, banked_cash - vault_stolen),
            respect = GREATEST(0, respect - respect_stolen - 3)
        WHERE id = defender_id_input;

        -- Kill defender crew
        IF crew_killed > 0 THEN
            WITH random_crew AS (
                SELECT id FROM public.player_crew 
                WHERE player_id = defender_id_input AND quantity > 0
                ORDER BY random() LIMIT 1
            )
            UPDATE public.player_crew pc
            SET quantity = GREATEST(0, quantity - crew_killed)
            FROM random_crew rc
            WHERE pc.id = rc.id;
        END IF;

        -- Steal contraband
        IF attack_type.steals_contraband THEN
            SELECT pi.item_id, LEAST(pi.quantity, 2), id.name INTO random_item_id, random_qty, stolen_item_name
            FROM public.player_inventory pi
            JOIN public.item_definitions id ON pi.item_id = id.id
            WHERE pi.player_id = defender_id_input AND id.category = 'contraband' AND pi.quantity > 0
            ORDER BY random() LIMIT 1;

            IF random_item_id IS NOT NULL THEN
                contraband_stolen := random_qty;
                
                UPDATE public.player_inventory SET quantity = quantity - random_qty 
                WHERE player_id = defender_id_input AND item_id = random_item_id;
                
                INSERT INTO public.player_inventory (player_id, item_id, quantity)
                VALUES (attacker_id_input, random_item_id, random_qty)
                ON CONFLICT (player_id, item_id)
                DO UPDATE SET quantity = player_inventory.quantity + random_qty;
            END IF;
        END IF;

    -- ATTACKER LOSES
    ELSE
        IF strength_ratio < 0.5 THEN
            attacker_respect_loss := 10;
        ELSIF strength_ratio < 1.0 THEN
            attacker_respect_loss := 5;
        ELSE
            attacker_respect_loss := 2;
        END IF;

        IF attack_type.requires_crew AND attacker.total_crew > 0 THEN
            attacker_crew_loss := LEAST(2, attacker.total_crew / 5);
            
            WITH random_crew AS (
                SELECT id FROM public.player_crew 
                WHERE player_id = attacker_id_input AND quantity > 0
                ORDER BY random() LIMIT 1
            )
            UPDATE public.player_crew pc
            SET quantity = GREATEST(0, quantity - attacker_crew_loss)
            FROM random_crew rc
            WHERE pc.id = rc.id;
        END IF;

        UPDATE public.players SET respect = GREATEST(0, respect - attacker_respect_loss) WHERE id = attacker_id_input;
        UPDATE public.players SET respect = respect + 3 WHERE id = defender_id_input;
    END IF;

    -- Log the attack
    INSERT INTO public.attack_log (attacker_id, defender_id, attack_type, attacker_won, cash_stolen, respect_change)
    VALUES (
        attacker_id_input, 
        defender_id_input, 
        attack_type_input,
        attacker_wins, 
        COALESCE(cash_stolen + vault_stolen, 0)::INTEGER,
        CASE WHEN attacker_wins THEN respect_stolen + respect_bonus ELSE -attacker_respect_loss END
    );

    -- Notifications
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES 
        (attacker_id_input, 'attack', 
         CASE WHEN attacker_wins THEN 'Attack Successful!' ELSE 'Attack Failed!' END,
         CASE WHEN attacker_wins 
            THEN 'Hit ' || defender.username || ' with ' || attack_type.name || '. Stole $' || (cash_stolen + vault_stolen) || ' (+' || respect_bonus || ' respect)'
            ELSE 'Failed ' || attack_type.name || ' on ' || defender.username || '. Lost ' || attacker_respect_loss || ' respect'
         END),
        (defender_id_input, 'attack',
         CASE WHEN attacker_wins THEN 'You Were Attacked!' ELSE 'Attack Defended!' END,
         CASE WHEN attacker_wins 
            THEN attacker.username || ' hit you with ' || attack_type.name || '. Lost $' || (cash_stolen + vault_stolen) ||
                 CASE WHEN insurance_applied THEN ' (Insurance saved $' || insurance_savings || ')' ELSE '' END
            ELSE 'Successfully defended against ' || attacker.username || '''s ' || attack_type.name
         END);

    RETURN jsonb_build_object(
        'success', true,
        'result', CASE WHEN attacker_wins THEN 'victory' ELSE 'defeat' END,
        'attack_type', attack_type.name,
        'defender_name', defender.username,
        'win_chance', win_chance,
        'roll', roll,
        'cash_stolen', cash_stolen + vault_stolen,
        'respect_stolen', respect_stolen,
        'respect_bonus', respect_bonus,
        'contraband_stolen', contraband_stolen,
        'stolen_item_name', stolen_item_name,
        'crew_killed', crew_killed,
        'attacker_crew_loss', attacker_crew_loss,
        'attacker_respect_loss', attacker_respect_loss,
        'consumable_used', attack_type.consumable_item_name,
        'consumable_qty_used', attack_type.consumable_qty,
        'had_attack_boost', has_attack_boost,
        'defender_had_shield', has_shield,
        'insurance_applied', insurance_applied,
        'insurance_savings', insurance_savings
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.perform_pvp_attack(UUID, UUID, TEXT) SET search_path = public;

COMMENT ON FUNCTION perform_pvp_attack IS 'PvP attack using Respect tiers for strength (XP/Level deprecated)';


-- =====================================================
-- 6. DEPRECATE ADD_EXPERIENCE (NO-OP)
-- =====================================================
-- Keep the function for compatibility, but make it a no-op

CREATE OR REPLACE FUNCTION add_experience(
    player_id_input UUID,
    xp_amount_input INTEGER
)
RETURNS JSONB AS $$
BEGIN
    -- XP is deprecated - this function is now a no-op
    -- Returns success with no effect for backward compatibility
    RETURN jsonb_build_object(
        'success', true,
        'leveled_up', false,
        'new_level', 0,
        'message', 'XP deprecated - use Respect instead'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.add_experience(UUID, INTEGER) SET search_path = public;

COMMENT ON FUNCTION add_experience IS 'DEPRECATED: XP removed. This is a no-op for compatibility.';
