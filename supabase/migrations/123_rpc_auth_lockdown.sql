-- =====================================================
-- RPC AUTH LOCKDOWN MIGRATION
-- =====================================================
-- Security: Add auth.uid() validation to all player-modifying RPCs
-- This prevents attackers from calling RPCs with spoofed player IDs
-- 
-- CRITICAL: After this migration, any RPC call with a player_id that
--           doesn't match auth.uid() will be rejected as "Unauthorized"
-- =====================================================

SET search_path = public;

-- =====================================================
-- DROP EXISTING FUNCTIONS (to allow return type changes)
-- =====================================================
-- Use a DO block to programmatically drop all overloads
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all overloads of the functions we're updating
    FOR func_record IN
        SELECT oid::regprocedure::text as func_sig
        FROM pg_proc
        WHERE proname IN (
            'spend_diamonds', 'spend_cash', 'bank_deposit', 'bank_withdraw',
            'activate_booster', 'perform_pvp_attack', 'contribute_to_treasury',
            'contribute_contraband_to_treasury', 'claim_daily_reward', 
            'spin_lucky_wheel'
        )
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- =====================================================
-- 1. INCREMENT DIAMONDS (Critical - TON purchases)
-- =====================================================
CREATE OR REPLACE FUNCTION increment_diamonds(player_id_input UUID, amount INTEGER, source TEXT)
RETURNS void AS $$
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.players 
    SET diamonds = diamonds + amount, updated_at = NOW()
    WHERE id = player_id_input;
    
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, source, 'diamonds', amount, source || ': ' || amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. INCREMENT CASH
-- =====================================================
CREATE OR REPLACE FUNCTION increment_cash(player_id_input UUID, amount BIGINT, source TEXT)
RETURNS void AS $$
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.players 
    SET cash = cash + amount, updated_at = NOW()
    WHERE id = player_id_input;
    
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, source, 'cash', amount, source || ': ' || amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. SPEND DIAMONDS
-- =====================================================
CREATE OR REPLACE FUNCTION spend_diamonds(player_id_input UUID, amount INTEGER, reason TEXT)
RETURNS JSONB AS $$
DECLARE
    current_diamonds INTEGER;
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT diamonds INTO current_diamonds FROM public.players WHERE id = player_id_input;
    
    IF current_diamonds IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    IF current_diamonds < amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient diamonds');
    END IF;
    
    UPDATE public.players 
    SET diamonds = diamonds - amount, updated_at = NOW()
    WHERE id = player_id_input;
    
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'spend', 'diamonds', -amount, reason);
    
    RETURN jsonb_build_object('success', true, 'remaining', current_diamonds - amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. SPEND CASH
-- =====================================================
CREATE OR REPLACE FUNCTION spend_cash(player_id_input UUID, amount BIGINT, reason TEXT)
RETURNS JSONB AS $$
DECLARE
    current_cash BIGINT;
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT cash INTO current_cash FROM public.players WHERE id = player_id_input;
    
    IF current_cash IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;
    
    IF current_cash < amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient cash');
    END IF;
    
    UPDATE public.players 
    SET cash = cash - amount, updated_at = NOW()
    WHERE id = player_id_input;
    
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'spend', 'cash', -amount, reason);
    
    RETURN jsonb_build_object('success', true, 'remaining', current_cash - amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. BANK DEPOSIT
-- =====================================================
CREATE OR REPLACE FUNCTION bank_deposit(player_id_input UUID, amount BIGINT)
RETURNS JSONB AS $$
DECLARE
    current_cash BIGINT;
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT cash INTO current_cash FROM public.players WHERE id = player_id_input;
    
    IF current_cash < amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient cash');
    END IF;
    
    UPDATE public.players 
    SET cash = cash - amount,
        banked_cash = banked_cash + amount,
        updated_at = NOW()
    WHERE id = player_id_input;
    
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'bank_deposit', 'cash', amount, 'Deposited to bank');
    
    RETURN jsonb_build_object('success', true, 'deposited', amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. BANK WITHDRAW
-- =====================================================
CREATE OR REPLACE FUNCTION bank_withdraw(player_id_input UUID, amount BIGINT)
RETURNS JSONB AS $$
DECLARE
    current_banked BIGINT;
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT banked_cash INTO current_banked FROM public.players WHERE id = player_id_input;
    
    IF current_banked < amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient banked cash');
    END IF;
    
    UPDATE public.players 
    SET banked_cash = banked_cash - amount,
        cash = cash + amount,
        updated_at = NOW()
    WHERE id = player_id_input;
    
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'bank_withdraw', 'cash', amount, 'Withdrawn from bank');
    
    RETURN jsonb_build_object('success', true, 'withdrawn', amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. ACTIVATE BOOSTER
-- =====================================================
CREATE OR REPLACE FUNCTION activate_booster(
    player_id_input UUID,
    booster_type_input TEXT,
    duration_hours_input INTEGER DEFAULT 24
)
RETURNS JSONB AS $$
DECLARE
    existing_booster RECORD;
    new_expires TIMESTAMPTZ;
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Check for existing booster of same type
    SELECT * INTO existing_booster
    FROM player_boosters
    WHERE player_id = player_id_input
    AND booster_type = booster_type_input
    AND expires_at > NOW();
    
    IF existing_booster IS NOT NULL THEN
        -- Extend existing booster
        new_expires := existing_booster.expires_at + (duration_hours_input || ' hours')::INTERVAL;
        
        UPDATE player_boosters
        SET expires_at = new_expires
        WHERE id = existing_booster.id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Booster extended!',
            'expires_at', new_expires,
            'extended', true
        );
    ELSE
        -- Create new booster
        new_expires := NOW() + (duration_hours_input || ' hours')::INTERVAL;
        
        INSERT INTO player_boosters (player_id, booster_type, expires_at)
        VALUES (player_id_input, booster_type_input, new_expires);
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Booster activated!',
            'expires_at', new_expires,
            'extended', false
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. PERFORM PVP ATTACK (validates attacker = auth.uid())
-- =====================================================
-- Note: perform_pvp_attack is defined in migration 121, we update here
-- The attacker_id_input must match auth.uid()
CREATE OR REPLACE FUNCTION perform_pvp_attack(
    attacker_id_input UUID,
    defender_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    attacker_record RECORD;
    defender_record RECORD;
    attacker_strength INTEGER;
    defender_strength INTEGER;
    attack_success BOOLEAN;
    cash_stolen BIGINT;
    respect_change INTEGER;
    bank_theft BIGINT;
    npp_hours INTEGER := 48;
    cooldown_hours INTEGER := 3;
    last_attack_time TIMESTAMPTZ;
    has_shield BOOLEAN;
    attack_fee BIGINT;
    revenge_multiplier NUMERIC := 1.0;
    is_revenge BOOLEAN := false;
    revenge_window_hours INTEGER := 24;
BEGIN
    -- SECURITY: Validate caller identity (attacker must be the authenticated user)
    IF attacker_id_input IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Get attacker data
    SELECT * INTO attacker_record FROM players WHERE id = attacker_id_input;
    IF attacker_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Attacker not found');
    END IF;
    
    -- Get defender data
    SELECT * INTO defender_record FROM players WHERE id = defender_id_input;
    IF defender_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target not found');
    END IF;
    
    -- Check attacker NPP
    IF attacker_record.newbie_shield_expires_at > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'You are under New Player Protection. Attacking will remove it.',
            'npp_active', true
        );
    END IF;
    
    -- Check defender NPP
    IF defender_record.newbie_shield_expires_at > NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target is under New Player Protection');
    END IF;
    
    -- Check defender shield booster
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = defender_id_input 
        AND booster_type = 'shield' 
        AND expires_at > NOW()
    ) INTO has_shield;
    
    IF has_shield THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target is protected by a shield');
    END IF;
    
    -- Check cooldown (3 hours per target)
    SELECT MAX(attack_time) INTO last_attack_time
    FROM pvp_attacks 
    WHERE attacker_id = attacker_id_input 
    AND defender_id = defender_id_input;
    
    IF last_attack_time IS NOT NULL AND last_attack_time > NOW() - (cooldown_hours || ' hours')::INTERVAL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Cooldown active against this target',
            'cooldown_remaining_minutes', EXTRACT(EPOCH FROM (last_attack_time + (cooldown_hours || ' hours')::INTERVAL - NOW())) / 60
        );
    END IF;
    
    -- Check stamina
    IF attacker_record.stamina < 5 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;
    
    -- Calculate attack fee (0.5% of attacker wallet)
    attack_fee := GREATEST(100, (attacker_record.cash * 0.005)::BIGINT);
    
    -- Check if attacker can afford fee
    IF attacker_record.cash < attack_fee THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot afford attack fee: $' || attack_fee);
    END IF;
    
    -- Calculate combat (simplified)
    attacker_strength := attacker_record.strength + (attacker_record.level * 2);
    defender_strength := defender_record.defense + (defender_record.level * 2);
    
    -- Random factor
    attack_success := (attacker_strength + (random() * 20)::INTEGER) > (defender_strength + (random() * 15)::INTEGER);
    
    -- Deduct stamina and attack fee
    UPDATE players SET 
        stamina = stamina - 5,
        cash = cash - attack_fee,
        total_attacks = total_attacks + 1
    WHERE id = attacker_id_input;
    
    IF attack_success THEN
        -- Successful attack
        cash_stolen := GREATEST(0, (defender_record.cash * 0.1)::BIGINT); -- 10% of wallet
        bank_theft := (defender_record.banked_cash * 0.15)::BIGINT; -- 15% of bank
        respect_change := 5 + (defender_record.level / 2);
        
        -- Transfer cash
        UPDATE players SET 
            cash = cash - cash_stolen,
            banked_cash = banked_cash - bank_theft
        WHERE id = defender_id_input;
        
        UPDATE players SET 
            cash = cash + cash_stolen + bank_theft,
            respect = respect + respect_change,
            total_attacks_won = total_attacks_won + 1
        WHERE id = attacker_id_input;
        
        -- Record attack
        INSERT INTO pvp_attacks (attacker_id, defender_id, success, cash_stolen, respect_gained)
        VALUES (attacker_id_input, defender_id_input, true, cash_stolen + bank_theft, respect_change);
        
        -- Create notification
        INSERT INTO notifications (player_id, notification_type, title, message, related_player_id)
        VALUES (
            defender_id_input, 
            'pvp_loss', 
            'You were attacked!',
            (SELECT COALESCE(username, first_name, 'Unknown') FROM players WHERE id = attacker_id_input) || ' attacked you and stole $' || (cash_stolen + bank_theft),
            attacker_id_input
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'won', true,
            'cash_stolen', cash_stolen + bank_theft,
            'respect_gained', respect_change,
            'attack_fee', attack_fee
        );
    ELSE
        -- Failed attack
        respect_change := 2;
        
        UPDATE players SET respect = respect + respect_change WHERE id = defender_id_input;
        
        -- Record attack
        INSERT INTO pvp_attacks (attacker_id, defender_id, success, cash_stolen, respect_gained)
        VALUES (attacker_id_input, defender_id_input, false, 0, 0);
        
        RETURN jsonb_build_object(
            'success', true,
            'won', false,
            'cash_stolen', 0,
            'attack_fee', attack_fee,
            'message', 'Attack failed! Target defended successfully.'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. CONTRIBUTE TO TREASURY
-- =====================================================
CREATE OR REPLACE FUNCTION contribute_to_treasury(
    contributor_id UUID,
    contribution_amount BIGINT
)
RETURNS JSONB AS $$
DECLARE
    player_family_id UUID;
    player_cash BIGINT;
BEGIN
    -- SECURITY: Validate caller identity
    IF contributor_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Get player's family and cash
    SELECT fm.family_id, p.cash INTO player_family_id, player_cash
    FROM family_members fm
    JOIN players p ON p.id = fm.player_id
    WHERE fm.player_id = contributor_id;
    
    IF player_family_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family');
    END IF;
    
    IF player_cash < contribution_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient cash');
    END IF;
    
    -- Deduct from player
    UPDATE players SET cash = cash - contribution_amount WHERE id = contributor_id;
    
    -- Add to treasury
    UPDATE families SET treasury = treasury + contribution_amount WHERE id = player_family_id;
    
    -- Update member contribution
    UPDATE family_members 
    SET total_contribution = total_contribution + contribution_amount
    WHERE player_id = contributor_id;
    
    RETURN jsonb_build_object('success', true, 'contributed', contribution_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. CONTRIBUTE CONTRABAND TO TREASURY
-- =====================================================
CREATE OR REPLACE FUNCTION contribute_contraband_to_treasury(
    player_id_input UUID,
    contraband_id_input UUID,
    quantity_input INTEGER
)
RETURNS JSONB AS $$
DECLARE
    family_id_var UUID;
    item_value BIGINT;
    total_value BIGINT;
    owned_qty INTEGER;
    daily_contributed BIGINT;
    daily_cap BIGINT := 100000;
    remaining_cap BIGINT;
    actual_value BIGINT;
    tax_amount BIGINT;
    net_contribution BIGINT;
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Get player's family
    SELECT family_id INTO family_id_var FROM family_members WHERE player_id = player_id_input;
    
    IF family_id_var IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be in a family');
    END IF;
    
    -- Get contraband value
    SELECT base_price INTO item_value FROM item_definitions WHERE id = contraband_id_input AND category = 'contraband';
    
    IF item_value IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid contraband');
    END IF;
    
    -- Check ownership
    SELECT quantity INTO owned_qty FROM player_inventory 
    WHERE player_id = player_id_input AND item_id = contraband_id_input;
    
    IF owned_qty IS NULL OR owned_qty < quantity_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient contraband');
    END IF;
    
    -- Calculate total value
    total_value := item_value * quantity_input;
    
    -- Check daily cap (reset at midnight UTC)
    SELECT COALESCE(SUM(amount), 0) INTO daily_contributed
    FROM family_contributions 
    WHERE player_id = player_id_input 
    AND contribution_type = 'contraband'
    AND contributed_at > DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC');
    
    remaining_cap := daily_cap - daily_contributed;
    
    IF remaining_cap <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Daily contribution limit reached ($100,000)');
    END IF;
    
    -- Cap the contribution if needed
    actual_value := LEAST(total_value, remaining_cap);
    
    -- Apply 10% family tax
    tax_amount := (actual_value * 0.1)::BIGINT;
    net_contribution := actual_value - tax_amount;
    
    -- Remove contraband
    UPDATE player_inventory SET quantity = quantity - quantity_input
    WHERE player_id = player_id_input AND item_id = contraband_id_input;
    
    -- Add to treasury
    UPDATE families SET treasury = treasury + net_contribution WHERE id = family_id_var;
    
    -- Record contribution
    INSERT INTO family_contributions (family_id, player_id, amount, contribution_type)
    VALUES (family_id_var, player_id_input, actual_value, 'contraband');
    
    -- Update member contribution total
    UPDATE family_members 
    SET total_contribution = total_contribution + net_contribution
    WHERE player_id = player_id_input;
    
    RETURN jsonb_build_object(
        'success', true, 
        'contributed', net_contribution,
        'tax_paid', tax_amount,
        'remaining_daily_cap', remaining_cap - actual_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. CLAIM DAILY REWARD
-- =====================================================
CREATE OR REPLACE FUNCTION claim_daily_reward(target_player_id UUID)
RETURNS JSONB AS $$
DECLARE
    reward_record RECORD;
    player_status RECORD;
    current_day INTEGER;
    milestone_bonus JSONB := NULL;
BEGIN
    -- SECURITY: Validate caller identity
    IF target_player_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Get daily reward status
    SELECT * INTO player_status FROM player_daily_rewards WHERE player_id = target_player_id;
    
    -- Check if can claim (logic simplified)
    IF player_status IS NOT NULL AND player_status.last_claim_date = CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already claimed today');
    END IF;
    
    -- Calculate current day (1-7 cycle)
    current_day := COALESCE(player_status.current_streak % 7 + 1, 1);
    
    -- Get reward for this day
    SELECT * INTO reward_record FROM daily_reward_definitions WHERE day_number = current_day;
    
    IF reward_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reward not found');
    END IF;
    
    -- Apply reward
    IF reward_record.reward_type = 'cash' THEN
        UPDATE players SET cash = cash + reward_record.reward_amount WHERE id = target_player_id;
    ELSIF reward_record.reward_type = 'diamonds' THEN
        UPDATE players SET diamonds = diamonds + reward_record.reward_amount WHERE id = target_player_id;
    ELSIF reward_record.reward_type = 'energy' THEN
        UPDATE players SET energy = LEAST(max_energy, energy + reward_record.reward_amount) WHERE id = target_player_id;
    END IF;
    
    -- Update or insert player daily rewards tracking
    INSERT INTO player_daily_rewards (player_id, current_streak, last_claim_date)
    VALUES (target_player_id, 1, CURRENT_DATE)
    ON CONFLICT (player_id) DO UPDATE SET
        current_streak = CASE 
            WHEN player_daily_rewards.last_claim_date = CURRENT_DATE - 1 THEN player_daily_rewards.current_streak + 1
            ELSE 1
        END,
        last_claim_date = CURRENT_DATE;
    
    RETURN jsonb_build_object(
        'success', true,
        'day', current_day,
        'reward_type', reward_record.reward_type,
        'reward_amount', reward_record.reward_amount,
        'milestone_bonus', milestone_bonus
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. COLLECT BUSINESS INCOME (already has player_id check)
-- =====================================================
-- Already updated in migration 046, adding auth check here
CREATE OR REPLACE FUNCTION collect_business_income(
    player_id_input UUID,
    player_business_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    business_record RECORD;
    hours_elapsed NUMERIC;
    base_income BIGINT;
    final_income BIGINT;
    has_income_boost BOOLEAN;
    cooldown_minutes INTEGER;
    remaining_cooldown INTEGER;
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Get business details
    SELECT pb.*, bd.base_income_per_hour, bd.collect_cooldown_minutes, bd.name as business_name
    INTO business_record
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.id = player_business_id_input AND pb.player_id = player_id_input;

    IF business_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found or not owned');
    END IF;

    cooldown_minutes := COALESCE(business_record.collect_cooldown_minutes, 60);
    
    -- Check cooldown
    IF business_record.last_collected > NOW() - (cooldown_minutes || ' minutes')::INTERVAL THEN
        remaining_cooldown := EXTRACT(EPOCH FROM (
            business_record.last_collected + (cooldown_minutes || ' minutes')::INTERVAL - NOW()
        ))::INTEGER / 60;
        
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Cooldown active',
            'minutes_remaining', remaining_cooldown
        );
    END IF;

    -- Calculate hours elapsed (capped at 24 hours)
    hours_elapsed := LEAST(24, EXTRACT(EPOCH FROM (NOW() - business_record.last_collected)) / 3600);
    
    -- Calculate base income
    base_income := (business_record.base_income_per_hour * business_record.level * hours_elapsed)::BIGINT;
    
    -- Check for 2x income booster
    has_income_boost := has_active_booster(player_id_input, '2x_income');
    
    IF has_income_boost THEN
        final_income := base_income * 2;
    ELSE
        final_income := base_income;
    END IF;

    -- Update player cash and last_collected
    UPDATE players SET cash = cash + final_income WHERE id = player_id_input;
    UPDATE player_businesses SET last_collected = NOW() WHERE id = player_business_id_input;

    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'business_income', 'cash', final_income, 
            'Collected from ' || business_record.business_name || 
            CASE WHEN has_income_boost THEN ' (2x BOOST!)' ELSE '' END);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Income collected!',
        'income', final_income,
        'base_income', base_income,
        'boosted', has_income_boost,
        'hours_accumulated', ROUND(hours_elapsed, 1)
    );
END;
$$;

-- =====================================================
-- 13. SPIN LUCKY WHEEL
-- =====================================================
CREATE OR REPLACE FUNCTION spin_lucky_wheel(player_id_input UUID)
RETURNS JSONB AS $$
DECLARE
    spin_cost INTEGER := 10; -- diamonds
    current_diamonds INTEGER;
    win_amount INTEGER;
    win_type TEXT;
BEGIN
    -- SECURITY: Validate caller identity
    IF player_id_input IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT diamonds INTO current_diamonds FROM players WHERE id = player_id_input;
    
    IF current_diamonds < spin_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough diamonds');
    END IF;
    
    -- Deduct cost
    UPDATE players SET diamonds = diamonds - spin_cost WHERE id = player_id_input;
    
    -- Random wheel logic (simplified)
    WITH random_result AS (
        SELECT floor(random() * 100)::INTEGER as r
    )
    SELECT 
        CASE 
            WHEN r < 40 THEN 'cash'
            WHEN r < 70 THEN 'diamonds'
            ELSE 'energy'
        END,
        CASE 
            WHEN r < 40 THEN (1000 + floor(random() * 4000))::INTEGER
            WHEN r < 70 THEN (5 + floor(random() * 20))::INTEGER
            ELSE (10 + floor(random() * 40))::INTEGER
        END
    INTO win_type, win_amount
    FROM random_result;
    
    -- Apply winnings
    IF win_type = 'cash' THEN
        UPDATE players SET cash = cash + win_amount WHERE id = player_id_input;
    ELSIF win_type = 'diamonds' THEN
        UPDATE players SET diamonds = diamonds + win_amount WHERE id = player_id_input;
    ELSE
        UPDATE players SET energy = LEAST(max_energy, energy + win_amount) WHERE id = player_id_input;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'win_type', win_type,
        'win_amount', win_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION COMMENT
-- =====================================================
COMMENT ON FUNCTION increment_diamonds(UUID, INTEGER, TEXT) IS 'Auth-locked: Requires auth.uid() = player_id_input';
COMMENT ON FUNCTION increment_cash(UUID, BIGINT, TEXT) IS 'Auth-locked: Requires auth.uid() = player_id_input';
COMMENT ON FUNCTION spend_diamonds(UUID, INTEGER, TEXT) IS 'Auth-locked: Requires auth.uid() = player_id_input';
COMMENT ON FUNCTION spend_cash(UUID, BIGINT, TEXT) IS 'Auth-locked: Requires auth.uid() = player_id_input';
COMMENT ON FUNCTION bank_deposit(UUID, BIGINT) IS 'Auth-locked: Requires auth.uid() = player_id_input';
COMMENT ON FUNCTION bank_withdraw(UUID, BIGINT) IS 'Auth-locked: Requires auth.uid() = player_id_input';
COMMENT ON FUNCTION activate_booster(UUID, TEXT, INTEGER) IS 'Auth-locked: Requires auth.uid() = player_id_input';
COMMENT ON FUNCTION perform_pvp_attack(UUID, UUID) IS 'Auth-locked: Requires auth.uid() = attacker_id_input';
COMMENT ON FUNCTION contribute_to_treasury(UUID, BIGINT) IS 'Auth-locked: Requires auth.uid() = contributor_id';
COMMENT ON FUNCTION contribute_contraband_to_treasury(UUID, UUID, INTEGER) IS 'Auth-locked: Requires auth.uid() = player_id_input';
COMMENT ON FUNCTION claim_daily_reward(UUID) IS 'Auth-locked: Requires auth.uid() = target_player_id';
COMMENT ON FUNCTION collect_business_income(UUID, UUID) IS 'Auth-locked: Requires auth.uid() = player_id_input';
COMMENT ON FUNCTION spin_lucky_wheel(UUID) IS 'Auth-locked: Requires auth.uid() = player_id_input';
