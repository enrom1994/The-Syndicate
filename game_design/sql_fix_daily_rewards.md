# Fix: Populate Daily Rewards Data

The "Daily Rewards" page is empty because the `daily_reward_definitions` table in your database is empty.

## Instructions
1. Go to the **Supabase Dashboard**: [SQL Editor](https://supabase.com/dashboard/project/giwolutowfkvkcxlcwus/sql/new)
2. **Copy and Paste** the following SQL code:

```sql
-- Insert Daily Rewards Data
insert into public.daily_reward_definitions (day, reward_type, reward_amount, description) values
(1, 'cash', 1000, 'Free Cash'),
(2, 'energy', 20, 'Energy Refill'),
(3, 'cash', 2500, 'Stack of Cash'),
(4, 'diamonds', 5, 'Bag of Diamonds'),
(5, 'cash', 5000, 'Briefcase of Cash'),
(6, 'energy', 50, 'Full Energy'),
(7, 'item', 1, 'Mystery Reward')
on conflict (day) do update 
set reward_type = excluded.reward_type,
    reward_amount = excluded.reward_amount,
    description = excluded.description;
```

3. Click **Run**.
4. Refresh your game to see the rewards!
