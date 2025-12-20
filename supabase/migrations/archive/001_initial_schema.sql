-- =====================================================
-- TON MAFIA - INITIAL DATABASE SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STATIC DEFINITION TABLES (Game Content)
-- =====================================================

-- Item definitions (weapons, equipment, contraband)
CREATE TABLE public.item_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('weapon', 'equipment', 'contraband')),
    description TEXT,
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
    attack_bonus INTEGER DEFAULT 0,
    defense_bonus INTEGER DEFAULT 0,
    income_bonus DECIMAL(5,2) DEFAULT 0,
    respect_bonus INTEGER DEFAULT 0,
    sell_price INTEGER DEFAULT 0,
    buy_price INTEGER DEFAULT 0,
    is_purchasable BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crew definitions (hireable crew members)
CREATE TABLE public.crew_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('Enforcer', 'Bodyguard', 'Hitman', 'Driver', 'Accountant')),
    description TEXT,
    attack_bonus INTEGER DEFAULT 0,
    defense_bonus INTEGER DEFAULT 0,
    special_bonus TEXT, -- e.g., "+10% Escape", "+5% Income"
    hire_cost INTEGER NOT NULL,
    upkeep_per_hour INTEGER NOT NULL,
    max_available INTEGER DEFAULT 99,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business definitions
CREATE TABLE public.business_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
    base_income_per_hour INTEGER NOT NULL,
    base_purchase_cost INTEGER NOT NULL,
    upgrade_cost_multiplier DECIMAL(3,2) DEFAULT 1.5,
    max_level INTEGER DEFAULT 10,
    collect_cooldown_minutes INTEGER DEFAULT 60,
    requires_ton BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job definitions (PvE)
CREATE TABLE public.job_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
    energy_cost INTEGER NOT NULL,
    cash_reward INTEGER NOT NULL,
    experience_reward INTEGER NOT NULL,
    respect_reward INTEGER DEFAULT 0,
    success_rate INTEGER NOT NULL CHECK (success_rate BETWEEN 0 AND 100),
    cooldown_minutes INTEGER DEFAULT 30,
    required_level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement definitions
CREATE TABLE public.achievement_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('combat', 'business', 'social', 'wealth', 'milestone')),
    target_value INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('cash', 'diamonds')),
    reward_amount INTEGER NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task definitions
CREATE TABLE public.task_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL CHECK (task_type IN ('telegram', 'daily', 'weekly', 'special', 'ad')),
    reward_type TEXT NOT NULL CHECK (reward_type IN ('cash', 'diamonds', 'energy')),
    reward_amount INTEGER NOT NULL,
    link TEXT, -- For telegram tasks
    is_active BOOLEAN DEFAULT true,
    reset_hours INTEGER, -- How often task resets (null = one-time)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reward definitions
CREATE TABLE public.daily_reward_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_number INTEGER NOT NULL UNIQUE CHECK (day_number BETWEEN 1 AND 7),
    reward_type TEXT NOT NULL CHECK (reward_type IN ('cash', 'diamonds', 'energy', 'item')),
    reward_amount INTEGER NOT NULL,
    reward_item_id UUID REFERENCES public.item_definitions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLAYER TABLES
-- =====================================================

-- Players (linked to auth.users)
CREATE TABLE public.players (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    avatar_url TEXT,
    
    -- Currency
    cash BIGINT DEFAULT 50000,
    banked_cash BIGINT DEFAULT 0,
    diamonds INTEGER DEFAULT 50,
    
    -- Stats
    respect INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    
    -- Energy/Stamina (for PvE/PvP)
    energy INTEGER DEFAULT 100,
    max_energy INTEGER DEFAULT 100,
    last_energy_update TIMESTAMPTZ DEFAULT NOW(),
    stamina INTEGER DEFAULT 50,
    max_stamina INTEGER DEFAULT 50,
    last_stamina_update TIMESTAMPTZ DEFAULT NOW(),
    
    -- Combat stats
    strength INTEGER DEFAULT 10,
    defense INTEGER DEFAULT 10,
    agility INTEGER DEFAULT 10,
    intelligence INTEGER DEFAULT 10,
    
    -- Tracking
    total_attacks INTEGER DEFAULT 0,
    total_attacks_won INTEGER DEFAULT 0,
    total_jobs_completed INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    
    -- Protection
    protection_expires_at TIMESTAMPTZ,
    newbie_shield_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
    
    -- Timestamps
    last_daily_claim TIMESTAMPTZ,
    daily_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player inventory (owned items)
CREATE TABLE public.player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.item_definitions(id),
    quantity INTEGER DEFAULT 1,
    is_equipped BOOLEAN DEFAULT false,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, item_id)
);

-- Player crew (hired members)
CREATE TABLE public.player_crew (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES public.crew_definitions(id),
    quantity INTEGER DEFAULT 1,
    hired_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, crew_id)
);

-- Player businesses (owned)
CREATE TABLE public.player_businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.business_definitions(id),
    level INTEGER DEFAULT 1,
    last_collected TIMESTAMPTZ DEFAULT NOW(),
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, business_id)
);

-- Player achievements (progress)
CREATE TABLE public.player_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievement_definitions(id),
    progress INTEGER DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    UNIQUE (player_id, achievement_id)
);

-- Player tasks (completion status)
CREATE TABLE public.player_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.task_definitions(id),
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    last_reset TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, task_id)
);

-- Player daily rewards (streak tracking)
CREATE TABLE public.player_daily_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID UNIQUE NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    last_claim_date DATE,
    days_claimed INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- Track which days claimed in current week
    week_start_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player boosters (active effects)
CREATE TABLE public.player_boosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    booster_type TEXT NOT NULL CHECK (booster_type IN ('2x_income', '2x_attack', 'shield', 'vip_pass')),
    expires_at TIMESTAMPTZ NOT NULL,
    activated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FAMILY (GANG) SYSTEM
-- =====================================================

CREATE TABLE public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    tag TEXT UNIQUE, -- Short tag like [COR]
    description TEXT,
    boss_id UUID REFERENCES public.players(id),
    treasury BIGINT DEFAULT 0,
    territory_count INTEGER DEFAULT 0,
    total_respect INTEGER DEFAULT 0,
    is_recruiting BOOLEAN DEFAULT true,
    min_level_required INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    player_id UUID UNIQUE NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Boss', 'Underboss', 'Consigliere', 'Caporegime', 'Soldier', 'Street Runner')) DEFAULT 'Street Runner',
    contribution BIGINT DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ACTIVITY LOGS
-- =====================================================

-- Attack log (PvP history)
CREATE TABLE public.attack_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attacker_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    defender_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    attacker_won BOOLEAN NOT NULL,
    cash_transferred BIGINT DEFAULT 0,
    respect_gained INTEGER DEFAULT 0,
    respect_lost INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job log (PvE history)
CREATE TABLE public.job_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.job_definitions(id),
    success BOOLEAN NOT NULL,
    cash_earned BIGINT DEFAULT 0,
    experience_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction log (all currency movements)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'job', 'attack', 'business', 'shop', 'bank', 'ad', etc.
    currency TEXT NOT NULL CHECK (currency IN ('cash', 'diamonds')),
    amount BIGINT NOT NULL, -- Positive for gains, negative for spends
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad views (for Adsgram SSV)
CREATE TABLE public.ad_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    ad_network_id TEXT UNIQUE NOT NULL, -- Prevents duplicate rewards
    reward_amount INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('cash', 'diamonds', 'energy')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_players_telegram_id ON public.players(telegram_id);
CREATE INDEX idx_players_level ON public.players(level);
CREATE INDEX idx_players_cash ON public.players(cash);
CREATE INDEX idx_players_respect ON public.players(respect);
CREATE INDEX idx_player_inventory_player ON public.player_inventory(player_id);
CREATE INDEX idx_player_businesses_player ON public.player_businesses(player_id);
CREATE INDEX idx_attack_log_attacker ON public.attack_log(attacker_id);
CREATE INDEX idx_attack_log_defender ON public.attack_log(defender_id);
CREATE INDEX idx_attack_log_created ON public.attack_log(created_at);
CREATE INDEX idx_family_members_family ON public.family_members(family_id);
CREATE INDEX idx_family_members_player ON public.family_members(player_id);
CREATE INDEX idx_ad_views_player ON public.ad_views(player_id);
CREATE INDEX idx_ad_views_network_id ON public.ad_views(ad_network_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_boosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attack_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;

-- Players can read their own data
CREATE POLICY "Players can view own data" ON public.players 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Players can update own data" ON public.players 
    FOR UPDATE USING (auth.uid() = id);

-- Players can view all players for leaderboard/attacks
CREATE POLICY "Players can view other players for game" ON public.players 
    FOR SELECT USING (true);

-- Inventory policies
CREATE POLICY "Players can view own inventory" ON public.player_inventory 
    FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Players can modify own inventory" ON public.player_inventory 
    FOR ALL USING (auth.uid() = player_id);

-- Crew policies
CREATE POLICY "Players can view own crew" ON public.player_crew 
    FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Players can modify own crew" ON public.player_crew 
    FOR ALL USING (auth.uid() = player_id);

-- Business policies
CREATE POLICY "Players can view own businesses" ON public.player_businesses 
    FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Players can modify own businesses" ON public.player_businesses 
    FOR ALL USING (auth.uid() = player_id);

-- Achievement policies
CREATE POLICY "Players can view own achievements" ON public.player_achievements 
    FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Players can modify own achievements" ON public.player_achievements 
    FOR ALL USING (auth.uid() = player_id);

-- Task policies
CREATE POLICY "Players can view own tasks" ON public.player_tasks 
    FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Players can modify own tasks" ON public.player_tasks 
    FOR ALL USING (auth.uid() = player_id);

-- Daily rewards policies
CREATE POLICY "Players can view own daily rewards" ON public.player_daily_rewards 
    FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Players can modify own daily rewards" ON public.player_daily_rewards 
    FOR ALL USING (auth.uid() = player_id);

-- Booster policies
CREATE POLICY "Players can view own boosters" ON public.player_boosters 
    FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Players can modify own boosters" ON public.player_boosters 
    FOR ALL USING (auth.uid() = player_id);

-- Family policies (everyone can see families for browsing)
CREATE POLICY "Anyone can view families" ON public.families 
    FOR SELECT USING (true);

CREATE POLICY "Boss can update family" ON public.families 
    FOR UPDATE USING (auth.uid() = boss_id);

-- Family members policies
CREATE POLICY "Anyone can view family members" ON public.family_members 
    FOR SELECT USING (true);

CREATE POLICY "Members can modify own membership" ON public.family_members 
    FOR ALL USING (auth.uid() = player_id);

-- Attack log policies (can see attacks involving self)
CREATE POLICY "Players can view own attacks" ON public.attack_log 
    FOR SELECT USING (auth.uid() = attacker_id OR auth.uid() = defender_id);

-- Job log policies
CREATE POLICY "Players can view own jobs" ON public.job_log 
    FOR SELECT USING (auth.uid() = player_id);

-- Transaction policies
CREATE POLICY "Players can view own transactions" ON public.transactions 
    FOR SELECT USING (auth.uid() = player_id);

-- Ad views policies
CREATE POLICY "Players can view own ad views" ON public.ad_views 
    FOR SELECT USING (auth.uid() = player_id);

-- Definition tables are public (read-only for everyone)
ALTER TABLE public.item_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reward_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read item definitions" ON public.item_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can read crew definitions" ON public.crew_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can read business definitions" ON public.business_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can read job definitions" ON public.job_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can read achievement definitions" ON public.achievement_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can read task definitions" ON public.task_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can read daily reward definitions" ON public.daily_reward_definitions FOR SELECT USING (true);

-- =====================================================
-- FUNCTIONS (RPCs)
-- =====================================================

-- Function to increment player cash (atomic)
CREATE OR REPLACE FUNCTION increment_cash(player_id_input UUID, amount BIGINT, source TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.players 
    SET cash = cash + amount, updated_at = NOW()
    WHERE id = player_id_input;
    
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, source, 'cash', amount, source || ': ' || amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment diamonds (atomic)
CREATE OR REPLACE FUNCTION increment_diamonds(player_id_input UUID, amount INTEGER, source TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.players 
    SET diamonds = diamonds + amount, updated_at = NOW()
    WHERE id = player_id_input;
    
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, source, 'diamonds', amount, source || ': ' || amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to spend cash (with check)
CREATE OR REPLACE FUNCTION spend_cash(player_id_input UUID, amount BIGINT, reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_cash BIGINT;
BEGIN
    SELECT cash INTO current_cash FROM public.players WHERE id = player_id_input;
    
    IF current_cash >= amount THEN
        UPDATE public.players 
        SET cash = cash - amount, updated_at = NOW()
        WHERE id = player_id_input;
        
        INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, reason, 'cash', -amount, reason || ': -' || amount);
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to spend diamonds (with check)
CREATE OR REPLACE FUNCTION spend_diamonds(player_id_input UUID, amount INTEGER, reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_diamonds INTEGER;
BEGIN
    SELECT diamonds INTO current_diamonds FROM public.players WHERE id = player_id_input;
    
    IF current_diamonds >= amount THEN
        UPDATE public.players 
        SET diamonds = diamonds - amount, updated_at = NOW()
        WHERE id = player_id_input;
        
        INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, reason, 'diamonds', -amount, reason || ': -' || amount);
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for bank deposit
CREATE OR REPLACE FUNCTION bank_deposit(player_id_input UUID, amount BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    current_cash BIGINT;
BEGIN
    SELECT cash INTO current_cash FROM public.players WHERE id = player_id_input;
    
    IF current_cash >= amount AND amount > 0 THEN
        UPDATE public.players 
        SET 
            cash = cash - amount, 
            banked_cash = banked_cash + amount,
            updated_at = NOW()
        WHERE id = player_id_input;
        
        INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'bank_deposit', 'cash', -amount, 'Deposited to vault');
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for bank withdraw
CREATE OR REPLACE FUNCTION bank_withdraw(player_id_input UUID, amount BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    current_banked BIGINT;
BEGIN
    SELECT banked_cash INTO current_banked FROM public.players WHERE id = player_id_input;
    
    IF current_banked >= amount AND amount > 0 THEN
        UPDATE public.players 
        SET 
            cash = cash + amount, 
            banked_cash = banked_cash - amount,
            updated_at = NOW()
        WHERE id = player_id_input;
        
        INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
        VALUES (player_id_input, 'bank_withdraw', 'cash', amount, 'Withdrawn from vault');
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use energy
CREATE OR REPLACE FUNCTION use_energy(player_id_input UUID, amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_energy INTEGER;
BEGIN
    -- First regenerate energy based on time passed
    PERFORM regenerate_energy(player_id_input);
    
    SELECT energy INTO current_energy FROM public.players WHERE id = player_id_input;
    
    IF current_energy >= amount THEN
        UPDATE public.players 
        SET energy = energy - amount, updated_at = NOW()
        WHERE id = player_id_input;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to regenerate energy
CREATE OR REPLACE FUNCTION regenerate_energy(player_id_input UUID)
RETURNS void AS $$
DECLARE
    last_update TIMESTAMPTZ;
    current_energy INTEGER;
    max_e INTEGER;
    minutes_passed INTEGER;
    energy_to_add INTEGER;
BEGIN
    SELECT last_energy_update, energy, max_energy 
    INTO last_update, current_energy, max_e 
    FROM public.players 
    WHERE id = player_id_input;
    
    minutes_passed := EXTRACT(EPOCH FROM (NOW() - last_update)) / 60;
    energy_to_add := minutes_passed; -- 1 energy per minute
    
    IF energy_to_add > 0 AND current_energy < max_e THEN
        UPDATE public.players 
        SET 
            energy = LEAST(max_e, current_energy + energy_to_add),
            last_energy_update = NOW()
        WHERE id = player_id_input;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use stamina
CREATE OR REPLACE FUNCTION use_stamina(player_id_input UUID, amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_stamina INTEGER;
BEGIN
    -- First regenerate stamina based on time passed
    PERFORM regenerate_stamina(player_id_input);
    
    SELECT stamina INTO current_stamina FROM public.players WHERE id = player_id_input;
    
    IF current_stamina >= amount THEN
        UPDATE public.players 
        SET stamina = stamina - amount, updated_at = NOW()
        WHERE id = player_id_input;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to regenerate stamina
CREATE OR REPLACE FUNCTION regenerate_stamina(player_id_input UUID)
RETURNS void AS $$
DECLARE
    last_update TIMESTAMPTZ;
    current_stamina INTEGER;
    max_s INTEGER;
    minutes_passed INTEGER;
    stamina_to_add INTEGER;
BEGIN
    SELECT last_stamina_update, stamina, max_stamina 
    INTO last_update, current_stamina, max_s 
    FROM public.players 
    WHERE id = player_id_input;
    
    minutes_passed := EXTRACT(EPOCH FROM (NOW() - last_update)) / 60;
    stamina_to_add := minutes_passed / 4; -- 1 stamina per 4 minutes
    
    IF stamina_to_add > 0 AND current_stamina < max_s THEN
        UPDATE public.players 
        SET 
            stamina = LEAST(max_s, current_stamina + stamina_to_add),
            last_stamina_update = NOW()
        WHERE id = player_id_input;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(leaderboard_type TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    player_id UUID,
    username TEXT,
    value BIGINT
) AS $$
BEGIN
    IF leaderboard_type = 'networth' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY (p.cash + p.banked_cash) DESC) as rank,
            p.id as player_id,
            p.username,
            (p.cash + p.banked_cash) as value
        FROM public.players p
        ORDER BY value DESC
        LIMIT limit_count;
    ELSIF leaderboard_type = 'kills' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.total_kills DESC) as rank,
            p.id as player_id,
            p.username,
            p.total_kills::BIGINT as value
        FROM public.players p
        ORDER BY value DESC
        LIMIT limit_count;
    ELSIF leaderboard_type = 'respect' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.respect DESC) as rank,
            p.id as player_id,
            p.username,
            p.respect::BIGINT as value
        FROM public.players p
        ORDER BY value DESC
        LIMIT limit_count;
    ELSE
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience DESC) as rank,
            p.id as player_id,
            p.username,
            p.level::BIGINT as value
        FROM public.players p
        ORDER BY p.level DESC, p.experience DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate net worth
CREATE OR REPLACE FUNCTION calculate_net_worth(player_id_input UUID)
RETURNS BIGINT AS $$
DECLARE
    total BIGINT;
BEGIN
    SELECT 
        COALESCE(p.cash, 0) + 
        COALESCE(p.banked_cash, 0) +
        COALESCE((
            SELECT SUM(bd.base_purchase_cost * pb.level)
            FROM public.player_businesses pb
            JOIN public.business_definitions bd ON pb.business_id = bd.id
            WHERE pb.player_id = player_id_input
        ), 0)
    INTO total
    FROM public.players p
    WHERE p.id = player_id_input;
    
    RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER families_updated_at
    BEFORE UPDATE ON public.families
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
