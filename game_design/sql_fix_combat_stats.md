# Fix Ops Page Crash

The app crashed because the database was missing the `attack` and `defense` columns on the players table. The "Ops" page tries to read these to show you enemy stats.

## Instructions

1.  Open your **Supabase Dashboard**.
2.  Go to the **SQL Editor**.
3.  Click **New Query**.
4.  Copy the code below entirely and paste it into the editor.
5.  Click **Run**.

```sql
-- Add missing combat columns
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS attack INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS defense INTEGER DEFAULT 10;

-- Ensure defaults
UPDATE public.players SET attack = 10 WHERE attack IS NULL;
UPDATE public.players SET defense = 10 WHERE defense IS NULL;
```
