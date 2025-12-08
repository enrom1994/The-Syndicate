-- =====================================================
-- LUCKY WHEEL / DAILY SPIN SYSTEM
-- =====================================================

-- Create prizes table
CREATE TABLE IF NOT EXISTS public.lucky_wheel_prizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    prize_type TEXT NOT NULL CHECK (prize_type IN ('cash', 'diamonds', 'energy', 'stamina', 'respect', 'nothing')),
    amount INTEGER NOT NULL,
    weight INTEGER NOT NULL DEFAULT 10, -- Higher = more likely
    icon TEXT,
    color TEXT DEFAULT '#D4AF37'
);

-- Seed prizes (weights add up to 100 for easy probability)
INSERT INTO public.lucky_wheel_prizes (name, prize_type, amount, weight, icon, color) VALUES
    ('$500', 'cash', 500, 25, '💵', '#22c55e'),
    ('$2,000', 'cash', 2000, 15, '💵', '#22c55e'),
    ('$5,000', 'cash', 5000, 8, '💰', '#16a34a'),
    ('5 💎', 'diamonds', 5, 12, '💎', '#60a5fa'),
    ('15 💎', 'diamonds', 15, 6, '💎', '#3b82f6'),
    ('50 💎', 'diamonds', 50, 2, '💎', '#2563eb'),
    ('+20 ⚡', 'energy', 20, 12, '⚡', '#facc15'),
    ('+10 🏃', 'stamina', 10, 10, '🏃', '#fb923c'),
    ('+50 ⭐', 'respect', 50, 5, '⭐', '#a855f7'),
    ('Try Again', 'nothing', 0, 5, '🎰', '#6b7280')
ON CONFLICT DO NOTHING;

-- Track player spins
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_free_spin TIMESTAMPTZ;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS total_spins INTEGER DEFAULT 0;

-- RPC to spin the wheel
CREATE OR REPLACE FUNCTION spin_lucky_wheel(target_player_id UUID, use_diamonds BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    prize RECORD;
    random_weight INTEGER;
    cumulative_weight INTEGER := 0;
    total_weight INTEGER;
    spin_cost INTEGER := 10; -- Diamond cost for extra spin
    can_free_spin BOOLEAN;
    hours_until_free NUMERIC;
BEGIN
    -- Get player
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    IF player_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    -- Check if can free spin (once per 24 hours)
    can_free_spin := player_record.last_free_spin IS NULL 
                     OR player_record.last_free_spin < NOW() - INTERVAL '24 hours';
    
    IF NOT can_free_spin AND NOT use_diamonds THEN
        hours_until_free := EXTRACT(EPOCH FROM (player_record.last_free_spin + INTERVAL '24 hours' - NOW())) / 3600;
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Free spin not available yet',
            'hours_remaining', ROUND(hours_until_free, 1)
        );
    END IF;
    
    -- If using diamonds, check balance
    IF use_diamonds THEN
        IF player_record.diamonds < spin_cost THEN
            RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds');
        END IF;
        -- Deduct diamonds
        UPDATE players SET diamonds = diamonds - spin_cost WHERE id = target_player_id;
    ELSE
        -- Update last free spin
        UPDATE players SET last_free_spin = NOW() WHERE id = target_player_id;
    END IF;
    
    -- Increment spin counter
    UPDATE players SET total_spins = COALESCE(total_spins, 0) + 1 WHERE id = target_player_id;
    
    -- Get total weight
    SELECT SUM(weight) INTO total_weight FROM lucky_wheel_prizes;
    
    -- Random weighted selection
    random_weight := FLOOR(RANDOM() * total_weight);
    
    FOR prize IN SELECT * FROM lucky_wheel_prizes ORDER BY id
    LOOP
        cumulative_weight := cumulative_weight + prize.weight;
        IF random_weight < cumulative_weight THEN
            -- Found our prize! Apply reward
            IF prize.prize_type = 'cash' THEN
                UPDATE players SET cash = cash + prize.amount WHERE id = target_player_id;
            ELSIF prize.prize_type = 'diamonds' THEN
                UPDATE players SET diamonds = diamonds + prize.amount WHERE id = target_player_id;
            ELSIF prize.prize_type = 'energy' THEN
                UPDATE players SET energy = LEAST(max_energy, energy + prize.amount) WHERE id = target_player_id;
            ELSIF prize.prize_type = 'stamina' THEN
                UPDATE players SET stamina = LEAST(max_stamina, stamina + prize.amount) WHERE id = target_player_id;
            ELSIF prize.prize_type = 'respect' THEN
                UPDATE players SET respect = respect + prize.amount WHERE id = target_player_id;
            END IF;
            
            -- Log transaction
            IF prize.prize_type != 'nothing' THEN
                INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
                VALUES (target_player_id, 'lucky_wheel', prize.prize_type, prize.amount, 'Lucky Wheel: ' || prize.name);
            END IF;
            
            RETURN jsonb_build_object(
                'success', true,
                'prize_id', prize.id,
                'prize_name', prize.name,
                'prize_type', prize.prize_type,
                'amount', prize.amount,
                'icon', prize.icon,
                'color', prize.color,
                'used_diamonds', use_diamonds
            );
        END IF;
    END LOOP;
    
    -- Fallback (shouldn't happen)
    RETURN jsonb_build_object('success', true, 'prize_name', 'Try Again', 'prize_type', 'nothing', 'amount', 0);
END;
$$;

-- Function to check free spin status
CREATE OR REPLACE FUNCTION get_spin_status(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_record RECORD;
    can_free_spin BOOLEAN;
    hours_until_free NUMERIC;
BEGIN
    SELECT * INTO player_record FROM players WHERE id = target_player_id;
    
    can_free_spin := player_record.last_free_spin IS NULL 
                     OR player_record.last_free_spin < NOW() - INTERVAL '24 hours';
    
    IF can_free_spin THEN
        hours_until_free := 0;
    ELSE
        hours_until_free := EXTRACT(EPOCH FROM (player_record.last_free_spin + INTERVAL '24 hours' - NOW())) / 3600;
    END IF;
    
    RETURN jsonb_build_object(
        'can_free_spin', can_free_spin,
        'hours_remaining', GREATEST(0, ROUND(hours_until_free, 1)),
        'total_spins', COALESCE(player_record.total_spins, 0),
        'spin_cost', 10
    );
END;
$$;

-- Get all prizes for wheel display
CREATE OR REPLACE FUNCTION get_wheel_prizes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(json_build_object(
            'id', id,
            'name', name,
            'prize_type', prize_type,
            'amount', amount,
            'icon', icon,
            'color', color
        ) ORDER BY id)
        FROM lucky_wheel_prizes
    );
END;
$$;
