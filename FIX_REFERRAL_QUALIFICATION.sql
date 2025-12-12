-- =====================================================
-- FIX: Referral Qualification Not Triggering on Level Up
-- Run this in Supabase SQL Editor
-- =====================================================
-- Issue: Players who reach Level 3 aren't being marked as "qualified"
-- Root Cause: add_experience() doesn't call check_referral_qualification()
-- Solution: Update add_experience to call check_referral_qualification on level up


-- =====================================================
-- STEP 1: Update add_experience to include referral check
-- =====================================================

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
    old_level INTEGER;
BEGIN
    -- Get current stats
    SELECT level, experience INTO p_level, p_xp
    FROM players
    WHERE id = player_id_input;

    old_level := p_level;  -- Track original level

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
        -- Also increase max energy/stamina on level up
        max_energy = max_energy + (levels_gained * 5),
        max_stamina = max_stamina + (levels_gained * 2),
        updated_at = NOW()
    WHERE id = player_id_input;

    -- =====================================================
    -- CHECK REFERRAL QUALIFICATION ON LEVEL UP
    -- Triggers when player reaches Level 3+
    -- =====================================================
    IF leveled_up THEN
        PERFORM check_referral_qualification(player_id_input);
        
        -- Create level up notification
        INSERT INTO public.notifications (player_id, type, title, description)
        VALUES (
            player_id_input,
            'level',
            'Level Up!',
            'You reached Level ' || p_level || '! +' || (levels_gained * 5) || ' Max Energy, +' || (levels_gained * 2) || ' Max Stamina'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'leveled_up', leveled_up,
        'new_level', p_level,
        'new_xp', p_xp,
        'xp_needed', calculate_next_level_xp(p_level)
    );
END;
$$;


-- =====================================================
-- STEP 2: Retroactively qualify existing Level 3+ referrals
-- This fixes any players who already leveled up but weren't marked
-- =====================================================

UPDATE public.referrals r
SET is_qualified = true, qualification_met_at = NOW()
FROM public.players p
WHERE r.referred_id = p.id
  AND p.level >= 3
  AND r.is_qualified = false;

-- Also update the referrer's qualified_referrals count to match reality
UPDATE public.players p
SET qualified_referrals = (
    SELECT COUNT(*) 
    FROM public.referrals r 
    WHERE r.referrer_id = p.id AND r.is_qualified = true
)
WHERE EXISTS (
    SELECT 1 FROM public.referrals WHERE referrer_id = p.id
);


-- =====================================================
-- STEP 3: Verify the fix
-- =====================================================

-- Check referrals and their qualification status
SELECT 
    r.id as referral_id,
    referrer.username as referrer_name,
    referred.username as referred_name,
    referred.level as referred_level,
    r.is_qualified,
    r.qualification_met_at
FROM public.referrals r
JOIN public.players referrer ON r.referrer_id = referrer.id
JOIN public.players referred ON r.referred_id = referred.id
ORDER BY r.created_at DESC
LIMIT 10;
