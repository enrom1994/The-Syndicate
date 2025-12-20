// Telegram Bot Webhook - Handles /start and other commands
// Enhanced with personalized messages based on player status
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!telegramBotToken) {
        console.error('[BotWebhook] Missing TELEGRAM_BOT_TOKEN');
        return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const update = await req.json();
        console.log('[BotWebhook] Received update:', JSON.stringify(update));

        // Handle /start command
        if (update.message?.text?.startsWith('/start')) {
            const chatId = update.message.chat.id;
            const telegramId = update.message.from?.id;
            const firstName = update.message.from?.first_name || 'Boss';

            // Check if this user already exists in our database
            let welcomeMessage: string;
            let buttonText = '🎮 Play Now';

            if (telegramId) {
                const { data: player, error } = await supabase
                    .from('players')
                    .select('id, username, cash, respect, last_login_at, created_at, founder_bonus_claimed')
                    .eq('telegram_id', telegramId)
                    .single();

                if (player && !error) {
                    // EXISTING PLAYER - personalize based on activity
                    const lastLogin = player.last_login_at ? new Date(player.last_login_at) : new Date(player.created_at);
                    const daysSinceLogin = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysSinceLogin >= 7) {
                        // DORMANT USER (7+ days) - Comeback message
                        welcomeMessage = `
🎩 <b>Welcome back, ${firstName}!</b>

We missed you in The Syndicate. Your empire has been waiting...

🎁 <b>Comeback Bonus Available:</b>
• Your daily reward streak is ready to rebuild
• New jobs and heists await
• Your crew is ready for orders

💰 Your current stash: <b>$${player.cash?.toLocaleString() || 0}</b>
⭐ Respect: <b>${player.respect?.toLocaleString() || 0}</b>

👇 <b>Time to reclaim your throne!</b>
                        `.trim();
                        buttonText = '🎁 Claim Comeback Bonus';
                    } else {
                        // ACTIVE USER - Quick welcome back
                        welcomeMessage = `
🎩 <b>Welcome back, ${firstName}!</b>

💰 Cash: <b>$${player.cash?.toLocaleString() || 0}</b>
⭐ Respect: <b>${player.respect?.toLocaleString() || 0}</b>

Your empire awaits your orders.
                        `.trim();
                        buttonText = '🎮 Continue Playing';
                    }
                } else {
                    // NEW USER - Full welcome + claim CTA
                    welcomeMessage = `
🎩 <b>Welcome to The Syndicate, ${firstName}!</b>

You've just stepped into the underworld of 1930s organized crime.

💎 <b>EXCLUSIVE: Claim 50 FREE Diamonds now!</b>
Limited time founder bonus for new players.

💰 <b>Build your empire:</b>
• Run businesses & collect passive income
• Complete jobs for cash & respect
• Recruit crew and grow your power

⚔️ <b>Rise through the ranks:</b>
• Attack rivals to steal their fortune
• Join a Family for protection
• Dominate the leaderboard

👇 <b>Tap below to claim your bonus!</b>
                    `.trim();
                    buttonText = '💎 Claim 50 Diamonds';
                }
            } else {
                // Fallback for users without telegram_id
                welcomeMessage = `
🎩 <b>Welcome to The Syndicate, ${firstName}!</b>

You've just stepped into the underworld of 1930s organized crime.

💎 <b>Claim 50 FREE Diamonds</b> when you start playing!

👇 <b>Tap below to begin your rise to power!</b>
                `.trim();
            }

            // Send the personalized message with inline button
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
                                text: buttonText,
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
