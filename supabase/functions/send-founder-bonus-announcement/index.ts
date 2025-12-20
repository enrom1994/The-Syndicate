// One-time Founder Bonus Announcement
// Sends a Telegram message to all players who haven't claimed the bonus yet
// USAGE: Trigger once via curl or Supabase dashboard

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = Deno.env.get('APP_URL') || 'https://mafia-ton.vercel.app';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!telegramBotToken) {
        return new Response(JSON.stringify({ error: 'Missing TELEGRAM_BOT_TOKEN' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log('[FounderAnnouncement] Starting broadcast...');

        // Get all players who haven't claimed AND have a telegram_id
        const { data: players, error: fetchError } = await supabase
            .from('players')
            .select('id, telegram_id, username')
            .eq('founder_bonus_claimed', false)
            .not('telegram_id', 'is', null)
            .limit(500); // Safety limit

        if (fetchError) {
            console.error('[FounderAnnouncement] Fetch error:', fetchError);
            return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
        }

        if (!players || players.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No eligible players found',
                count: 0
            }));
        }

        console.log(`[FounderAnnouncement] Found ${players.length} eligible players`);

        const messageText = `🎁 <b>FOUNDER BONUS AVAILABLE!</b>

As a thank you for being an early player of The Syndicate, you can claim <b>50 FREE Diamonds</b>!

💎 Open the app now and tap <b>"CLAIM"</b> on your dashboard.

This is a one-time reward for our founding players. Don't miss out!`;

        let successCount = 0;
        let failCount = 0;

        for (const player of players) {
            try {
                const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: player.telegram_id,
                        text: messageText,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [[
                                {
                                    text: '💎 Claim Now',
                                    web_app: { url: APP_URL }
                                }
                            ]]
                        }
                    })
                });

                const result = await response.json();
                if (result.ok) {
                    successCount++;
                } else {
                    console.error(`[FounderAnnouncement] Failed for ${player.telegram_id}:`, result.description);
                    failCount++;
                }
            } catch (err) {
                console.error(`[FounderAnnouncement] Error for ${player.telegram_id}:`, err);
                failCount++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`[FounderAnnouncement] Complete. Success: ${successCount}, Failed: ${failCount}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Broadcast complete',
                totalPlayers: players.length,
                successCount,
                failCount
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[FounderAnnouncement] Critical error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
});
