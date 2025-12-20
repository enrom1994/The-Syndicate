// Telegram Daily Reminder Edge Function
// Scheduled via pg_cron to remind players to claim their daily rewards
// Enhanced with dormancy-based messaging

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!telegramBotToken) {
        console.error('Missing TELEGRAM_BOT_TOKEN secret');
        return new Response(JSON.stringify({ error: 'Config error' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log('[DailyReminder] Starting reminder process...');

        // 1. Fetch eligible players with their last_login for dormancy check
        const { data: players, error: fetchError } = await supabase.rpc('get_players_for_daily_reminder');

        if (fetchError) {
            console.error('[DailyReminder] Error fetching players:', fetchError);
            return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
        }

        if (!players || players.length === 0) {
            console.log('[DailyReminder] No eligible players found.');
            return new Response(JSON.stringify({ success: true, count: 0 }));
        }

        console.log(`[DailyReminder] Found ${players.length} eligible players.`);

        let successCount = 0;
        let failCount = 0;

        // 2. Loop through players and send personalized messages
        for (const player of players) {
            try {
                // Get player's last login to determine dormancy
                const { data: playerData } = await supabase
                    .from('players')
                    .select('last_login_at, cash, respect, username')
                    .eq('id', player.player_id)
                    .single();

                let messageText: string;
                const daysAway = playerData?.last_login_at
                    ? Math.floor((Date.now() - new Date(playerData.last_login_at).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                if (daysAway >= 7) {
                    // DORMANT USER - More urgent message
                    messageText = `🏚️ <b>Your empire is crumbling, Boss!</b>

Rivals are moving in on your turf while you're away.

💰 Your stash: <b>$${playerData?.cash?.toLocaleString() || 0}</b>
🎁 Daily reward + comeback bonus waiting

<i>The streets don't wait. Neither should you.</i>`;
                } else if (daysAway >= 3) {
                    // SLIPPING AWAY - Medium urgency
                    messageText = `⏰ <b>Don't lose your streak, Boss!</b>

Your daily reward is ready to claim.
Your crew is waiting for orders.

🎁 Tap to collect and keep the momentum.`;
                } else {
                    // REGULAR DAILY - Light touch
                    messageText = `⏰ Your daily reward is waiting.

Hop back in to claim it and keep your streak alive.
Every day counts.`;
                }

                const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: player.telegram_id,
                        text: messageText,
                        parse_mode: 'HTML'
                    })
                });

                const result = await response.json();

                if (result.ok) {
                    // 3. Update last_telegram_push_at on success
                    await supabase
                        .from('players')
                        .update({ last_telegram_push_at: new Date().toISOString() })
                        .eq('id', player.player_id);

                    successCount++;
                } else {
                    console.error(`[DailyReminder] Failed to send to player ${player.player_id.slice(0, 8)}:`, result.description);
                    failCount++;
                }
            } catch (err) {
                console.error(`[DailyReminder] Exception sending to player ${player.player_id.slice(0, 8)}:`, err);
                failCount++;
            }
        }

        console.log(`[DailyReminder] Completed. Success: ${successCount}, Fail: ${failCount}`);

        return new Response(
            JSON.stringify({ success: true, processed: players.length, successCount, failCount }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[DailyReminder] Critical error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
