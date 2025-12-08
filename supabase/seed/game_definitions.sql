-- =====================================================
-- TON MAFIA - SEED DATA
-- =====================================================
-- Run this AFTER the initial schema migration
-- =====================================================

-- =====================================================
-- ITEM DEFINITIONS
-- =====================================================

-- Weapons
INSERT INTO public.item_definitions (name, category, description, rarity, attack_bonus, defense_bonus, sell_price, buy_price, is_purchasable) VALUES
('Brass Knuckles', 'weapon', 'Basic street fighting gear', 'common', 5, 0, 250, 500, true),
('Switchblade', 'weapon', 'Concealable blade for close combat', 'common', 3, 0, 150, 300, true),
('Sawed-off Shotgun', 'weapon', 'Short range devastation', 'uncommon', 10, 0, 2000, 4000, true),
('Tommy Gun', 'weapon', 'The classic gangster weapon', 'rare', 15, 0, 5000, 10000, true),
('Golden Revolver', 'weapon', 'A symbol of power and wealth', 'legendary', 25, 5, 25000, 50000, false)
ON CONFLICT (name) DO NOTHING;

-- Equipment
INSERT INTO public.item_definitions (name, category, description, rarity, attack_bonus, defense_bonus, income_bonus, sell_price, buy_price, is_purchasable) VALUES
('Fedora Hat', 'equipment', 'The classic gangster look', 'uncommon', 0, 5, 0, 1000, 2000, true),
('Armored Vest', 'equipment', 'Protection against bullets', 'rare', 0, 20, 0, 5000, 10000, true),
('Gold Watch', 'equipment', 'Increases business income', 'legendary', 0, 0, 10, 15000, 30000, false),
('Silk Suit', 'equipment', 'Look like a real boss', 'uncommon', 0, 3, 5, 2500, 5000, true),
('Diamond Ring', 'equipment', 'A sign of respect', 'rare', 2, 2, 5, 7500, 15000, false)
ON CONFLICT (name) DO NOTHING;

-- Contraband
INSERT INTO public.item_definitions (name, category, description, rarity, sell_price) VALUES
('Whiskey Crate', 'contraband', 'Bootleg liquor ready to sell', 'common', 3500),
('Cuban Cigars', 'contraband', 'Premium contraband from the islands', 'uncommon', 2500),
('Morphine Vials', 'contraband', 'High-value medical supplies', 'rare', 8000),
('Counterfeit Bills', 'contraband', 'Fake currency for laundering', 'uncommon', 4000),
('Stolen Jewelry', 'contraband', 'Hot goods from a heist', 'rare', 12000)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- CREW DEFINITIONS
-- =====================================================

INSERT INTO public.crew_definitions (name, type, description, attack_bonus, defense_bonus, special_bonus, hire_cost, upkeep_per_hour, max_available) VALUES
('Street Thug', 'Enforcer', 'Basic muscle for your operations', 2, 1, NULL, 1000, 50, 99),
('Bodyguard', 'Bodyguard', 'Protects you from attacks', 1, 5, NULL, 5000, 150, 25),
('Professional Hitman', 'Hitman', 'Expert assassin for special jobs', 10, 2, NULL, 25000, 500, 5),
('Getaway Driver', 'Driver', 'Improves escape chance on failed attacks', 0, 3, '+10% Escape', 8000, 200, 15),
('Crooked Accountant', 'Accountant', 'Reduces upkeep costs by 5%', 0, 0, '-5% Upkeep', 50000, 100, 3),
('Enforcer Captain', 'Enforcer', 'Leads your enforcers, boosting their effectiveness', 15, 5, '+10% Crew Attack', 75000, 750, 2),
('Personal Guard', 'Bodyguard', 'Elite protection, very hard to kill', 3, 15, '+25% Defense', 100000, 1000, 1)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- BUSINESS DEFINITIONS
-- =====================================================

INSERT INTO public.business_definitions (name, description, tier, base_income_per_hour, base_purchase_cost, upgrade_cost_multiplier, max_level, collect_cooldown_minutes, requires_ton, image_url) VALUES
('Protection Racket', 'Collect protection money from local businesses', 1, 3000, 15000, 1.3, 10, 30, false, '/images/businesses/protectionracket.png'),
('Speakeasy', 'Underground bar serving bootleg liquor', 2, 5000, 25000, 1.4, 10, 60, false, '/images/businesses/speakeasy.png'),
('Nightclub', 'Jazz club and front for money laundering', 2, 8000, 50000, 1.4, 10, 90, false, '/images/businesses/nightclub.png'),
('Casino', 'Illegal gambling den for high rollers', 3, 15000, 75000, 1.5, 10, 120, false, '/images/businesses/casino.png'),
('Loan Sharking', 'High-interest loans to desperate borrowers', 3, 12000, 80000, 1.5, 10, 180, false, '/images/businesses/loansharking.png'),
('Smuggling Route', 'Import contraband from overseas', 4, 25000, 150000, 1.7, 10, 240, false, '/images/businesses/smugglingroute.png'),
('Black Market', 'Exclusive underground trading network', 5, 50000, 500000, 2.0, 10, 360, true, '/images/businesses/blackmarket.png')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- JOB DEFINITIONS
-- =====================================================

INSERT INTO public.job_definitions (name, description, tier, energy_cost, cash_reward, experience_reward, respect_reward, success_rate, cooldown_minutes, required_level) VALUES
('Pickpocket', 'Steal from distracted tourists', 1, 2, 150, 2, 0, 95, 5, 1),
('Mug a Pedestrian', 'Quick cash from an unsuspecting victim', 1, 3, 300, 4, 1, 90, 10, 1),
('Rob a Corner Store', 'Easy target with quick getaway', 2, 5, 750, 10, 2, 85, 15, 3),
('Collect Protection', 'Shake down local businesses for payments', 2, 10, 5000, 25, 5, 90, 30, 5),
('Hijack Delivery', 'Intercept a shipment of valuable goods', 3, 15, 8000, 40, 10, 80, 45, 8),
('Smuggle Goods', 'Transport contraband across the docks', 3, 25, 15000, 60, 15, 75, 60, 10),
('Hit Contract', 'Eliminate a rival for a paying client', 4, 35, 25000, 100, 25, 70, 120, 15),
('Rob the Bank', 'High-risk heist on First National', 4, 50, 50000, 200, 50, 65, 240, 20),
('Casino Heist', 'The big score at the downtown casino', 5, 75, 100000, 500, 100, 50, 480, 30)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ACHIEVEMENT DEFINITIONS
-- =====================================================

INSERT INTO public.achievement_definitions (name, description, category, target_value, reward_type, reward_amount, icon) VALUES
-- Combat
('First Blood', 'Win your first attack', 'combat', 1, 'cash', 10000, 'swords'),
('Street Fighter', 'Win 10 attacks', 'combat', 10, 'cash', 50000, 'swords'),
('Warmonger', 'Win 50 attacks', 'combat', 50, 'diamonds', 50, 'swords'),
('Untouchable', 'Successfully defend 5 attacks', 'combat', 5, 'diamonds', 25, 'shield'),
('Survivor', 'Defend 25 attacks', 'combat', 25, 'diamonds', 100, 'shield'),
-- Business
('Entrepreneur', 'Own your first business', 'business', 1, 'cash', 25000, 'briefcase'),
('Business Owner', 'Own 3 businesses', 'business', 3, 'diamonds', 50, 'briefcase'),
('Tycoon', 'Own 5 businesses', 'business', 5, 'diamonds', 100, 'briefcase'),
('Empire Builder', 'Upgrade any business to level 10', 'business', 10, 'diamonds', 150, 'building'),
-- Social
('Made Man', 'Join a family', 'social', 1, 'cash', 15000, 'users'),
('Family First', 'Contribute $100K to your family', 'social', 100000, 'diamonds', 50, 'users'),
('Godfather', 'Become the Boss of a family', 'social', 1, 'diamonds', 200, 'crown'),
-- Wealth
('Getting Started', 'Earn $100,000 total', 'wealth', 100000, 'cash', 10000, 'dollar'),
('First Million', 'Earn $1,000,000 total', 'wealth', 1000000, 'diamonds', 50, 'dollar'),
('Multi-Millionaire', 'Earn $10,000,000 total', 'wealth', 10000000, 'diamonds', 200, 'dollar'),
-- Milestones
('Newcomer', 'Reach level 5', 'milestone', 5, 'cash', 5000, 'star'),
('Rising Star', 'Reach level 10', 'milestone', 10, 'diamonds', 25, 'star'),
('Veteran', 'Reach level 25', 'milestone', 25, 'diamonds', 75, 'star'),
('Legend', 'Reach level 50', 'milestone', 50, 'diamonds', 200, 'crown')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- TASK DEFINITIONS
-- =====================================================

-- Clear existing tasks and re-insert (no unique constraint on title)
-- Must delete player_tasks first due to foreign key constraint
DELETE FROM public.player_tasks WHERE true;
DELETE FROM public.task_definitions WHERE true;

INSERT INTO public.task_definitions (title, description, task_type, reward_type, reward_amount, link, is_active, reset_hours) VALUES
-- Telegram Partner Tasks (one-time)
('Join TON Official', 'Join the official TON community channel', 'telegram', 'diamonds', 50, 'https://t.me/ton_blockchain', true, NULL),
('Join Crypto News', 'Subscribe to daily crypto updates', 'telegram', 'cash', 25000, 'https://t.me/cryptonews', true, NULL),
('Follow The Syndicate', 'Join our official game channel', 'telegram', 'diamonds', 100, 'https://t.me/syndicate_game', true, NULL),
('Join Trading Alpha', 'Premium trading signals community', 'telegram', 'diamonds', 75, 'https://t.me/tradingalpha', true, NULL),
-- Daily Tasks (reset every 24 hours)
('Daily Login', 'Claim your daily login reward', 'daily', 'cash', 5000, NULL, true, 24),
('Complete 3 Jobs', 'Finish 3 job operations today', 'daily', 'cash', 10000, NULL, true, 24),
('Complete 5 Jobs', 'Finish 5 job operations today', 'daily', 'cash', 20000, NULL, true, 24),
('Win 1 Attack', 'Win at least 1 PvP attack today', 'daily', 'cash', 15000, NULL, true, 24),
('Collect Income', 'Collect from all your businesses', 'daily', 'cash', 5000, NULL, true, 24),
('Train Stats', 'Train any stat 1 time', 'daily', 'energy', 10, NULL, true, 24),
-- Weekly Tasks (reset every 168 hours)
('Weekly Warrior', 'Win 10 attacks this week', 'weekly', 'diamonds', 75, NULL, true, 168),
('Business Mogul', 'Collect $500K from businesses this week', 'weekly', 'diamonds', 50, NULL, true, 168),
('Job Master', 'Complete 50 jobs this week', 'weekly', 'diamonds', 100, NULL, true, 168),
-- Ad Tasks (can be completed multiple times per day)
('Watch Ad', 'Watch an ad to earn rewards', 'ad', 'cash', 5000, NULL, true, NULL);

-- =====================================================
-- DAILY REWARD DEFINITIONS
-- =====================================================

INSERT INTO public.daily_reward_definitions (day_number, reward_type, reward_amount) VALUES
(1, 'cash', 5000),
(2, 'diamonds', 10),
(3, 'cash', 10000),
(4, 'energy', 50),
(5, 'diamonds', 25),
(6, 'cash', 25000),
(7, 'diamonds', 100)
ON CONFLICT (day_number) DO NOTHING;
