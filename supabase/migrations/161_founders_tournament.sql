-- =============================================
-- Migration: Founders Tournament System
-- Description: Tournament configuration, participant tracking, and registration
-- =============================================

-- =============================================
-- TABLE: tournaments
-- Configurable tournament settings (managed via Supabase Dashboard)
-- =============================================
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    prize_amount NUMERIC(10, 2) NOT NULL DEFAULT 10,
    prize_currency TEXT NOT NULL DEFAULT 'TON',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    ranking_metric TEXT NOT NULL DEFAULT 'networth', -- 'networth', 'respect', 'wins'
    eligibility TEXT NOT NULL DEFAULT 'founders_only', -- 'founders_only', 'all'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_dates CHECK (ends_at > starts_at)
);

-- Index for finding active tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_active 
ON public.tournaments(is_active, starts_at, ends_at) 
WHERE is_active = TRUE;

COMMENT ON TABLE public.tournaments IS 
'Configurable tournament settings - manage via Supabase Dashboard';

-- =============================================
-- TABLE: tournament_participants
-- Tracks players registered for tournaments
-- =============================================
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    final_rank INTEGER, -- Set when tournament ends
    final_score BIGINT, -- Net worth at tournament end
    
    UNIQUE(tournament_id, player_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament 
ON public.tournament_participants(tournament_id);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_player 
ON public.tournament_participants(player_id);

COMMENT ON TABLE public.tournament_participants IS 
'Tracks player registrations for tournaments';

-- =============================================
-- RPC: get_current_tournament
-- Returns active tournament info + player's registration status
-- =============================================
CREATE OR REPLACE FUNCTION public.get_current_tournament(
    player_id_input UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_player_id UUID;
    v_tournament RECORD;
    v_is_registered BOOLEAN := FALSE;
    v_is_founder BOOLEAN := FALSE;
    v_player_rank INTEGER;
    v_player_networth BIGINT;
    v_participant_count INTEGER;
BEGIN
    -- Get player ID
    v_player_id := COALESCE(player_id_input, auth.uid());
    
    -- Find active tournament (current time between start and end)
    SELECT * INTO v_tournament
    FROM tournaments
    WHERE is_active = TRUE
      AND NOW() >= starts_at
      AND NOW() < ends_at
    ORDER BY starts_at DESC
    LIMIT 1;
    
    -- No active tournament
    IF v_tournament.id IS NULL THEN
        -- Check for upcoming tournament
        SELECT * INTO v_tournament
        FROM tournaments
        WHERE is_active = TRUE
          AND NOW() < starts_at
        ORDER BY starts_at ASC
        LIMIT 1;
        
        IF v_tournament.id IS NULL THEN
            RETURN jsonb_build_object(
                'has_tournament', false
            );
        END IF;
    END IF;
    
    -- Get participant count
    SELECT COUNT(*) INTO v_participant_count
    FROM tournament_participants
    WHERE tournament_id = v_tournament.id;
    
    -- Check player status if provided
    IF v_player_id IS NOT NULL THEN
        -- Check if founder
        SELECT founder_bonus_claimed INTO v_is_founder
        FROM players
        WHERE id = v_player_id;
        
        -- Check if registered
        SELECT EXISTS(
            SELECT 1 FROM tournament_participants
            WHERE tournament_id = v_tournament.id
              AND player_id = v_player_id
        ) INTO v_is_registered;
        
        -- Get player's current rank and net worth
        WITH ranked AS (
            SELECT 
                p.id,
                (COALESCE(p.cash, 0) + COALESCE(p.banked_cash, 0)) as networth,
                ROW_NUMBER() OVER (ORDER BY (COALESCE(p.cash, 0) + COALESCE(p.banked_cash, 0)) DESC) as rank
            FROM players p
            INNER JOIN tournament_participants tp ON tp.player_id = p.id
            WHERE tp.tournament_id = v_tournament.id
        )
        SELECT rank, networth INTO v_player_rank, v_player_networth
        FROM ranked
        WHERE id = v_player_id;
    END IF;
    
    RETURN jsonb_build_object(
        'has_tournament', true,
        'tournament', jsonb_build_object(
            'id', v_tournament.id,
            'name', v_tournament.name,
            'description', v_tournament.description,
            'prize_amount', v_tournament.prize_amount,
            'prize_currency', v_tournament.prize_currency,
            'starts_at', v_tournament.starts_at,
            'ends_at', v_tournament.ends_at,
            'ranking_metric', v_tournament.ranking_metric,
            'eligibility', v_tournament.eligibility,
            'is_started', NOW() >= v_tournament.starts_at,
            'is_ended', NOW() >= v_tournament.ends_at,
            'participant_count', v_participant_count
        ),
        'player', jsonb_build_object(
            'is_founder', COALESCE(v_is_founder, false),
            'is_registered', v_is_registered,
            'current_rank', v_player_rank,
            'current_networth', v_player_networth
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_tournament(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_tournament(UUID) TO anon;

-- =============================================
-- RPC: register_for_tournament
-- Validates founder status and adds player to tournament
-- =============================================
CREATE OR REPLACE FUNCTION public.register_for_tournament(
    tournament_id_input UUID,
    player_id_input UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_player_id UUID;
    v_tournament RECORD;
    v_is_founder BOOLEAN;
    v_already_registered BOOLEAN;
BEGIN
    -- Get player ID
    v_player_id := COALESCE(player_id_input, auth.uid());
    
    IF v_player_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get tournament
    SELECT * INTO v_tournament
    FROM tournaments
    WHERE id = tournament_id_input
      AND is_active = TRUE;
    
    IF v_tournament.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tournament not found or inactive'
        );
    END IF;
    
    -- Check if tournament has ended
    IF NOW() >= v_tournament.ends_at THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tournament has ended'
        );
    END IF;
    
    -- Check founder eligibility
    IF v_tournament.eligibility = 'founders_only' THEN
        SELECT founder_bonus_claimed INTO v_is_founder
        FROM players
        WHERE id = v_player_id;
        
        IF v_is_founder IS NULL OR v_is_founder = FALSE THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Only Founders can join this tournament. Claim your Founder Bonus first!'
            );
        END IF;
    END IF;
    
    -- Check if already registered
    SELECT EXISTS(
        SELECT 1 FROM tournament_participants
        WHERE tournament_id = tournament_id_input
          AND player_id = v_player_id
    ) INTO v_already_registered;
    
    IF v_already_registered THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already registered for this tournament',
            'already_registered', true
        );
    END IF;
    
    -- Register player
    INSERT INTO tournament_participants (tournament_id, player_id)
    VALUES (tournament_id_input, v_player_id);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Welcome to the ' || v_tournament.name || '! Climb the leaderboard to win!'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_tournament(UUID, UUID) TO authenticated;

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- Tournaments are readable by everyone
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON public.tournaments;
CREATE POLICY "Tournaments are viewable by everyone" ON public.tournaments
    FOR SELECT USING (true);

-- Tournament participants are viewable by everyone (for leaderboard)
DROP POLICY IF EXISTS "Tournament participants are viewable by everyone" ON public.tournament_participants;
CREATE POLICY "Tournament participants are viewable by everyone" ON public.tournament_participants
    FOR SELECT USING (true);

-- Players can only insert their own participation (via RPC)
DROP POLICY IF EXISTS "Players can register themselves" ON public.tournament_participants;
CREATE POLICY "Players can register themselves" ON public.tournament_participants
    FOR INSERT WITH CHECK (player_id = auth.uid());

-- =============================================
-- Seed: Create first Founders Tournament
-- Starts immediately, runs for 7 days
-- =============================================
INSERT INTO public.tournaments (
    name,
    description,
    prize_amount,
    prize_currency,
    starts_at,
    ends_at,
    ranking_metric,
    eligibility,
    is_active
) VALUES (
    'FOUNDERS TOURNAMENT',
    'The first ever tournament for founding members of The Syndicate. Highest Net Worth wins!',
    10,
    'TON',
    NOW(), -- Starts immediately
    NOW() + INTERVAL '7 days', -- Runs for 7 days
    'networth',
    'founders_only',
    TRUE
) ON CONFLICT DO NOTHING;
