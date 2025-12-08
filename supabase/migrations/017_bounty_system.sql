-- =====================================================
-- BOUNTY SYSTEM
-- =====================================================
-- Specs:
-- - Minimum bounty: $10,000 cash
-- - Cost to place: 1000 diamonds
-- - Expiration: 3hr to 48hr (3hr intervals)
-- - Max active bounties per player: 2

-- =====================================================
-- TABLES
-- =====================================================

-- Preset bounty definitions (NPC targets always available)
CREATE TABLE IF NOT EXISTS public.bounty_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    min_reward INTEGER NOT NULL,
    max_reward INTEGER NOT NULL,
    respect_reward INTEGER DEFAULT 0,
    required_level INTEGER DEFAULT 1,
    cooldown_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active bounties (both preset NPC and player-placed)
CREATE TABLE IF NOT EXISTS public.bounties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- For NPC bounties
    definition_id UUID REFERENCES public.bounty_definitions(id) ON DELETE SET NULL,
    
    -- For player-placed bounties
    target_player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    placed_by_player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    
    bounty_amount BIGINT NOT NULL,
    bounty_type TEXT NOT NULL CHECK (bounty_type IN ('npc', 'player')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired', 'cancelled')),
    
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_by_player_id UUID REFERENCES public.players(id),
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track player bounty hunting cooldowns
CREATE TABLE IF NOT EXISTS public.player_bounty_cooldowns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    bounty_definition_id UUID NOT NULL REFERENCES public.bounty_definitions(id) ON DELETE CASCADE,
    available_at TIMESTAMPTZ NOT NULL,
    UNIQUE (player_id, bounty_definition_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bounties_status ON public.bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_expires ON public.bounties(expires_at);
CREATE INDEX IF NOT EXISTS idx_bounties_target ON public.bounties(target_player_id);
CREATE INDEX IF NOT EXISTS idx_bounties_placed_by ON public.bounties(placed_by_player_id);

-- RLS
ALTER TABLE public.bounty_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_bounty_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bounty definitions" ON public.bounty_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can view active bounties" ON public.bounties FOR SELECT USING (true);
CREATE POLICY "Players can view own cooldowns" ON public.player_bounty_cooldowns FOR SELECT USING (auth.uid() = player_id);

-- =====================================================
-- SEED DATA: Preset NPC Bounties
-- =====================================================
INSERT INTO public.bounty_definitions (target_name, description, difficulty, min_reward, max_reward, respect_reward, required_level, cooldown_hours) VALUES
    ('Vinnie "The Rat" Mancuso', 'A snitch hiding in the Bronx. Make him disappear.', 'easy', 5000, 15000, 10, 1, 6),
    ('Big Tony Calabrese', 'Muscle for a rival family. Send a message.', 'easy', 8000, 20000, 15, 3, 8),
    ('Lucky Sal Moretti', 'Running an unauthorized racket downtown.', 'medium', 20000, 50000, 30, 5, 12),
    ('Frankie "Fingers" Romano', 'Safecracker who crossed the wrong people.', 'medium', 35000, 75000, 50, 10, 16),
    ('Don Carmine Bianchi', 'An old boss who refuses to retire. High risk.', 'hard', 100000, 250000, 100, 20, 24),
    ('The Ghost', 'Nobody knows his real name. Legendary hitman.', 'hard', 200000, 500000, 200, 30, 48)
ON CONFLICT DO NOTHING;

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Get available bounties
CREATE OR REPLACE FUNCTION get_bounties(requester_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    npc_bounties JSONB;
    player_bounties JSONB;
    my_bounties JSONB;
BEGIN
    -- Expire old bounties
    UPDATE bounties 
    SET status = 'expired' 
    WHERE status = 'active' AND expires_at < NOW();
    
    -- Get NPC bounties with cooldowns
    SELECT json_agg(json_build_object(
        'id', bd.id,
        'type', 'npc',
        'target_name', bd.target_name,
        'description', bd.description,
        'difficulty', bd.difficulty,
        'min_reward', bd.min_reward,
        'max_reward', bd.max_reward,
        'respect_reward', bd.respect_reward,
        'required_level', bd.required_level,
        'cooldown_hours', bd.cooldown_hours,
        'available_at', pbc.available_at,
        'is_available', (pbc.available_at IS NULL OR pbc.available_at <= NOW())
    ) ORDER BY bd.required_level, bd.difficulty)
    INTO npc_bounties
    FROM bounty_definitions bd
    LEFT JOIN player_bounty_cooldowns pbc ON pbc.bounty_definition_id = bd.id AND pbc.player_id = requester_id
    WHERE bd.is_active = true;
    
    -- Get active player-placed bounties (not placed by requester, not targeting requester)
    SELECT json_agg(json_build_object(
        'id', b.id,
        'type', 'player',
        'target_player_id', b.target_player_id,
        'target_name', COALESCE(p.username, p.first_name, 'Unknown'),
        'target_level', p.level,
        'bounty_amount', b.bounty_amount,
        'placed_by', COALESCE(placer.username, placer.first_name, 'Anonymous'),
        'expires_at', b.expires_at,
        'time_remaining', EXTRACT(EPOCH FROM (b.expires_at - NOW()))::INTEGER
    ) ORDER BY b.bounty_amount DESC)
    INTO player_bounties
    FROM bounties b
    JOIN players p ON p.id = b.target_player_id
    JOIN players placer ON placer.id = b.placed_by_player_id
    WHERE b.bounty_type = 'player' 
      AND b.status = 'active'
      AND b.target_player_id != requester_id
      AND b.placed_by_player_id != requester_id;
    
    -- Get bounties I placed
    SELECT json_agg(json_build_object(
        'id', b.id,
        'target_player_id', b.target_player_id,
        'target_name', COALESCE(p.username, p.first_name, 'Unknown'),
        'bounty_amount', b.bounty_amount,
        'status', b.status,
        'expires_at', b.expires_at,
        'time_remaining', EXTRACT(EPOCH FROM (b.expires_at - NOW()))::INTEGER,
        'claimed_by', COALESCE(claimer.username, claimer.first_name)
    ) ORDER BY b.created_at DESC)
    INTO my_bounties
    FROM bounties b
    JOIN players p ON p.id = b.target_player_id
    LEFT JOIN players claimer ON claimer.id = b.claimed_by_player_id
    WHERE b.placed_by_player_id = requester_id AND b.bounty_type = 'player';
    
    RETURN jsonb_build_object(
        'npc_bounties', COALESCE(npc_bounties, '[]'::jsonb),
        'player_bounties', COALESCE(player_bounties, '[]'::jsonb),
        'my_bounties', COALESCE(my_bounties, '[]'::jsonb)
    );
END;
$$;

-- Place a bounty on another player
CREATE OR REPLACE FUNCTION place_bounty(
    placer_id UUID,
    target_id UUID,
    amount BIGINT,
    hours_duration INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    diamond_cost INTEGER := 1000;
    min_bounty BIGINT := 10000;
    max_active INTEGER := 2;
    placer_diamonds INTEGER;
    placer_cash BIGINT;
    active_bounties INTEGER;
    target_player RECORD;
BEGIN
    -- Validate hours (3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48)
    IF hours_duration < 3 OR hours_duration > 48 OR (hours_duration % 3) != 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid duration. Choose 3-48 hours in 3-hour intervals.');
    END IF;
    
    -- Check minimum bounty
    IF amount < min_bounty THEN
        RETURN jsonb_build_object('success', false, 'message', 'Minimum bounty is $10,000.');
    END IF;
    
    -- Can't place bounty on yourself
    IF placer_id = target_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You cannot place a bounty on yourself.');
    END IF;
    
    -- Check target exists
    SELECT * INTO target_player FROM players WHERE id = target_id;
    IF target_player IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target player not found.');
    END IF;
    
    -- Check if target already has active bounty on them
    IF EXISTS (SELECT 1 FROM bounties WHERE target_player_id = target_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'message', 'This player already has an active bounty on them.');
    END IF;
    
    -- Check placer's resources
    SELECT diamonds, cash INTO placer_diamonds, placer_cash FROM players WHERE id = placer_id;
    
    IF placer_diamonds < diamond_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'You need 1000 diamonds to place a bounty.');
    END IF;
    
    IF placer_cash < amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient cash for bounty amount.');
    END IF;
    
    -- Check active bounty limit
    SELECT COUNT(*) INTO active_bounties 
    FROM bounties 
    WHERE placed_by_player_id = placer_id AND status = 'active';
    
    IF active_bounties >= max_active THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only have 2 active bounties at a time.');
    END IF;
    
    -- Deduct resources
    UPDATE players 
    SET diamonds = diamonds - diamond_cost, cash = cash - amount, updated_at = NOW()
    WHERE id = placer_id;
    
    -- Create bounty
    INSERT INTO bounties (target_player_id, placed_by_player_id, bounty_amount, bounty_type, expires_at)
    VALUES (target_id, placer_id, amount, 'player', NOW() + (hours_duration * INTERVAL '1 hour'));
    
    -- Log transactions
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES 
        (placer_id, 'bounty_fee', 'diamonds', -diamond_cost, 'Bounty placement fee'),
        (placer_id, 'bounty_placed', 'cash', -amount, 'Bounty on ' || COALESCE(target_player.username, target_player.first_name));
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Bounty placed on ' || COALESCE(target_player.username, target_player.first_name) || ' for $' || amount
    );
END;
$$;

-- Cancel own bounty (partial refund)
CREATE OR REPLACE FUNCTION cancel_bounty(
    canceller_id UUID,
    bounty_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bounty_record RECORD;
    refund_amount BIGINT;
BEGIN
    -- Get bounty
    SELECT * INTO bounty_record FROM bounties WHERE id = bounty_id;
    
    IF bounty_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bounty not found.');
    END IF;
    
    IF bounty_record.placed_by_player_id != canceller_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only cancel your own bounties.');
    END IF;
    
    IF bounty_record.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This bounty is no longer active.');
    END IF;
    
    -- 50% refund
    refund_amount := bounty_record.bounty_amount / 2;
    
    -- Update bounty status
    UPDATE bounties SET status = 'cancelled' WHERE id = bounty_id;
    
    -- Refund cash
    UPDATE players SET cash = cash + refund_amount, updated_at = NOW() WHERE id = canceller_id;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (canceller_id, 'bounty_cancelled', 'cash', refund_amount, 'Bounty cancellation refund (50%)');
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Bounty cancelled. Refunded $' || refund_amount || ' (50%)'
    );
END;
$$;

-- Claim NPC bounty (hunt NPC target)
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
BEGIN
    -- Get bounty definition
    SELECT * INTO bounty_def FROM bounty_definitions WHERE id = definition_id AND is_active = true;
    
    IF bounty_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bounty not found.');
    END IF;
    
    -- Get hunter
    SELECT * INTO hunter FROM players WHERE id = hunter_id;
    
    -- Check level requirement
    IF hunter.level < bounty_def.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'You need to be level ' || bounty_def.required_level || ' for this bounty.');
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

-- Claim player bounty (triggers attack on player)
CREATE OR REPLACE FUNCTION claim_player_bounty(
    hunter_id UUID,
    bounty_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bounty_record RECORD;
    target_player RECORD;
    hunter RECORD;
    attack_success BOOLEAN;
    total_reward BIGINT;
    stamina_cost INTEGER := 10;
BEGIN
    -- Get bounty
    SELECT * INTO bounty_record FROM bounties WHERE id = bounty_id AND status = 'active';
    
    IF bounty_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bounty not found or already claimed.');
    END IF;
    
    -- Can't claim own bounty
    IF bounty_record.placed_by_player_id = hunter_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You cannot claim your own bounty.');
    END IF;
    
    -- Can't be the target
    IF bounty_record.target_player_id = hunter_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are the target of this bounty!');
    END IF;
    
    -- Get players
    SELECT * INTO hunter FROM players WHERE id = hunter_id;
    SELECT * INTO target_player FROM players WHERE id = bounty_record.target_player_id;
    
    -- Check stamina
    IF hunter.stamina < stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina. Need ' || stamina_cost || ' stamina.');
    END IF;
    
    -- Use stamina
    UPDATE players SET stamina = stamina - stamina_cost, updated_at = NOW() WHERE id = hunter_id;
    
    -- Simple combat calculation (can be enhanced)
    attack_success := (hunter.strength + (RANDOM() * 20)::INTEGER) > (target_player.defense + (RANDOM() * 15)::INTEGER);
    
    IF attack_success THEN
        total_reward := bounty_record.bounty_amount;
        
        -- Update bounty
        UPDATE bounties 
        SET status = 'claimed', claimed_by_player_id = hunter_id, claimed_at = NOW()
        WHERE id = bounty_id;
        
        -- Give reward to hunter
        UPDATE players SET cash = cash + total_reward, respect = respect + 50, updated_at = NOW()
        WHERE id = hunter_id;
        
        -- Log
        INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
        VALUES (hunter_id, 'bounty_claimed', 'cash', total_reward, 'Bounty claim: ' || COALESCE(target_player.username, target_player.first_name));
        
        RETURN jsonb_build_object(
            'success', true, 
            'won', true,
            'message', 'Bounty claimed! Earned $' || total_reward,
            'reward', total_reward
        );
    ELSE
        -- Failed - bounty remains active
        RETURN jsonb_build_object(
            'success', true, 
            'won', false,
            'message', 'Hunt failed! ' || COALESCE(target_player.username, target_player.first_name) || ' escaped.'
        );
    END IF;
END;
$$;

-- Search players for placing bounty
CREATE OR REPLACE FUNCTION search_players_for_bounty(
    searcher_id UUID,
    search_query TEXT,
    result_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    results JSONB;
BEGIN
    SELECT json_agg(json_build_object(
        'id', p.id,
        'username', p.username,
        'first_name', p.first_name,
        'level', p.level,
        'respect', p.respect,
        'has_active_bounty', EXISTS(SELECT 1 FROM bounties WHERE target_player_id = p.id AND status = 'active')
    ) ORDER BY p.level DESC)
    INTO results
    FROM players p
    WHERE p.id != searcher_id
      AND (
          p.username ILIKE '%' || search_query || '%'
          OR p.first_name ILIKE '%' || search_query || '%'
      )
    LIMIT result_limit;
    
    RETURN COALESCE(results, '[]'::jsonb);
END;
$$;
