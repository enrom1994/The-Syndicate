-- =====================================================
-- FIX: REFERRAL QUALIFICATION - RESPECT INSTEAD OF LEVEL
-- =====================================================
-- The referral system was using deprecated level >= 3 check.
-- Now uses respect >= 500 (achievable in ~10 jobs).

SET search_path = public;

-- =====================================================
-- 1. UPDATE check_referral_qualification FUNCTION
-- =====================================================
-- Changes: level >= 3 → respect >= 500

CREATE OR REPLACE FUNCTION check_referral_qualification(referred_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    player_respect INTEGER;
    is_already_qualified BOOLEAN;
    referrer_uuid UUID;
BEGIN
    -- Get player respect (NOT level)
    SELECT respect INTO player_respect 
    FROM public.players 
    WHERE id = referred_player_id;
    
    -- Qualification threshold: 500 Respect
    IF COALESCE(player_respect, 0) < 500 THEN
        RETURN false;
    END IF;
    
    -- Get referral record
    SELECT is_qualified, referrer_id INTO is_already_qualified, referrer_uuid
    FROM public.referrals 
    WHERE referred_id = referred_player_id;
    
    -- No referral exists or already qualified
    IF referrer_uuid IS NULL OR is_already_qualified THEN
        RETURN false;
    END IF;
    
    -- Mark as qualified
    UPDATE public.referrals 
    SET is_qualified = true, qualification_met_at = NOW()
    WHERE referred_id = referred_player_id;
    
    -- Increment referrer's qualified count
    UPDATE public.players 
    SET qualified_referrals = qualified_referrals + 1 
    WHERE id = referrer_uuid;
    
    -- Notify referrer
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        referrer_uuid, 
        'achievement', 
        'Referral Qualified!', 
        'One of your referrals earned 500 Respect! Check your referral rewards.'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.check_referral_qualification(UUID) SET search_path = public;

COMMENT ON FUNCTION check_referral_qualification IS 'Checks if referred player qualifies (500+ respect) and updates referrer stats';


-- =====================================================
-- 2. UPDATE apply_referral_code NOTIFICATION MESSAGE
-- =====================================================

CREATE OR REPLACE FUNCTION apply_referral_code(
    new_player_id UUID,
    code_input TEXT
) RETURNS JSONB AS $$
DECLARE
    referrer_uuid UUID;
    already_referred BOOLEAN;
BEGIN
    -- Find referrer by code
    SELECT id INTO referrer_uuid 
    FROM public.players 
    WHERE referral_code = UPPER(TRIM(code_input));
    
    IF referrer_uuid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid referral code');
    END IF;
    
    -- Can't use your own code
    IF referrer_uuid = new_player_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot use your own referral code');
    END IF;
    
    -- Check if already referred
    SELECT (referred_by IS NOT NULL) INTO already_referred 
    FROM public.players 
    WHERE id = new_player_id;
    
    IF already_referred THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already have a referrer');
    END IF;
    
    -- Update new player's referred_by
    UPDATE public.players 
    SET referred_by = referrer_uuid 
    WHERE id = new_player_id;
    
    -- Create referral record
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code)
    VALUES (referrer_uuid, new_player_id, UPPER(TRIM(code_input)))
    ON CONFLICT (referred_id) DO NOTHING;
    
    -- Increment referrer's total count
    UPDATE public.players 
    SET total_referrals = total_referrals + 1 
    WHERE id = referrer_uuid;
    
    -- Create notification for referrer (UPDATED MESSAGE)
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        referrer_uuid, 
        'achievement', 
        'New Referral!', 
        'Someone joined using your referral code! They must earn 500 Respect for you to claim rewards.'
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Referral code applied! Your friend will earn bonus rewards.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.apply_referral_code(UUID, TEXT) SET search_path = public;


-- =====================================================
-- 3. UPDATE get_referral_stats TO INCLUDE RESPECT
-- =====================================================
-- Add respect to the referrals list for frontend display

CREATE OR REPLACE FUNCTION get_referral_stats(player_id_input UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    ref_code TEXT;
    total_refs INTEGER;
    qualified_refs INTEGER;
BEGIN
    -- Get/generate referral code
    SELECT referral_code INTO ref_code FROM public.players WHERE id = player_id_input;
    IF ref_code IS NULL THEN
        ref_code := generate_referral_code(player_id_input);
    END IF;
    
    -- Get referral counts
    SELECT total_referrals, qualified_referrals 
    INTO total_refs, qualified_refs
    FROM public.players WHERE id = player_id_input;
    
    -- Build result with referrals list and milestones (INCLUDES RESPECT)
    result := jsonb_build_object(
        'referral_code', ref_code,
        'total_referrals', COALESCE(total_refs, 0),
        'qualified_referrals', COALESCE(qualified_refs, 0),
        'pending_referrals', COALESCE(total_refs, 0) - COALESCE(qualified_refs, 0),
        'referrals', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', r.id,
                'username', COALESCE(p.username, 'Unknown'),
                'level', p.level,
                'respect', COALESCE(p.respect, 0),
                'is_qualified', r.is_qualified,
                'created_at', r.created_at
            ) ORDER BY r.created_at DESC), '[]'::jsonb)
            FROM public.referrals r
            JOIN public.players p ON r.referred_id = p.id
            WHERE r.referrer_id = player_id_input
            LIMIT 50
        ),
        'milestones', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', rm.id,
                'milestone_count', rm.milestone_count,
                'reward_type', rm.reward_type,
                'reward_amount', rm.reward_amount,
                'reward_item_name', id.name,
                'reward_item_icon', id.icon,
                'title', rm.title,
                'description', rm.description,
                'is_claimed', EXISTS (
                    SELECT 1 FROM public.player_referral_milestones prm 
                    WHERE prm.player_id = player_id_input AND prm.milestone_id = rm.id
                ),
                'can_claim', COALESCE(qualified_refs, 0) >= rm.milestone_count
            ) ORDER BY rm.milestone_count), '[]'::jsonb)
            FROM public.referral_milestones rm
            LEFT JOIN public.item_definitions id ON rm.reward_item_id = id.id
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_referral_stats(UUID) SET search_path = public;


-- =====================================================
-- 4. UPDATE COLUMN COMMENT
-- =====================================================

COMMENT ON COLUMN public.players.qualified_referrals IS 'Number of referred players who earned 500 Respect';


-- =====================================================
-- 5. RETROACTIVE FIX: Qualify any pending referrals
-- =====================================================
-- Players who already have 500+ respect but weren't qualified

DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT r.referred_id, r.referrer_id
        FROM public.referrals r
        JOIN public.players p ON r.referred_id = p.id
        WHERE r.is_qualified = false
          AND COALESCE(p.respect, 0) >= 500
    LOOP
        -- Mark as qualified
        UPDATE public.referrals 
        SET is_qualified = true, qualification_met_at = NOW()
        WHERE referred_id = rec.referred_id;
        
        -- Increment referrer's count
        UPDATE public.players 
        SET qualified_referrals = qualified_referrals + 1 
        WHERE id = rec.referrer_id;
        
        -- Notify referrer
        INSERT INTO public.notifications (player_id, type, title, description)
        VALUES (
            rec.referrer_id, 
            'achievement', 
            'Referral Qualified!', 
            'One of your referrals earned 500 Respect! Check your referral rewards.'
        );
    END LOOP;
END;
$$;
