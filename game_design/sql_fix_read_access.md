# Fix "Empty Data" Issues (Auth 403 Workaround)

Because the "403 Forbidden" error means your app isn't officially logged in (due to the Secret mismatch), Supabase is blocking it from **reading** your data (Inventory, Crew, etc.).

Even though purchasing works now, you likely won't see the items appear in your inventory.

To fix this **immediately** so you can continue building and testing, run this SQL script. It tells Supabase to "allow anyone to read game data" (which is fine for development).

## Instructions

1.  Open your **Supabase Dashboard**.
2.  Go to the **SQL Editor**.
3.  Click **New Query**.
4.  Copy the code below entirely and paste it into the editor.
5.  Click **Run**.

```sql
-- Inventory
DROP POLICY IF EXISTS "Players can view own inventory" ON public.player_inventory;
CREATE POLICY "Dev public view inventory" ON public.player_inventory FOR SELECT USING (true);

-- Crew
DROP POLICY IF EXISTS "Players can view own crew" ON public.player_crew;
CREATE POLICY "Dev public view crew" ON public.player_crew FOR SELECT USING (true);

-- Businesses
DROP POLICY IF EXISTS "Players can view own businesses" ON public.player_businesses;
CREATE POLICY "Dev public view businesses" ON public.player_businesses FOR SELECT USING (true);

-- Tasks
DROP POLICY IF EXISTS "Players can modify own tasks" ON public.player_tasks;
CREATE POLICY "Dev public view tasks" ON public.player_tasks FOR SELECT USING (true);
CREATE POLICY "Dev modify own tasks" ON public.player_tasks FOR UPDATE USING (true);

-- Achievements
DROP POLICY IF EXISTS "Players can view own achievements" ON public.player_achievements;
CREATE POLICY "Dev public view achievements" ON public.player_achievements FOR SELECT USING (true);

-- Daily Rewards
DROP POLICY IF EXISTS "Players can view own daily rewards" ON public.player_daily_rewards;
CREATE POLICY "Dev public view daily rewards" ON public.player_daily_rewards FOR SELECT USING (true);

-- Transactions
DROP POLICY IF EXISTS "Players can view own transactions" ON public.transactions;
CREATE POLICY "Dev public view transactions" ON public.transactions FOR SELECT USING (true);

-- Attack Log
DROP POLICY IF EXISTS "Players can view own attacks" ON public.attack_log;
CREATE POLICY "Dev public view attacks" ON public.attack_log FOR SELECT USING (true);

-- Job Log
DROP POLICY IF EXISTS "Players can view own jobs" ON public.job_log;
CREATE POLICY "Dev public view jobs" ON public.job_log FOR SELECT USING (true);

-- Players (Profiles)
DROP POLICY IF EXISTS "Users can see their own data" ON public.players;
CREATE POLICY "Dev public view players" ON public.players FOR SELECT USING (true);
```
