-- =============================================
-- Migration: Founder Bonus System
-- Description: Adds server-side validation for one-time founder bonus claim
-- =============================================

-- Add founder_bonus_claimed column to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS founder_bonus_claimed BOOLEAN DEFAULT FALSE;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_players_founder_bonus 
ON public.players(founder_bonus_claimed) 
WHERE founder_bonus_claimed = FALSE;

-- Comment for documentation
COMMENT ON COLUMN public.players.founder_bonus_claimed IS 
'Tracks if player has claimed the 50 diamond founder bonus (one-time per account)';

-- =============================================
-- RPC: claim_founder_bonus
-- Validates and credits 50 diamonds, ensures one-time claim
-- =============================================
CREATE OR REPLACE FUNCTION public.claim_founder_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_player_id UUID;
    v_already_claimed BOOLEAN;
    v_reward_amount INTEGER := 50;
    v_new_diamond_balance INTEGER;
BEGIN
    -- Get the authenticated player's ID
    v_player_id := auth.uid();
    
    IF v_player_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if already claimed (with row lock to prevent race conditions)
    SELECT founder_bonus_claimed INTO v_already_claimed
    FROM players
    WHERE id = v_player_id
    FOR UPDATE;
    
    IF v_already_claimed IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Player not found'
        );
    END IF;
    
    IF v_already_claimed = TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Founder bonus already claimed',
            'already_claimed', true
        );
    END IF;
    
    -- Credit diamonds and mark as claimed (atomic update)
    UPDATE players
    SET 
        diamonds = COALESCE(diamonds, 0) + v_reward_amount,
        founder_bonus_claimed = TRUE,
        updated_at = NOW()
    WHERE id = v_player_id
    RETURNING diamonds INTO v_new_diamond_balance;
    
    -- Log the transaction
    INSERT INTO transactions (
        player_id,
        transaction_type,
        currency,
        amount,
        description
    ) VALUES (
        v_player_id,
        'founder_bonus',
        'diamonds',
        v_reward_amount,
        'Founder Bonus - Early Access Reward (50 Diamonds)'
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'diamonds_awarded', v_reward_amount,
        'new_balance', v_new_diamond_balance
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_founder_bonus() TO authenticated;
