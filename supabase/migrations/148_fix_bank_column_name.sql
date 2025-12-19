-- =====================================================
-- FIX BANK DEPOSIT/WITHDRAW COLUMN NAME
-- =====================================================
-- Migration 127 uses 'bank_balance' but the actual column is 'banked_cash'
-- =====================================================

SET search_path = public;

-- Fix bank_deposit to use correct column name
DROP FUNCTION IF EXISTS bank_deposit(UUID, BIGINT);
CREATE OR REPLACE FUNCTION bank_deposit(player_id_input UUID, amount_input BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE players 
    SET cash = cash - amount_input, 
        banked_cash = banked_cash + amount_input
    WHERE id = player_id_input 
      AND cash >= amount_input;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    IF rows_affected = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough cash');
    END IF;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'bank_deposit', 'cash', amount_input, 'Deposited to bank');
    
    RETURN jsonb_build_object('success', true, 'amount', amount_input);
END;
$$;

ALTER FUNCTION bank_deposit(UUID, BIGINT) SET search_path = public;

-- Fix bank_withdraw to use correct column name
DROP FUNCTION IF EXISTS bank_withdraw(UUID, BIGINT);
CREATE OR REPLACE FUNCTION bank_withdraw(player_id_input UUID, amount_input BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE players 
    SET cash = cash + amount_input, 
        banked_cash = banked_cash - amount_input
    WHERE id = player_id_input 
      AND banked_cash >= amount_input;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    IF rows_affected = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough in bank');
    END IF;
    
    -- Log transaction
    INSERT INTO transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'bank_withdraw', 'cash', amount_input, 'Withdrawn from bank');
    
    RETURN jsonb_build_object('success', true, 'amount', amount_input);
END;
$$;

ALTER FUNCTION bank_withdraw(UUID, BIGINT) SET search_path = public;

COMMENT ON FUNCTION bank_deposit(UUID, BIGINT) IS 'Deposit cash to bank (banked_cash column)';
COMMENT ON FUNCTION bank_withdraw(UUID, BIGINT) IS 'Withdraw cash from bank (banked_cash column)';
