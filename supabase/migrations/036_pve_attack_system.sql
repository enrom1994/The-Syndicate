-- =====================================================
-- PVE ATTACK SYSTEM
-- =====================================================
-- Fixed NPC targets for players to attack and earn XP/Cash
-- No item loss on defeat, just costs stamina

-- =====================================================
-- PVE TARGETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pve_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    required_level INTEGER NOT NULL DEFAULT 1,
    stamina_cost INTEGER NOT NULL DEFAULT 5,
    
    -- Target stats
    base_strength INTEGER NOT NULL DEFAULT 10,
    
    -- Rewards on success
    cash_reward INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    respect_reward INTEGER NOT NULL DEFAULT 0,
    
    -- Success chance (base, modified by player strength)
    base_success_rate INTEGER NOT NULL DEFAULT 70, -- percentage
    
    -- Cooldown
    cooldown_minutes INTEGER NOT NULL DEFAULT 30,
    
    -- Visual
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.pve_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active targets"
    ON public.pve_targets FOR SELECT
    USING (is_active = true);

-- =====================================================
-- PVE ATTACK COOLDOWNS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pve_attack_cooldowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.pve_targets(id) ON DELETE CASCADE,
    last_attacked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(player_id, target_id)
);

ALTER TABLE public.pve_attack_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can see their own cooldowns"
    ON public.pve_attack_cooldowns FOR SELECT
    USING (player_id = auth.uid());


-- =====================================================
-- ATTACK PVE RPC
-- =====================================================
CREATE OR REPLACE FUNCTION attack_pve(
    attacker_id UUID,
    target_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    target RECORD;
    attacker RECORD;
    attacker_strength INTEGER;
    cooldown_record RECORD;
    success_chance INTEGER;
    roll INTEGER;
    is_victory BOOLEAN;
    cash_earned INTEGER := 0;
    xp_earned INTEGER := 0;
    respect_earned INTEGER := 0;
BEGIN
    -- Get target
    SELECT * INTO target FROM public.pve_targets WHERE id = target_id_input AND is_active = true;
    IF target IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target not found');
    END IF;

    -- Get attacker
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0) as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0) as crew_defense
    INTO attacker
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = attacker_id
    GROUP BY p.id;

    IF attacker IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    -- Check level requirement
    IF attacker.level < target.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Need level ' || target.required_level || ' to attack this target');
    END IF;

    -- Check stamina
    IF attacker.stamina < target.stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;

    -- Check cooldown
    SELECT * INTO cooldown_record FROM public.pve_attack_cooldowns 
    WHERE player_id = attacker_id AND target_id = target_id_input;

    IF cooldown_record IS NOT NULL THEN
        IF cooldown_record.last_attacked_at + (target.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
            RETURN jsonb_build_object('success', false, 'message', 'Target on cooldown');
        END IF;
    END IF;

    -- Calculate attacker strength
    attacker_strength := attacker.level * 10 + attacker.crew_attack;

    -- Calculate success chance (base + bonus from strength advantage)
    success_chance := target.base_success_rate;
    IF attacker_strength > target.base_strength THEN
        success_chance := LEAST(95, success_chance + ((attacker_strength - target.base_strength) / 2));
    ELSE
        success_chance := GREATEST(10, success_chance - ((target.base_strength - attacker_strength) / 2));
    END IF;

    -- Deduct stamina
    UPDATE public.players SET stamina = stamina - target.stamina_cost WHERE id = attacker_id;

    -- Roll for success
    roll := floor(random() * 100) + 1;
    is_victory := roll <= success_chance;

    IF is_victory THEN
        cash_earned := target.cash_reward;
        xp_earned := target.xp_reward;
        respect_earned := target.respect_reward;

        -- Apply rewards
        UPDATE public.players 
        SET cash = cash + cash_earned,
            experience = experience + xp_earned,
            respect = respect + respect_earned
        WHERE id = attacker_id;

        -- Check for level up
        PERFORM check_level_up(attacker_id);
    END IF;

    -- Update cooldown
    INSERT INTO public.pve_attack_cooldowns (player_id, target_id, last_attacked_at)
    VALUES (attacker_id, target_id_input, NOW())
    ON CONFLICT (player_id, target_id)
    DO UPDATE SET last_attacked_at = NOW();

    -- Create notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        attacker_id, 
        'attack', 
        CASE WHEN is_victory THEN 'Victory!' ELSE 'Defeat!' END,
        CASE WHEN is_victory 
            THEN 'Defeated ' || target.name || '! Earned $' || cash_earned || ', ' || xp_earned || ' XP'
            ELSE 'Failed to defeat ' || target.name
        END
    );

    RETURN jsonb_build_object(
        'success', true,
        'result', CASE WHEN is_victory THEN 'victory' ELSE 'defeat' END,
        'target_name', target.name,
        'cash_earned', cash_earned,
        'xp_earned', xp_earned,
        'respect_earned', respect_earned,
        'success_chance', success_chance,
        'roll', roll
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- GET PVE TARGETS RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_pve_targets(viewer_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    difficulty TEXT,
    required_level INTEGER,
    stamina_cost INTEGER,
    base_strength INTEGER,
    cash_reward INTEGER,
    xp_reward INTEGER,
    respect_reward INTEGER,
    base_success_rate INTEGER,
    cooldown_minutes INTEGER,
    image_url TEXT,
    is_available BOOLEAN,
    cooldown_remaining_seconds INTEGER,
    player_meets_level BOOLEAN
) AS $$
DECLARE
    player_level INTEGER;
BEGIN
    SELECT level INTO player_level FROM public.players WHERE players.id = viewer_id;

    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.description,
        t.difficulty,
        t.required_level,
        t.stamina_cost,
        t.base_strength,
        t.cash_reward,
        t.xp_reward,
        t.respect_reward,
        t.base_success_rate,
        t.cooldown_minutes,
        t.image_url,
        -- Is available (not on cooldown)
        (c.last_attacked_at IS NULL OR 
         c.last_attacked_at + (t.cooldown_minutes || ' minutes')::INTERVAL <= NOW()) AS is_available,
        -- Cooldown remaining
        CASE 
            WHEN c.last_attacked_at IS NULL THEN 0
            WHEN c.last_attacked_at + (t.cooldown_minutes || ' minutes')::INTERVAL <= NOW() THEN 0
            ELSE EXTRACT(EPOCH FROM (c.last_attacked_at + (t.cooldown_minutes || ' minutes')::INTERVAL - NOW()))::INTEGER
        END AS cooldown_remaining_seconds,
        -- Player meets level
        (player_level >= t.required_level) AS player_meets_level
    FROM public.pve_targets t
    LEFT JOIN public.pve_attack_cooldowns c ON c.target_id = t.id AND c.player_id = viewer_id
    WHERE t.is_active = true
    ORDER BY t.required_level ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- SEED PVE TARGETS
-- =====================================================
INSERT INTO public.pve_targets (name, description, difficulty, required_level, stamina_cost, base_strength, cash_reward, xp_reward, respect_reward, base_success_rate, cooldown_minutes, image_url)
VALUES 
    ('Street Punk', 'A low-level thug causing trouble on your turf.', 'easy', 1, 3, 10, 500, 10, 1, 80, 15, '/images/pve/street_punk.png'),
    ('Corner Shop', 'A small store that hasn''t paid protection money.', 'easy', 3, 5, 20, 1500, 20, 2, 75, 20, '/images/pve/corner_shop.png'),
    ('Rival Dealer', 'A competitor selling on your territory.', 'medium', 5, 8, 40, 2500, 30, 3, 65, 30, '/images/pve/rival_dealer.png'),
    ('Rival Gang Hideout', 'A small gang trying to move in on your operations.', 'medium', 10, 10, 80, 8000, 50, 5, 55, 45, '/images/pve/gang_hideout.png'),
    ('Armored Truck', 'A cash transport making rounds in the city.', 'hard', 15, 15, 150, 25000, 80, 10, 45, 60, '/images/pve/armored_truck.png'),
    ('Police Convoy', 'A high-risk hit on law enforcement. Massive rewards.', 'expert', 30, 20, 300, 50000, 150, 25, 35, 120, '/images/pve/police_convoy.png')
ON CONFLICT DO NOTHING;
