// Adsgram Ad Webhook Edge Function for TON Mafia
// Receives server-to-server verification and credits player rewards

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

    try {
        const url = new URL(req.url);

        // Verify the secret key from Adsgram
        const secretKey = url.searchParams.get('key');
        const adsgramSecretKey = Deno.env.get('ADSGRAM_SECRET_KEY');

        if (!adsgramSecretKey || secretKey !== adsgramSecretKey) {
            console.error('Invalid or missing secret key');
            return new Response('Unauthorized', { status: 401 });
        }

        // Parse the request body from Adsgram
        // Adsgram typically sends: user_id (telegram_id), type, reward
        const body = await req.json();
        const { user_id, type, reward, transaction_id } = body;

        if (!user_id) {
            return new Response('Missing user_id', { status: 400 });
        }

        // Get Supabase credentials
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase configuration');
            return new Response('Server configuration error', { status: 500 });
        }

        // Create admin Supabase client (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Generate unique ad network ID to prevent duplicates
        const adNetworkId = transaction_id || `adsgram_${user_id}_${Date.now()}`;

        // Check if this reward was already given
        const { data: existingView } = await supabase
            .from('ad_views')
            .select('id')
            .eq('ad_network_id', adNetworkId)
            .single();

        if (existingView) {
            // Already processed - return OK to prevent Adsgram retries
            return new Response('OK - Already processed', { status: 200 });
        }

        // Find the player by Telegram ID
        const { data: player, error: playerError } = await supabase
            .from('players')
            .select('id')
            .eq('telegram_id', user_id)
            .single();

        if (playerError || !player) {
            console.error('Player not found:', user_id);
            return new Response('Player not found', { status: 404 });
        }

        // Determine reward amount and type
        const rewardAmount = reward || 5000; // Default 5000 cash
        const rewardType = type || 'cash';

        // Credit the player using RPC
        if (rewardType === 'diamonds') {
            const { error } = await supabase.rpc('increment_diamonds', {
                player_id_input: player.id,
                amount: rewardAmount,
                source: 'ad_reward',
            });

            if (error) {
                console.error('Failed to credit diamonds:', error);
                return new Response('Failed to credit reward', { status: 500 });
            }
        } else {
            // Default to cash
            const { error } = await supabase.rpc('increment_cash', {
                player_id_input: player.id,
                amount: rewardAmount,
                source: 'ad_reward',
            });

            if (error) {
                console.error('Failed to credit cash:', error);
                return new Response('Failed to credit reward', { status: 500 });
            }
        }

        // Log the ad view to prevent duplicates
        const { error: logError } = await supabase
            .from('ad_views')
            .insert({
                player_id: player.id,
                ad_network_id: adNetworkId,
                reward_amount: rewardAmount,
                reward_type: rewardType,
            });

        if (logError) {
            console.error('Failed to log ad view:', logError);
            // Don't fail the request - reward was already given
        }

        console.log(`Rewarded player ${player.id} with ${rewardAmount} ${rewardType} for watching ad`);

        return new Response('OK', {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
    } catch (error) {
        console.error('Ad webhook error:', error);
        return new Response('Internal server error', { status: 500 });
    }
});
