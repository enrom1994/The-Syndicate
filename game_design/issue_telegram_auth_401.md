# Issue: Telegram Authentication 401 Unauthorized

## Description
The application fails to authenticate users when launching from Telegram. The frontend receives a `401 Unauthorized` response when calling the `telegram-auth` Supabase Edge Function.

## Symptoms
1. **Frontend**: Browser console shows `POST .../functions/v1/telegram-auth 401 (Unauthorized)`.
2. **Edge Function Logs**: Shows "Listening on localhost" startup logs but NO request logs (requests blocked by gateway).
3. **Database**: No new users or players created in Supabase tables.

## Root Cause Analysis
1. **Edge Function Configuration**: The `config.toml` file was created with JSON content instead of valid TOML syntax. This caused the `verify_jwt = false` setting to be ignored, meaning the function still requires a valid JWT.
2. **Frontend Request**: The `AuthContext.tsx` uses a raw `fetch` call without including the `Authorization: Bearer <ANON_KEY>` header. Supabase Gateway requires the Anon Key to route requests, even for public functions.

## Resolution Plan
1. **Fix `config.toml`**: Rewrite with valid TOML syntax to properly disable JWT verification for auth functions.
2. **Refactor `AuthContext.tsx`**: Switch from raw `fetch` to `supabase.functions.invoke()` which automatically handles:
   - Authorization headers (Anon Key)
   - Connection routing
   - Error handling interactions

## Status
Pending fixes.
