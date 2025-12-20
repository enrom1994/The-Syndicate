# Telegram Mini App Setup Guide

## Prerequisites
- A Telegram Bot Token (create one via @BotFather)
- Your deployed app URL

## Steps to Set Up Your Telegram Mini App

### 1. Create a Telegram Bot
1. Open Telegram and search for @BotFather
2. Send `/newbot` command
3. Follow the prompts to name your bot
4. Save your bot token securely

### 2. Configure Mini App
Send these commands to @BotFather:

```
/setmenubutton
```
- Select your bot
- Choose "Configure menu button"
- Enter your app URL (e.g., https://your-domain.com)
- Enter button text (e.g., "Play Game")

```
/setdescription
```
- Select your bot
- Enter a description for your mini app

```
/setabouttext
```
- Select your bot
- Enter brief about text

### 3. Configure Environment Variables

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TON_MANIFEST_URL=https://your-domain.com/tonconnect-manifest.json
```

### 4. Update TonConnect Manifest

Edit `public/tonconnect-manifest.json` with your actual URLs:

```json
{
  "url": "https://your-domain.com",
  "name": "Mafia Boss 1930",
  "iconUrl": "https://your-domain.com/icon.png",
  "termsOfUseUrl": "https://your-domain.com/terms",
  "privacyPolicyUrl": "https://your-domain.com/privacy"
}
```

### 5. Deploy Your App
Deploy to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

### 6. Test Your Mini App
1. Open your bot in Telegram
2. Click the menu button (bottom left)
3. Your mini app should launch

## Features Included
- ✅ Telegram Web App SDK integration
- ✅ TonConnect wallet integration
- ✅ Haptic feedback for mobile experience
- ✅ Full game mechanics (missions, businesses, leaderboard)
- ✅ Supabase backend with RLS security
- ✅ Noir 1930s prohibition theme
- ✅ Responsive design for mobile

## Game Mechanics
- Execute missions to earn cash and respect
- Purchase businesses to generate passive income
- Level up by gaining experience
- Compete on the leaderboard
- Connect TON wallet for blockchain integration

Enjoy building your mafia empire!

---

## Bot Webhook Setup (Custom /start Message)

To send a custom welcome message when users send `/start` to your bot, you need to deploy the webhook Edge Function and register it with Telegram.

### 1. Set Environment Variables in Supabase

In your Supabase project, go to **Settings > Edge Functions** and add:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
APP_URL=https://your-deployed-app.vercel.app
```

### 2. Deploy the Webhook Edge Function

```bash
cd supabase
npx supabase functions deploy telegram-bot-webhook --no-verify-jwt
```

> **Note:** The `--no-verify-jwt` flag is required because Telegram sends unsigned requests.

### 3. Register the Webhook with Telegram

Replace `YOUR_BOT_TOKEN` and `YOUR_SUPABASE_PROJECT_REF` with your values:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/telegram-bot-webhook"}'
```

For your project, the URL would be:
```
https://giwolutowfkvkcxlcwus.supabase.co/functions/v1/telegram-bot-webhook
```

### 4. Verify Webhook is Set

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

### Customizing the Welcome Message

Edit the `welcomeMessage` in:
```
supabase/functions/telegram-bot-webhook/index.ts
```

The message supports HTML formatting:
- `<b>bold</b>`
- `<i>italic</i>`
- `<code>code</code>`
- `<a href="url">link</a>`
