-- =====================================================
-- HOTFIX: UPDATE BOUNTY FUNCTIONS TO USE RANK
-- =====================================================
-- The claim_npc_bounty function was still using level-based checks
-- This updates it to use the new rank-based system
-- =====================================================

SET search_path = public;

-- First, add required_rank column to bounty_definitions if it doesn't exist
ALTER TABLE public.bounty_definitions 
    ADD COLUMN IF NOT EXISTS required_rank TEXT DEFAULT 'Street Thug';

COMMENT ON COLUMN public.bounty_definitions.required_rank IS 'Minimum rank required to hunt this bounty';

-- Migrate existing level values to ranks
UPDATE public.bounty_definitions SET required_rank = 'Street Thug' WHERE required_level <= 1;
UPDATE public.bounty_definitions SET required_rank = 'Enforcer' WHERE required_level BETWEEN 2 AND 4;
UPDATE public.bounty_definitions SET required_rank = 'Soldier' WHERE required_level BETWEEN 5 AND 7;
UPDATE public.bounty_definitions SET required_rank = 'Caporegime' WHERE required_level BETWEEN 8 AND 14;
UPDATE public.bounty_definitions SET required_rank = 'Underboss' WHERE required_level BETWEEN 15 AND 24;
UPDATE public.bounty_definitions SET required_rank = 'Boss' WHERE required_level BETWEEN 25 AND 49;
UPDATE public.bounty_definitions SET required_rank = 'Godfather' WHERE required_level >= 50;

-- Update claim_npc_bounty to use rank instead of level
CREATE OR REPLACE FUNCTION claim_npc_bounty(
    hunter_id UUID,
    definition_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bounty_def RECORD;
    hunter RECORD;
    cooldown RECORD;
    reward BIGINT;
    stamina_cost INTEGER := 5;
    hunter_rank TEXT;
    required_respect INTEGER;
BEGIN
    -- Get bounty definition
    SELECT * INTO bounty_def FROM bounty_definitions WHERE id = definition_id AND is_active = true;
    
    IF bounty_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bounty not found.');
    END IF;
    
    -- Get hunter
    SELECT * INTO hunter FROM players WHERE id = hunter_id;
    
    -- RANK CHECK (replaces level check)
    hunter_rank := get_rank_from_respect(COALESCE(hunter.respect, 0));
    required_respect := get_respect_for_rank(COALESCE(bounty_def.required_rank, 'Street Thug'));
    
    IF COALESCE(hunter.respect, 0) < required_respect THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Requires ' || COALESCE(bounty_def.required_rank, 'Street Thug') || ' rank to hunt this bounty.',
            'required_rank', bounty_def.required_rank,
            'player_rank', hunter_rank
        );
    END IF;
    
    -- Check cooldown
    SELECT * INTO cooldown 
    FROM player_bounty_cooldowns 
    WHERE player_id = hunter_id AND bounty_definition_id = definition_id;
    
    IF cooldown IS NOT NULL AND cooldown.available_at > NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'This bounty is on cooldown.');
    END IF;
    
    -- Check stamina
    IF hunter.stamina < stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina. Need ' || stamina_cost || ' stamina.');
    END IF;
    
    -- Use stamina
    UPDATE players SET stamina = stamina - stamina_cost, updated_at = NOW() WHERE id = hunter_id;
    
    -- Calculate random reward
    reward := bounty_def.min_reward + (RANDOM() * (bounty_def.max_reward - bounty_def.min_reward))::BIGINT;
    
    -- Give rewards
    UPDATE players 
    SET cash = cash + reward, respect = respect + bounty_def.respect_reward, updated_at = NOW()
    WHERE id = hunter_id;
    
    -- Set cooldown
    INSERT INTO player_bounty_cooldowns (player_id, bounty_definition_id, available_at)
    VALUES (hunter_id, definition_id, NOW() + (bounty_def.cooldown_hours * INTERVAL '1 hour'))
    ON CONFLICT (player_id, bounty_definition_id) 
    DO UPDATE SET available_at = NOW() + (bounty_def.cooldown_hours * INTERVAL '1 hour');
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (hunter_id, 'bounty_hunt', 'cash', reward, 'Bounty: ' || bounty_def.target_name);
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Target eliminated! Earned $' || reward,
        'reward', reward,
        'respect', bounty_def.respect_reward
    );
END;
$$;

ALTER FUNCTION public.claim_npc_bounty(UUID, UUID) SET search_path = public;

COMMENT ON FUNCTION claim_npc_bounty IS 'Hunt an NPC bounty target - uses rank-based requirements';
