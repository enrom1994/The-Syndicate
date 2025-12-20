// Telegram Daily Reminder Edge Function
// Scheduled via pg_cron to remind players to claim their daily rewards

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

        // 1. Fetch eligible players
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

        const messageText = `⏰ Your daily reward is waiting.\n\nHop back in to claim it and keep your streak alive.\nEvery day counts.`;

        // 2. Loop through players and send message
        for (const player of players) {
            try {
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
                    console.error(`[DailyReminder] Failed to send to player ${player.player_id.slice(0,8)}:`, result.description);
                    failCount++;
                }
            } catch (err) {
                console.error(`[DailyReminder] Exception sending to player ${player.player_id.slice(0,8)}:`, err);
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
