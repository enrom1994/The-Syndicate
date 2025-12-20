-- =====================================================
-- REFERRAL SYSTEM
-- =====================================================
-- Allows players to earn rewards for inviting others.
-- Referred players must reach Level 3 to "qualify".
-- Milestones: 1, 5, 10, 25, 50 referrals with escalating rewards.

-- =====================================================
-- 1. ADD REFERRAL COLUMNS TO PLAYERS TABLE
-- =====================================================

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.players(id);

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS qualified_referrals INTEGER DEFAULT 0;

-- Index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_players_referral_code ON public.players(referral_code);


-- =====================================================
-- 2. REFERRALS TABLE (who referred whom)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    referred_id UUID UNIQUE NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    is_qualified BOOLEAN DEFAULT false,
    qualification_met_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for referral queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);

-- RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players can view their referrals" ON public.referrals;
CREATE POLICY "Players can view their referrals" ON public.referrals 
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);


-- =====================================================
-- 3. REFERRAL MILESTONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referral_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_count INTEGER NOT NULL UNIQUE,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('cash', 'diamonds', 'item')),
    reward_amount INTEGER NOT NULL,
    reward_item_id UUID REFERENCES public.item_definitions(id),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS - Public read
ALTER TABLE public.referral_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read referral milestones" ON public.referral_milestones;
CREATE POLICY "Anyone can read referral milestones" ON public.referral_milestones 
    FOR SELECT USING (true);


-- =====================================================
-- 4. PLAYER REFERRAL MILESTONES (claimed status)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.player_referral_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES public.referral_milestones(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, milestone_id)
);

-- RLS
ALTER TABLE public.player_referral_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players can view own milestone claims" ON public.player_referral_milestones;
CREATE POLICY "Players can view own milestone claims" ON public.player_referral_milestones 
    FOR SELECT USING (auth.uid() = player_id);


-- =====================================================
-- 5. SEED REFERRAL MILESTONES
-- =====================================================

-- First milestone: 1 friend = $10,000 cash
INSERT INTO public.referral_milestones (milestone_count, reward_type, reward_amount, reward_item_id, title, description)
VALUES (1, 'cash', 10000, NULL, 'First Blood', 'Recruit your first associate')
ON CONFLICT (milestone_count) DO UPDATE SET
    reward_type = EXCLUDED.reward_type,
    reward_amount = EXCLUDED.reward_amount,
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- 5 friends = 50 diamonds
INSERT INTO public.referral_milestones (milestone_count, reward_type, reward_amount, reward_item_id, title, description)
VALUES (5, 'diamonds', 50, NULL, 'Recruiter', 'Build a small crew of 5')
ON CONFLICT (milestone_count) DO UPDATE SET
    reward_type = EXCLUDED.reward_type,
    reward_amount = EXCLUDED.reward_amount,
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- 10 friends = $100,000 cash
INSERT INTO public.referral_milestones (milestone_count, reward_type, reward_amount, reward_item_id, title, description)
VALUES (10, 'cash', 100000, NULL, 'Crew Boss', 'Command a crew of 10 associates')
ON CONFLICT (milestone_count) DO UPDATE SET
    reward_type = EXCLUDED.reward_type,
    reward_amount = EXCLUDED.reward_amount,
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- 25 friends = Rare contraband (Morphine Vials x5)
INSERT INTO public.referral_milestones (milestone_count, reward_type, reward_amount, reward_item_id, title, description)
SELECT 25, 'item', 5, id, 'Network Builder', 'A true recruiter - 25 associates strong'
FROM public.item_definitions WHERE name = 'Morphine Vials'
ON CONFLICT (milestone_count) DO UPDATE SET
    reward_type = EXCLUDED.reward_type,
    reward_amount = EXCLUDED.reward_amount,
    reward_item_id = EXCLUDED.reward_item_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- 50 friends = Legendary contraband (Smuggled Weapons x10) + 500 diamonds
INSERT INTO public.referral_milestones (milestone_count, reward_type, reward_amount, reward_item_id, title, description)
SELECT 50, 'item', 10, id, 'Crime Lord', 'A legendary network of 50 associates'
FROM public.item_definitions WHERE name = 'Smuggled Weapons'
ON CONFLICT (milestone_count) DO UPDATE SET
    reward_type = EXCLUDED.reward_type,
    reward_amount = EXCLUDED.reward_amount,
    reward_item_id = EXCLUDED.reward_item_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description;


-- =====================================================
-- 6. GENERATE REFERRAL CODE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_referral_code(player_id_input UUID)
RETURNS TEXT AS $$
DECLARE
    existing_code TEXT;
    new_code TEXT;
    attempts INTEGER := 0;
BEGIN
    -- Return existing code if already has one
    SELECT referral_code INTO existing_code 
    FROM public.players 
    WHERE id = player_id_input;
    
    IF existing_code IS NOT NULL THEN
        RETURN existing_code;
    END IF;
    
    -- Generate unique 8-character alphanumeric code
    LOOP
        new_code := UPPER(SUBSTR(MD5(player_id_input::TEXT || NOW()::TEXT || random()::TEXT), 1, 8));
        
        -- Check for collision
        IF NOT EXISTS (SELECT 1 FROM public.players WHERE referral_code = new_code) THEN
            EXIT;
        END IF;
        
        attempts := attempts + 1;
        IF attempts > 10 THEN
            -- Fallback to UUID-based code
            new_code := UPPER(SUBSTR(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 1, 8));
            EXIT;
        END IF;
    END LOOP;
    
    UPDATE public.players 
    SET referral_code = new_code 
    WHERE id = player_id_input;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 7. APPLY REFERRAL CODE FUNCTION
-- =====================================================
-- Called when a new player signs up with a referral code

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
    
    -- Create notification for referrer
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        referrer_uuid, 
        'achievement', 
        'New Referral!', 
        'Someone joined using your referral code! They must reach Level 3 for you to claim rewards.'
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Referral code applied! Your friend will earn bonus rewards.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 8. CHECK REFERRAL QUALIFICATION FUNCTION
-- =====================================================
-- Called when a player levels up to check if they qualify their referrer

CREATE OR REPLACE FUNCTION check_referral_qualification(referred_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    player_level INTEGER;
    is_already_qualified BOOLEAN;
    referrer_uuid UUID;
BEGIN
    -- Get player level
    SELECT level INTO player_level 
    FROM public.players 
    WHERE id = referred_player_id;
    
    -- Qualification threshold: Level 3
    IF player_level < 3 THEN
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
        'One of your referrals reached Level 3! Check your referral rewards.'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 9. INTEGRATE WITH LEVEL UP
-- =====================================================
-- Update the level_up_player function to check referral qualification

CREATE OR REPLACE FUNCTION level_up_player(target_player_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_level INTEGER;
    current_xp INTEGER;
    xp_required INTEGER;
    leveled_up BOOLEAN := false;
    levels_gained INTEGER := 0;
    new_level INTEGER;
    new_xp INTEGER;
BEGIN
    -- Get current stats
    SELECT level, experience INTO current_level, current_xp
    FROM public.players WHERE id = target_player_id;
    
    IF current_level IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    new_level := current_level;
    new_xp := current_xp;
    
    -- Check for level ups (can gain multiple levels at once)
    LOOP
        -- Calculate XP required for next level (exponential curve)
        xp_required := FLOOR(100 * POWER(1.15, new_level - 1));
        
        EXIT WHEN new_xp < xp_required;
        
        new_xp := new_xp - xp_required;
        new_level := new_level + 1;
        levels_gained := levels_gained + 1;
        leveled_up := true;
    END LOOP;
    
    -- Update player if leveled up
    IF leveled_up THEN
        UPDATE public.players 
        SET level = new_level, 
            experience = new_xp,
            -- Bonus stats per level
            max_energy = max_energy + (levels_gained * 5),
            max_stamina = max_stamina + (levels_gained * 2),
            energy = LEAST(energy + (levels_gained * 20), max_energy + (levels_gained * 5)),
            stamina = LEAST(stamina + (levels_gained * 10), max_stamina + (levels_gained * 2))
        WHERE id = target_player_id;
        
        -- Check referral qualification (triggers at Level 3+)
        PERFORM check_referral_qualification(target_player_id);
        
        -- Create notification
        INSERT INTO public.notifications (player_id, type, title, description)
        VALUES (
            target_player_id,
            'level',
            'Level Up!',
            'You reached Level ' || new_level || '! +' || (levels_gained * 5) || ' Max Energy, +' || (levels_gained * 2) || ' Max Stamina'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'leveled_up', leveled_up,
        'levels_gained', levels_gained,
        'new_level', new_level,
        'new_xp', new_xp,
        'xp_to_next', FLOOR(100 * POWER(1.15, new_level - 1))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 10. GET REFERRAL STATS FUNCTION
-- =====================================================

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
    
    -- Build result with referrals list and milestones
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


-- =====================================================
-- 11. CLAIM REFERRAL MILESTONE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION claim_referral_milestone(
    player_id_input UUID,
    milestone_id_input UUID
) RETURNS JSONB AS $$
DECLARE
    milestone RECORD;
    player_qualified INTEGER;
    item_name TEXT;
BEGIN
    -- Get milestone details
    SELECT rm.*, id.name as item_name INTO milestone
    FROM public.referral_milestones rm
    LEFT JOIN public.item_definitions id ON rm.reward_item_id = id.id
    WHERE rm.id = milestone_id_input;
    
    IF milestone IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Milestone not found');
    END IF;
    
    -- Check if already claimed
    IF EXISTS (
        SELECT 1 FROM public.player_referral_milestones 
        WHERE player_id = player_id_input AND milestone_id = milestone_id_input
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already claimed this milestone');
    END IF;
    
    -- Check if player qualifies
    SELECT qualified_referrals INTO player_qualified 
    FROM public.players WHERE id = player_id_input;
    
    IF COALESCE(player_qualified, 0) < milestone.milestone_count THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Need ' || (milestone.milestone_count - COALESCE(player_qualified, 0)) || ' more qualified referrals'
        );
    END IF;
    
    -- Award reward based on type
    IF milestone.reward_type = 'cash' THEN
        UPDATE public.players SET cash = cash + milestone.reward_amount WHERE id = player_id_input;
        
        INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'referral_reward', 'cash', milestone.reward_amount, 'Referral milestone: ' || milestone.title);
        
    ELSIF milestone.reward_type = 'diamonds' THEN
        UPDATE public.players SET diamonds = diamonds + milestone.reward_amount WHERE id = player_id_input;
        
        INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'referral_reward', 'diamonds', milestone.reward_amount, 'Referral milestone: ' || milestone.title);
        
    ELSIF milestone.reward_type = 'item' AND milestone.reward_item_id IS NOT NULL THEN
        INSERT INTO public.player_inventory (player_id, item_id, quantity)
        VALUES (player_id_input, milestone.reward_item_id, milestone.reward_amount)
        ON CONFLICT (player_id, item_id)
        DO UPDATE SET quantity = player_inventory.quantity + milestone.reward_amount;
    END IF;
    
    -- Mark as claimed
    INSERT INTO public.player_referral_milestones (player_id, milestone_id)
    VALUES (player_id_input, milestone_id_input);
    
    -- Create notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        player_id_input,
        'achievement',
        'Milestone Claimed: ' || milestone.title,
        CASE 
            WHEN milestone.reward_type = 'cash' THEN 'Earned $' || milestone.reward_amount
            WHEN milestone.reward_type = 'diamonds' THEN 'Earned ' || milestone.reward_amount || ' 💎'
            ELSE 'Earned ' || milestone.reward_amount || 'x ' || COALESCE(milestone.item_name, 'item')
        END
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Milestone claimed!',
        'reward_type', milestone.reward_type,
        'reward_amount', milestone.reward_amount,
        'reward_item_name', milestone.item_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 12. ADD REFERRAL TASK TYPE
-- =====================================================
-- Extend task_definitions to support referral type

-- Update task_type constraint if needed
ALTER TABLE public.task_definitions DROP CONSTRAINT IF EXISTS task_definitions_task_type_check;
ALTER TABLE public.task_definitions ADD CONSTRAINT task_definitions_task_type_check 
    CHECK (task_type IN ('telegram', 'daily', 'weekly', 'special', 'ad', 'referral'));

-- Add comments
COMMENT ON COLUMN public.players.referral_code IS 'Unique 8-character referral code for this player';
COMMENT ON COLUMN public.players.referred_by IS 'Player ID who referred this player';
COMMENT ON COLUMN public.players.total_referrals IS 'Total number of players referred (pending + qualified)';
COMMENT ON COLUMN public.players.qualified_referrals IS 'Number of referred players who reached Level 3';
COMMENT ON TABLE public.referrals IS 'Tracks referral relationships between players';
COMMENT ON TABLE public.referral_milestones IS 'Tiered rewards for referring multiple players';
