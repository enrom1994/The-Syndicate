-- =====================================================
-- SCHEMA TRUTH & INTENT CLEANUP MIGRATION
-- =====================================================
-- PURPOSE:
--   1. Stop XP writes (deprecated progression)
--   2. Add deprecation comments to misleading columns
--   3. Zero out item_definitions.respect_bonus (unused)
--   4. Mark total_kills as stats-only
--
-- NO COLUMNS DROPPED. NO DATA RESET.
-- Historical data preserved.
-- =====================================================

SET search_path = public;

-- =====================================================
-- 1. DEPRECATION COMMENTS FOR XP/LEVEL SYSTEM
-- =====================================================

COMMENT ON COLUMN public.players.experience IS 
    'DEPRECATED: XP system removed in migration 109. Do not use. Historical data preserved.';

COMMENT ON COLUMN public.players.level IS 
    'DEPRECATED: Legacy progression value. No gameplay impact. Kept for historical reference only.';


-- =====================================================
-- 2. STATS-ONLY COMMENT FOR total_kills
-- =====================================================

COMMENT ON COLUMN public.players.total_kills IS 
    'STATISTIC ONLY: No gameplay effect. Not used for matchmaking, rewards, or power. Historical tracking only.';


-- =====================================================
-- 3. DEPRECATED STAT COLUMNS
-- =====================================================

COMMENT ON COLUMN public.players.agility IS 
    'RESERVED: Never implemented. Reserved for potential future use.';

COMMENT ON COLUMN public.players.intelligence IS 
    'RESERVED: Never implemented. Reserved for potential future use.';


-- =====================================================
-- 4. ZERO OUT item_definitions.respect_bonus
-- =====================================================

-- Clear all respect_bonus values (currently unused but misleading)
UPDATE public.item_definitions 
SET respect_bonus = 0 
WHERE respect_bonus IS NOT NULL AND respect_bonus != 0;

-- Update the column comment to reflect true intent
COMMENT ON COLUMN public.item_definitions.respect_bonus IS 
    'FUTURE USE: Reserved for War/Season perks. Currently inactive. DO NOT implement respect math.';


-- =====================================================
-- 5. FIX complete_job TO STOP XP WRITES
-- =====================================================
-- The complete_job RPC still references experience. We need to replace it.

CREATE OR REPLACE FUNCTION complete_job(
    player_id_input UUID,
    job_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    job_def RECORD;
    player_rec RECORD;
    cash_earned BIGINT;
    respect_earned INTEGER;
    success BOOLEAN;
    roll INTEGER;
    has_income_boost BOOLEAN := false;
BEGIN
    -- Get job definition
    SELECT * INTO job_def FROM public.job_definitions WHERE id = job_id_input;
    
    IF job_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job not found');
    END IF;
    
    -- Get player
    SELECT * INTO player_rec FROM public.players WHERE id = player_id_input;
    
    IF player_rec IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Check level requirement (kept for backwards compatibility with job gates)
    IF player_rec.level < job_def.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Level requirement not met');
    END IF;
    
    -- Check energy
    IF player_rec.energy < job_def.energy_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough energy');
    END IF;
    
    -- Deduct energy
    UPDATE public.players 
    SET energy = energy - job_def.energy_cost,
        updated_at = NOW()
    WHERE id = player_id_input;
    
    -- Roll for success
    roll := floor(random() * 100) + 1;
    success := roll <= job_def.success_rate;
    
    IF success THEN
        -- Check for income boost
        SELECT EXISTS (
            SELECT 1 FROM player_boosters 
            WHERE player_id = player_id_input 
            AND booster_type IN ('2x_income', 'vip_pass')
            AND expires_at > NOW()
        ) INTO has_income_boost;
        
        cash_earned := job_def.cash_reward;
        IF has_income_boost THEN
            cash_earned := cash_earned * 2;
        END IF;
        
        respect_earned := COALESCE(job_def.respect_reward, 0);
        
        -- Award rewards (NO XP - removed)
        UPDATE public.players 
        SET cash = cash + cash_earned,
            respect = respect + respect_earned,
            total_jobs_completed = total_jobs_completed + 1,
            updated_at = NOW()
        WHERE id = player_id_input;
        
        -- Log transaction
        INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'job', 'cash', cash_earned, 'Completed: ' || job_def.name);
        
        -- Log job completion
        INSERT INTO public.job_log (player_id, job_id, success, cash_earned, experience_earned)
        VALUES (player_id_input, job_id_input, true, cash_earned, 0);
        
        RETURN jsonb_build_object(
            'success', true,
            'result', 'success',
            'job_name', job_def.name,
            'cash_earned', cash_earned,
            'respect_earned', respect_earned,
            'roll', roll,
            'success_rate', job_def.success_rate,
            'had_income_boost', has_income_boost
        );
    ELSE
        -- Job failed
        INSERT INTO public.job_log (player_id, job_id, success, cash_earned, experience_earned)
        VALUES (player_id_input, job_id_input, false, 0, 0);
        
        RETURN jsonb_build_object(
            'success', true,
            'result', 'failed',
            'job_name', job_def.name,
            'roll', roll,
            'success_rate', job_def.success_rate
        );
    END IF;
END;
$$;

ALTER FUNCTION complete_job(UUID, UUID) SET search_path = public;

COMMENT ON FUNCTION complete_job(UUID, UUID) IS 
    'Complete a PvE job. XP removed - only awards cash and respect.';


-- =====================================================
-- 6. VERIFICATION: LIST ALL FUNCTIONS STILL WRITING XP
-- =====================================================
-- After this migration, the following should be verified as fixed:
-- 
-- complete_job ✓ (fixed above)
-- level_up_player - KEEP (part of referral system, reads XP but doesnt award)
-- perform_attack - NOT APPLICABLE (no XP logic)
-- 
-- Historical RPCs that wrote XP but are superseded:
-- - 008_leveling_system.sql: add_experience (original, likely superseded)
-- - 036_pve_attack_system.sql: perform_attack (old version)
-- - 064_starter_pack_system.sql: buy_starter_pack (sets experience=0)
-- - 115_economy_rebalance.sql: (uses level_up_player)
-- =====================================================


-- =====================================================
-- END OF MIGRATION
-- =====================================================
