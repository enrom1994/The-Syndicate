-- Insert Daily Rewards Data
-- Note: 'day_number' is the correct column name
insert into public.daily_reward_definitions (day_number, reward_type, reward_amount) values
(1, 'cash', 1000),
(2, 'energy', 20),
(3, 'cash', 2500),
(4, 'diamonds', 5),
(5, 'cash', 5000),
(6, 'energy', 50),
(7, 'item', 1)
on conflict (day_number) do update 
set reward_type = excluded.reward_type,
    reward_amount = excluded.reward_amount;
