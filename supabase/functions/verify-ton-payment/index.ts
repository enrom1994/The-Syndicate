// Verify TON Payment Edge Function for The Syndicate
// Receives BOC from frontend, hashes it for replay protection, and credits rewards

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hash the BOC for replay protection
async function hashBoc(boc: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(boc);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get auth header for user verification
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, message: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        const body = await req.json();
        const { 
            boc,           // Transaction BOC from TonConnect
            paymentType,   // 'diamonds', 'protection', 'vip_pass', 'starter_pack', 'insurance', 'safe_slots', 'streak_restore'
            tonAmount,     // Amount in TON
            rewardData,    // { diamonds: 120 } or { protectionMinutes: 60 } etc.
            walletAddress  // Optional: sender wallet
        } = body;

        // Validate required fields
        if (!boc || !paymentType || !tonAmount) {
            return new Response(
                JSON.stringify({ success: false, message: 'Missing required fields: boc, paymentType, tonAmount' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Hash the BOC for replay protection
        const bocHash = await hashBoc(boc);
        console.log('[VerifyTON] BOC hash:', bocHash.slice(0, 16) + '...');

        // Get Supabase credentials
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase configuration');
            return new Response(
                JSON.stringify({ success: false, message: 'Server configuration error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Supabase client with user's auth token
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
            global: {
                headers: {
                    Authorization: authHeader  // Pass user's auth for auth.uid() in RPC
                }
            }
        });

        // Map paymentType to RPC parameters
        let rpcParams: Record<string, any> = {
            boc_hash_input: bocHash,
            payment_type_input: paymentType,
            ton_amount_input: tonAmount,
            wallet_address_input: walletAddress || null,
            diamonds_amount: null,
            protection_minutes: null,
            insurance_type_input: null,
            safe_slots_amount: null
        };

        // Set reward-specific parameters
        switch (paymentType) {
            case 'diamonds':
                rpcParams.diamonds_amount = rewardData?.diamonds || 0;
                break;
            case 'protection':
                rpcParams.protection_minutes = rewardData?.protectionMinutes || 0;
                break;
            case 'insurance':
                rpcParams.insurance_type_input = rewardData?.insuranceType || 'basic';
                break;
            case 'safe_slots':
                rpcParams.safe_slots_amount = rewardData?.safeSlots || 0;
                break;
            // vip_pass, starter_pack, streak_restore don't need extra params
        }

        console.log('[VerifyTON] Calling verify_and_credit_payment with type:', paymentType);

        // Call the database RPC
        const { data, error } = await supabase.rpc('verify_and_credit_payment', rpcParams);

        if (error) {
            console.error('[VerifyTON] RPC error:', error);
            return new Response(
                JSON.stringify({ success: false, message: error.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log('[VerifyTON] Result:', JSON.stringify(data));

        // Return the RPC result
        return new Response(
            JSON.stringify(data),
            { status: data?.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[VerifyTON] Error:', error);
        return new Response(
            JSON.stringify({ success: false, message: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
