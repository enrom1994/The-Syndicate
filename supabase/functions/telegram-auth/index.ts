// Telegram Authentication Edge Function for TON Mafia
// Validates Telegram initData and creates/signs in users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validate Telegram initData using HMAC-SHA256
async function validateTelegramData(initData: string, botToken: string): Promise<boolean> {
    try {
        console.log('[Validation] Starting validation...');
        console.log('[Validation] Bot token length:', botToken?.length || 0);
        console.log('[Validation] initData length:', initData?.length || 0);

        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        console.log('[Validation] Hash from initData:', hash?.slice(0, 20) + '...');

        if (!hash) {
            console.log('[Validation] No hash found in initData');
            return false;
        }

        // Remove hash from params for verification
        params.delete('hash');

        // Sort parameters alphabetically
        const sortedParams = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        console.log('[Validation] Data check string keys:', Array.from(params.keys()).join(', '));

        // Create secret key: HMAC-SHA256(botToken, "WebAppData")
        const encoder = new TextEncoder();
        const webAppDataKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode('WebAppData'),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const secretKeyData = await crypto.subtle.sign('HMAC', webAppDataKey, encoder.encode(botToken));

        // Create HMAC of data check string
        const secretKey = await crypto.subtle.importKey(
            'raw',
            secretKeyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const dataCheckString = encoder.encode(sortedParams);
        const calculatedHash = await crypto.subtle.sign('HMAC', secretKey, dataCheckString);

        // Convert to hex
        const calculatedHashHex = Array.from(new Uint8Array(calculatedHash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        console.log('[Validation] Calculated hash:', calculatedHashHex.slice(0, 20) + '...');
        console.log('[Validation] Hashes match:', calculatedHashHex === hash);

        return calculatedHashHex === hash;
    } catch (error) {
        console.error('[Validation] Error:', error);
        return false;
    }
}

// Parse user data from initData
function parseTelegramUser(initData: string): any {
    const params = new URLSearchParams(initData);
    const userString = params.get('user');
    if (!userString) return null;

    try {
        return JSON.parse(userString);
    } catch {
        return null;
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { initData } = await req.json();

        if (!initData) {
            return new Response(
                JSON.stringify({ error: 'Missing initData' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get environment variables
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Try system var first (SUPABASE_JWT_SECRET), then custom (JWT_SECRET)
        const systemSecret = Deno.env.get('SUPABASE_JWT_SECRET');
        const customSecret = Deno.env.get('JWT_SECRET');

        // Detailed debug for troubleshooting the 403 mismatch
        console.log('[Auth Debug] SUPABASE_JWT_SECRET present:', !!systemSecret);
        console.log('[Auth Debug] JWT_SECRET present:', !!customSecret);
        if (systemSecret && customSecret) {
            console.log('[Auth Debug] Secrets match:', systemSecret === customSecret);
        }

        // Prioritize custom secret (JWT_SECRET) over system secret (SUPABASE_JWT_SECRET)
        // This is crucial when the system secret might be stale after a rotation.
        let jwtSecret = customSecret || systemSecret;
        let keyBytes: Uint8Array;

        if (jwtSecret) {
            jwtSecret = jwtSecret.trim();
            console.log('[Auth Debug] Secret length:', jwtSecret.length);

            // Supabase Legacy Secrets are often Base64 encoded (contain +, /, =).
            // We must try to decode them to bytes to match Supabase Auth's signing method.
            const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(jwtSecret) && jwtSecret.length > 40;

            if (isBase64) {
                try {
                    const binaryString = atob(jwtSecret);
                    keyBytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
                    console.log('[Auth Debug] Detected and decoded Base64 secret');
                } catch (e) {
                    console.log('[Auth Debug] Base64 decode failed, falling back to raw utf-8');
                    keyBytes = new TextEncoder().encode(jwtSecret);
                }
            } else {
                // Modern secrets or simple strings
                keyBytes = new TextEncoder().encode(jwtSecret);
            }
        } else {
            // Should verify error handling later if secret missing
            keyBytes = new Uint8Array(0);
        }

        // Debug: log which variables are missing
        const missingVars = [];
        if (!botToken) missingVars.push('TELEGRAM_BOT_TOKEN');
        if (!supabaseUrl) missingVars.push('SUPABASE_URL');
        if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
        // We warn if BOTH are missing, but also if only custom is present (potential mismatch risk)
        if (!jwtSecret) missingVars.push('SUPABASE_JWT_SECRET/JWT_SECRET');

        if (missingVars.length > 0) {
            console.error('Missing environment variables:', missingVars.join(', '));
            return new Response(
                JSON.stringify({ error: 'Server configuration error', missing: missingVars }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Validate Telegram data
        const isValid = await validateTelegramData(initData, botToken);
        if (!isValid) {
            return new Response(
                JSON.stringify({ error: 'Invalid Telegram data' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse user data
        const telegramUser = parseTelegramUser(initData);
        if (!telegramUser || !telegramUser.id) {
            return new Response(
                JSON.stringify({ error: 'Invalid user data' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create admin Supabase client
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Create synthetic email from Telegram ID
        const syntheticEmail = `${telegramUser.id}@tonmafia.telegram`;
        const syntheticPassword = `tg_${telegramUser.id}_${botToken.slice(0, 10)}`;

        let userId: string;
        let isNewUser = false;

        // Check if user exists
        const { data: existingPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('telegram_id', telegramUser.id)
            .single();

        if (existingPlayer) {
            userId = existingPlayer.id;
        } else {
            // Create new auth user
            const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
                email: syntheticEmail,
                password: syntheticPassword,
                email_confirm: true,
                user_metadata: {
                    telegram_id: telegramUser.id,
                    username: telegramUser.username,
                    first_name: telegramUser.first_name,
                    last_name: telegramUser.last_name,
                },
            });

            if (createError) {
                // If user already exists in auth but not in players, get the user
                const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
                const existingAuthUser = users?.find(u => u.email === syntheticEmail);

                if (existingAuthUser) {
                    userId = existingAuthUser.id;
                } else {
                    console.error('Failed to create user:', createError);
                    return new Response(
                        JSON.stringify({ error: 'Failed to create user' }),
                        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
            } else {
                userId = newAuthUser.user.id;
                isNewUser = true;
            }

            // Create player record
            const { error: playerError } = await supabase
                .from('players')
                .upsert({
                    id: userId,
                    telegram_id: telegramUser.id,
                    username: telegramUser.username || `Player${telegramUser.id}`,
                    first_name: telegramUser.first_name,
                    avatar_url: telegramUser.photo_url,
                }, {
                    onConflict: 'telegram_id',
                });

            if (playerError) {
                console.error('Failed to create player:', playerError);
            }

            // Initialize player daily rewards
            await supabase
                .from('player_daily_rewards')
                .upsert({
                    player_id: userId,
                    current_streak: 0,
                    week_start_date: new Date().toISOString().split('T')[0],
                }, {
                    onConflict: 'player_id',
                });

            // Apply referral code if this is a new user with a start_param
            const params = new URLSearchParams(initData);
            const startParam = params.get('start_param');

            if (startParam && startParam.length > 0) {
                console.log('[Auth] Applying referral code for new user:', startParam);
                const { data: referralResult, error: referralError } = await supabase.rpc('apply_referral_code', {
                    new_player_id: userId,
                    code_input: startParam
                });

                if (referralError) {
                    console.error('[Auth] Failed to apply referral code:', referralError);
                } else {
                    console.log('[Auth] Referral code result:', referralResult);
                }
            }
        }

        // Update player info on each login
        await supabase
            .from('players')
            .update({
                username: telegramUser.username || undefined,
                first_name: telegramUser.first_name || undefined,
                avatar_url: telegramUser.photo_url || undefined,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        // Generate JWT token
        const key = await crypto.subtle.importKey(
            'raw',
            // @ts-ignore: Deno type definition mismatch for BufferSource
            keyBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign', 'verify']
        );

        const now = Math.floor(Date.now() / 1000);
        const token = await create(
            { alg: 'HS256', typ: 'JWT' },
            {
                aud: 'authenticated',
                exp: getNumericDate(60 * 60 * 24 * 7), // 7 days
                iat: now,
                iss: `${supabaseUrl}/auth/v1`,
                sub: userId,
                email: syntheticEmail,
                role: 'authenticated',
                aal: 'aal1',
                amr: [{ method: 'telegram', timestamp: now }],
                session_id: crypto.randomUUID(),
            },
            key
        );

        // Regenerate energy based on time offline BEFORE fetching player data
        // This ensures players get their accumulated energy when they return
        await supabase.rpc('regenerate_energy', { player_id_input: userId });

        // Get player data (now with updated energy)
        const { data: player } = await supabase
            .from('players')
            .select('*')
            .eq('id', userId)
            .single();

        return new Response(
            JSON.stringify({
                token,
                user: {
                    id: userId,
                    telegram_id: telegramUser.id,
                    username: telegramUser.username,
                    first_name: telegramUser.first_name,
                },
                player,
                isNewUser,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Auth error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
