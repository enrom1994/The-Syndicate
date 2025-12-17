-- =====================================================
-- PAYMENT VERIFICATION & SECURITY HARDENING
-- =====================================================
-- Phase 1: TON Payment Security
-- Phase 4: Direct Write Cleanup (apply_protection_shield)
-- 
-- This migration:
--   1. Creates processed_ton_transactions table for replay protection
--   2. Creates verify_and_credit_payment RPC with auth.uid() validation
--   3. Creates apply_protection_shield RPC (replaces direct table write)
-- =====================================================

SET search_path = public;

-- =====================================================
-- 1. PROCESSED TON TRANSACTIONS TABLE
-- =====================================================
-- Stores all verified TON payments with replay protection

CREATE TABLE IF NOT EXISTS public.processed_ton_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boc_hash TEXT UNIQUE NOT NULL,  -- Hash of BOC for replay protection
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL,  -- 'diamonds', 'protection', 'vip_pass', 'starter_pack', 'insurance', 'safe_slots', 'streak_restore', 'family_creation'
    ton_amount NUMERIC(20, 9) NOT NULL,  -- Amount in TON
    rewards_granted JSONB NOT NULL,  -- What was credited: {"diamonds": 120} or {"protection_minutes": 60}
    wallet_address TEXT,  -- Sender wallet (for audit)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by player
CREATE INDEX IF NOT EXISTS idx_processed_ton_player ON public.processed_ton_transactions(player_id);

-- Index for replay check
CREATE INDEX IF NOT EXISTS idx_processed_ton_boc_hash ON public.processed_ton_transactions(boc_hash);

-- RLS
ALTER TABLE public.processed_ton_transactions ENABLE ROW LEVEL SECURITY;

-- Players can only view their own transactions
DROP POLICY IF EXISTS "Players can view own ton transactions" ON public.processed_ton_transactions;
CREATE POLICY "Players can view own ton transactions" 
    ON public.processed_ton_transactions FOR SELECT 
    USING (auth.uid() = player_id);

-- No direct inserts - only through RPC
DROP POLICY IF EXISTS "No direct inserts to ton transactions" ON public.processed_ton_transactions;

COMMENT ON TABLE processed_ton_transactions IS 'Stores verified TON payments with BOC hash for replay protection';

-- =====================================================
-- 2. VERIFY AND CREDIT PAYMENT RPC
-- =====================================================
-- Main entry point for crediting TON purchases
-- Called by verify-ton-payment edge function after validation

CREATE OR REPLACE FUNCTION verify_and_credit_payment(
    boc_hash_input TEXT,
    payment_type_input TEXT,
    ton_amount_input NUMERIC,
    wallet_address_input TEXT DEFAULT NULL,
    -- Reward parameters (only one set will be used based on payment_type)
    diamonds_amount INTEGER DEFAULT NULL,
    protection_minutes INTEGER DEFAULT NULL,
    insurance_type_input TEXT DEFAULT NULL,
    safe_slots_amount INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_id UUID;
    existing_tx RECORD;
    rewards JSONB;
    result_message TEXT;
BEGIN
    -- 1. VALIDATE CALLER IDENTITY
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: No authenticated user');
    END IF;

    -- 2. CHECK FOR REPLAY (duplicate BOC hash)
    SELECT * INTO existing_tx 
    FROM processed_ton_transactions 
    WHERE boc_hash = boc_hash_input;
    
    IF existing_tx IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Transaction already processed',
            'error_code', 'DUPLICATE_TRANSACTION'
        );
    END IF;

    -- 3. VALIDATE PAYMENT TYPE
    IF payment_type_input NOT IN ('diamonds', 'protection', 'vip_pass', 'starter_pack', 'insurance', 'safe_slots', 'streak_restore', 'family_creation') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid payment type');
    END IF;

    -- 4. CREDIT REWARDS BASED ON PAYMENT TYPE
    CASE payment_type_input
        WHEN 'diamonds' THEN
            IF diamonds_amount IS NULL OR diamonds_amount <= 0 THEN
                RETURN jsonb_build_object('success', false, 'message', 'Invalid diamonds amount');
            END IF;
            
            UPDATE public.players 
            SET diamonds = diamonds + diamonds_amount, updated_at = NOW()
            WHERE id = caller_id;
            
            INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
            VALUES (caller_id, 'ton_purchase', 'diamonds', diamonds_amount, 'TON purchase: ' || diamonds_amount || ' diamonds');
            
            rewards := jsonb_build_object('diamonds', diamonds_amount);
            result_message := 'Credited ' || diamonds_amount || ' diamonds';

        WHEN 'protection' THEN
            IF protection_minutes IS NULL OR protection_minutes <= 0 THEN
                RETURN jsonb_build_object('success', false, 'message', 'Invalid protection duration');
            END IF;
            
            -- Use apply_protection_shield logic (upsert to player_boosters)
            INSERT INTO public.player_boosters (player_id, booster_type, expires_at)
            VALUES (caller_id, 'shield', NOW() + (protection_minutes || ' minutes')::INTERVAL)
            ON CONFLICT (player_id, booster_type) 
            DO UPDATE SET expires_at = GREATEST(
                player_boosters.expires_at, 
                NOW()
            ) + (protection_minutes || ' minutes')::INTERVAL;
            
            rewards := jsonb_build_object('protection_minutes', protection_minutes);
            result_message := 'Protection activated for ' || protection_minutes || ' minutes';

        WHEN 'vip_pass' THEN
            -- Call existing purchase_auto_collect logic
            DECLARE
                vip_result JSONB;
            BEGIN
                -- Extend or create VIP pass (7 days per purchase)
                UPDATE public.players 
                SET auto_collect_businesses = true,
                    updated_at = NOW()
                WHERE id = caller_id;
                
                -- Add/extend VIP booster
                INSERT INTO public.player_boosters (player_id, booster_type, expires_at)
                VALUES (caller_id, 'vip_pass', NOW() + INTERVAL '7 days')
                ON CONFLICT (player_id, booster_type) 
                DO UPDATE SET expires_at = GREATEST(player_boosters.expires_at, NOW()) + INTERVAL '7 days';
                
                rewards := jsonb_build_object('vip_days', 7);
                result_message := 'VIP Pass activated for 7 days';
            END;

        WHEN 'starter_pack' THEN
            -- Call existing buy_starter_pack logic
            DECLARE
                pack_result JSONB;
            BEGIN
                -- Check if already claimed
                IF EXISTS (SELECT 1 FROM players WHERE id = caller_id AND starter_pack_claimed = true) THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Starter pack already claimed');
                END IF;
                
                -- Grant starter pack rewards
                UPDATE public.players SET
                    level = GREATEST(level, 3),
                    cash = cash + 25000,
                    diamonds = diamonds + 100,
                    starter_pack_claimed = true,
                    updated_at = NOW()
                WHERE id = caller_id;
                
                -- Grant Speakeasy business if not owned
                INSERT INTO public.player_businesses (player_id, business_id)
                SELECT caller_id, id FROM business_definitions WHERE name = 'Speakeasy'
                ON CONFLICT (player_id, business_id) DO NOTHING;
                
                -- Grant 10 Whiskey
                INSERT INTO public.player_inventory (player_id, item_id, quantity)
                SELECT caller_id, id, 10 FROM item_definitions WHERE name = 'Whiskey'
                ON CONFLICT (player_id, item_id) 
                DO UPDATE SET quantity = player_inventory.quantity + 10;
                
                rewards := jsonb_build_object('level', 3, 'cash', 25000, 'diamonds', 100, 'speakeasy', true, 'whiskey', 10);
                result_message := 'Starter pack claimed! Welcome to the Family.';
            END;

        WHEN 'insurance' THEN
            IF insurance_type_input NOT IN ('basic', 'premium') THEN
                RETURN jsonb_build_object('success', false, 'message', 'Invalid insurance type');
            END IF;
            
            -- Insert insurance record
            INSERT INTO public.player_insurance (player_id, insurance_type, claims_remaining, mitigation_percent, max_coverage)
            VALUES (
                caller_id, 
                insurance_type_input,
                3,  -- 3 claims
                CASE WHEN insurance_type_input = 'basic' THEN 30 ELSE 50 END,
                CASE WHEN insurance_type_input = 'basic' THEN 50000 ELSE 200000 END
            );
            
            rewards := jsonb_build_object('insurance_type', insurance_type_input, 'claims', 3);
            result_message := 'Insurance purchased: ' || insurance_type_input;

        WHEN 'safe_slots' THEN
            IF safe_slots_amount IS NULL OR safe_slots_amount <= 0 THEN
                RETURN jsonb_build_object('success', false, 'message', 'Invalid safe slots amount');
            END IF;
            
            UPDATE public.players 
            SET total_safe_slots = COALESCE(total_safe_slots, 1) + safe_slots_amount,
                updated_at = NOW()
            WHERE id = caller_id;
            
            rewards := jsonb_build_object('safe_slots', safe_slots_amount);
            result_message := 'Added ' || safe_slots_amount || ' safe slots';

        WHEN 'streak_restore' THEN
            -- Restore daily streak
            UPDATE public.player_daily_rewards
            SET current_streak = GREATEST(current_streak, 1)
            WHERE player_id = caller_id;
            
            rewards := jsonb_build_object('streak_restored', true);
            result_message := 'Daily streak restored';

        WHEN 'family_creation' THEN
            -- Family creation is handled separately by create_family RPC
            -- This just logs the payment
            rewards := jsonb_build_object('family_creation_paid', true);
            result_message := 'Family creation payment recorded';

        ELSE
            RETURN jsonb_build_object('success', false, 'message', 'Unhandled payment type');
    END CASE;

    -- 5. RECORD THE TRANSACTION (replay protection)
    INSERT INTO processed_ton_transactions (boc_hash, player_id, payment_type, ton_amount, rewards_granted, wallet_address)
    VALUES (boc_hash_input, caller_id, payment_type_input, ton_amount_input, rewards, wallet_address_input);

    -- 6. RETURN SUCCESS
    RETURN jsonb_build_object(
        'success', true,
        'message', result_message,
        'rewards', rewards,
        'transaction_id', (SELECT id FROM processed_ton_transactions WHERE boc_hash = boc_hash_input)
    );
END;
$$;

ALTER FUNCTION public.verify_and_credit_payment(TEXT, TEXT, NUMERIC, TEXT, INTEGER, INTEGER, TEXT, INTEGER) SET search_path = public;

COMMENT ON FUNCTION verify_and_credit_payment IS 'Verifies TON payment and credits rewards. Enforces auth.uid(), replay protection via BOC hash, and logs all transactions.';

-- =====================================================
-- 3. APPLY PROTECTION SHIELD RPC (Phase 4 Cleanup)
-- =====================================================
-- Replaces direct table write in ShopPage

CREATE OR REPLACE FUNCTION apply_protection_shield(
    duration_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_id UUID;
    new_expires TIMESTAMPTZ;
BEGIN
    -- Validate caller
    caller_id := auth.uid();
    IF caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Validate duration
    IF duration_minutes IS NULL OR duration_minutes <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid duration');
    END IF;

    -- Calculate new expiry
    new_expires := NOW() + (duration_minutes || ' minutes')::INTERVAL;

    -- Upsert booster
    INSERT INTO public.player_boosters (player_id, booster_type, expires_at)
    VALUES (caller_id, 'shield', new_expires)
    ON CONFLICT (player_id, booster_type) 
    DO UPDATE SET expires_at = GREATEST(player_boosters.expires_at, NOW()) + (duration_minutes || ' minutes')::INTERVAL
    RETURNING expires_at INTO new_expires;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Protection activated',
        'expires_at', new_expires,
        'duration_minutes', duration_minutes
    );
END;
$$;

ALTER FUNCTION public.apply_protection_shield(INTEGER) SET search_path = public;

COMMENT ON FUNCTION apply_protection_shield IS 'Applies protection shield booster. Uses auth.uid() - no player_id parameter needed.';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- After migration, test with:
-- SELECT verify_and_credit_payment('test-hash-123', 'diamonds', 1.0, NULL, 100, NULL, NULL, NULL);
-- Should fail with 'Unauthorized' when called without auth context
