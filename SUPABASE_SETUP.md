# TON Mafia - Supabase Setup Guide

This guide walks you through setting up the Supabase backend for TON Mafia.

## Step 1: Run Database Migrations

1. Open your Supabase dashboard: https://supabase.com/dashboard/project/giwolutowfkvkcxlcwus
2. Go to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press F5)
7. Wait for it to complete - you should see "Success. No rows returned"

## Step 2: Seed Game Data

1. Stay in **SQL Editor**
2. Click **New query** again
3. Copy the entire contents of `supabase/seed/game_definitions.sql`
4. Paste it into the SQL editor
5. Click **Run**
6. This will populate all game definitions (items, jobs, businesses, etc.)

## Step 3: Set Up Edge Function Secrets

1. Go to your Supabase dashboard
2. Click **Settings** (gear icon) in the left sidebar
3. Go to **Edge Functions** → **Secrets**
4. Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `TELEGRAM_BOT_TOKEN` | `7543043031:AAGq51CkuSqBde0TMiLlgI0E5sCTiHT8BN0` |
| `ADSGRAM_SECRET_KEY` | (get this from Adsgram dashboard) |

The `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET` are automatically available to Edge Functions.

## Step 4: Deploy Edge Functions

You have two options:

### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI if not already installed:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref giwolutowfkvkcxlcwus
```

4. Deploy all functions:
```bash
supabase functions deploy telegram-auth
supabase functions deploy ad-webhook
```

### Option B: Using Dashboard (Manual)

1. Go to **Edge Functions** in the Supabase dashboard
2. Click **Create a new function**
3. Name it `telegram-auth`
4. Copy the contents of `supabase/functions/telegram-auth/index.ts`
5. Paste and save
6. Repeat for `ad-webhook`

## Step 5: Configure Adsgram SSV Webhook

1. Log in to your Adsgram dashboard
2. Go to your app settings
3. Set the Server-to-Server verification URL to:
   ```
   https://giwolutowfkvkcxlcwus.supabase.co/functions/v1/ad-webhook?key=YOUR_ADSGRAM_SECRET_KEY
   ```
4. Replace `YOUR_ADSGRAM_SECRET_KEY` with the secret you set in Step 3

## Step 6: Verify Setup

After completing all steps, verify the setup:

1. Check **Table Editor** - you should see all new tables:
   - `players`, `player_inventory`, `player_businesses`, etc.
   - `item_definitions`, `job_definitions`, etc.

2. Check **Edge Functions** - you should see:
   - `telegram-auth` (deployed)
   - `ad-webhook` (deployed)

3. Check **Database Functions** - you should see:
   - `increment_cash`, `spend_cash`, etc.
   - `get_leaderboard`, `calculate_net_worth`, etc.

## Troubleshooting

### "relation does not exist" Error
- Make sure you ran the migration SQL first
- Check that the query completed successfully

### Edge Functions Not Working
- Check the Edge Function logs in the Supabase dashboard
- Make sure all secrets are set correctly
- Verify the function URL is correct

### Authentication Issues
- Make sure `TELEGRAM_BOT_TOKEN` secret is set correctly
- Check that the bot token is valid (try @BotFather on Telegram)

## Next Steps

Once the backend is set up, the frontend will automatically:
1. Authenticate users via Telegram
2. Load player data from the database
3. Sync game state in real-time

You can test locally with `pnpm dev` - the app will work in "development mode" with mock player data when not running inside Telegram.
