// Telegram Bot Webhook - Handles /start and other commands
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Your app URL - update this to your deployed Vercel URL
const APP_URL = Deno.env.get('APP_URL') || 'https://mafia-ton.vercel.app';

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!telegramBotToken) {
        console.error('[BotWebhook] Missing TELEGRAM_BOT_TOKEN');
        return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
    }

    try {
        const update = await req.json();
        console.log('[BotWebhook] Received update:', JSON.stringify(update));

        // Handle /start command
        if (update.message?.text?.startsWith('/start')) {
            const chatId = update.message.chat.id;
            const firstName = update.message.from?.first_name || 'Boss';

            // Craft the welcome message
            const welcomeMessage = `
🎩 <b>Welcome to The Syndicate, ${firstName}!</b>

You've just stepped into the underworld of 1930s organized crime.

💰 <b>Build your empire:</b>
• Run businesses & collect income
• Complete jobs for cash & respect
• Recruit crew and grow your power

⚔️ <b>Rise through the ranks:</b>
• Attack rivals to steal their fortune
• Join a Family for protection
• Dominate the leaderboard

🎰 <b>Daily rewards await:</b>
• Spin the Lucky Wheel
• Claim daily bonuses
• Stack your diamond stash

👇 <b>Tap below to begin your rise to power!</b>
            `.trim();

            // Send the welcome message with inline button to launch the app
            const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: welcomeMessage,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '🎮 Play Now',
                                web_app: { url: APP_URL }
                            }
                        ]]
                    }
                })
            });

            const result = await response.json();
            console.log('[BotWebhook] sendMessage result:', result);
        }

        // Always return 200 OK to Telegram to acknowledge receipt
        return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[BotWebhook] Error:', error);
        // Still return 200 to prevent Telegram from retrying
        return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
