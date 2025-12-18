-- =====================================================
-- FIX FAMILY CONTRIBUTION LIMITS
-- =====================================================
-- 1. Contraband contributions: Role-based daily caps
-- 2. Cash contributions: Unlimited (no cap)
-- =====================================================

SET search_path = public;

-- =====================================================
-- 1. HELPER FUNCTION: Get daily cap based on family role
-- =====================================================

CREATE OR REPLACE FUNCTION get_contraband_contribution_cap(member_role TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE member_role
        WHEN 'Don' THEN 999999999999  -- Effectively unlimited
        WHEN 'Consigliere' THEN 600000
        WHEN 'Advisor' THEN 350000
        WHEN 'Lieutenant' THEN 300000
        WHEN 'Associate' THEN 200000
        WHEN 'Recruit' THEN 150000
        ELSE 150000  -- Default to Recruit cap
    END;
END;
$$;

COMMENT ON FUNCTION get_contraband_contribution_cap(TEXT) IS 'Returns daily contraband contribution cap based on family role';


-- =====================================================
-- 2. FIX CONTRABAND CONTRIBUTION RPC WITH ROLE-BASED CAP
-- =====================================================

DROP FUNCTION IF EXISTS contribute_contraband_to_treasury(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION contribute_contraband_to_treasury(
    player_id_input UUID,
    contraband_id_input UUID,
    quantity_input INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    membership RECORD;
    item_def RECORD;
    owned_qty INTEGER;
    item_value BIGINT;
    total_value BIGINT;
    daily_contributed BIGINT;
    daily_cap BIGINT;
    remaining_cap BIGINT;
    tax_rate NUMERIC := 0.10;  -- 10% tax
    net_contribution BIGINT;
BEGIN
    -- Validate quantity
    IF quantity_input <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;

    -- 1. Check family membership and get role
    SELECT fm.family_id, fm.role, f.name as family_name
    INTO membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = player_id_input;

    IF membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;

    -- 2. Get role-based daily cap
    daily_cap := get_contraband_contribution_cap(membership.role);

    -- 3. Get item definition (must be contraband)
    SELECT id, name, sell_price INTO item_def
    FROM item_definitions
    WHERE id = contraband_id_input AND category = 'contraband';

    IF item_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found or not contraband.');
    END IF;

    -- 4. Check player owns quantity
    SELECT quantity INTO owned_qty
    FROM player_inventory
    WHERE player_id = player_id_input AND item_id = contraband_id_input;

    IF owned_qty IS NULL OR owned_qty < quantity_input THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Not enough ' || item_def.name || ' in inventory.'
        );
    END IF;

    -- 5. Calculate value
    item_value := item_def.sell_price;
    total_value := item_value * quantity_input;
    net_contribution := FLOOR(total_value * (1 - tax_rate));  -- After 10% tax

    -- 6. Check daily contribution total (reset at midnight UTC)
    SELECT COALESCE(SUM(contribution_amount), 0) INTO daily_contributed
    FROM family_contributions
    WHERE player_id = player_id_input
      AND contributed_at >= CURRENT_DATE
      AND type = 'contraband';

    remaining_cap := GREATEST(0, daily_cap - daily_contributed);

    -- 7. Enforce daily cap
    IF remaining_cap <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Daily contribution limit reached ($' || daily_cap || '). Try again tomorrow.',
            'daily_cap', daily_cap,
            'contributed_today', daily_contributed,
            'role', membership.role
        );
    END IF;

    IF total_value > remaining_cap THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Exceeds daily limit. You can contribute up to $' || remaining_cap || ' more today.',
            'remaining_cap', remaining_cap,
            'attempted_value', total_value,
            'role', membership.role
        );
    END IF;

    -- 8. Deduct items from inventory
    UPDATE player_inventory
    SET quantity = quantity - quantity_input
    WHERE player_id = player_id_input AND item_id = contraband_id_input;

    -- Cleanup if quantity reaches 0
    DELETE FROM player_inventory
    WHERE player_id = player_id_input AND item_id = contraband_id_input AND quantity <= 0;

    -- 9. Add to family treasury
    UPDATE families
    SET treasury = treasury + net_contribution,
        updated_at = NOW()
    WHERE id = membership.family_id;

    -- 10. Log contribution
    INSERT INTO family_contributions (family_id, player_id, amount, contribution_amount, type)
    VALUES (membership.family_id, player_id_input, net_contribution, total_value, 'contraband');

    -- 11. Update member contribution total
    UPDATE family_members
    SET contribution = contribution + net_contribution
    WHERE player_id = player_id_input;

    -- 12. Create notification
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        player_id_input,
        'income',
        '🏛️ Treasury Contribution',
        'Contributed ' || quantity_input || 'x ' || item_def.name || ' worth $' || net_contribution || ' to ' || membership.family_name || ' treasury (10% tax)'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contributed $' || net_contribution || ' to treasury!',
        'item_name', item_def.name,
        'quantity', quantity_input,
        'gross_value', total_value,
        'tax_amount', total_value - net_contribution,
        'net_contribution', net_contribution,
        'remaining_daily_cap', remaining_cap - total_value,
        'daily_cap', daily_cap,
        'role', membership.role
    );
END;
$$;

ALTER FUNCTION contribute_contraband_to_treasury(UUID, UUID, INTEGER) SET search_path = public;

COMMENT ON FUNCTION contribute_contraband_to_treasury(UUID, UUID, INTEGER) IS 
    'Contribute contraband to family treasury with role-based daily caps. 10% tax applied.';


-- =====================================================
-- 3. FIX CASH CONTRIBUTION RPC (NO DAILY CAP)
-- =====================================================

DROP FUNCTION IF EXISTS contribute_to_treasury(UUID, BIGINT);

CREATE OR REPLACE FUNCTION contribute_to_treasury(
    contributor_id UUID,
    amount_input BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    membership RECORD;
    player_cash BIGINT;
BEGIN
    -- Validate amount
    IF amount_input <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid amount');
    END IF;

    -- 1. Check family membership
    SELECT fm.family_id, fm.role, f.name as family_name
    INTO membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = contributor_id;

    IF membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;

    -- 2. Check player has enough cash
    SELECT cash INTO player_cash FROM players WHERE id = contributor_id;
    
    IF player_cash IS NULL OR player_cash < amount_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough cash.');
    END IF;

    -- 3. Deduct cash from player
    UPDATE players
    SET cash = cash - amount_input
    WHERE id = contributor_id;

    -- 4. Add to family treasury
    UPDATE families
    SET treasury = treasury + amount_input,
        updated_at = NOW()
    WHERE id = membership.family_id;

    -- 5. Log contribution
    INSERT INTO family_contributions (family_id, player_id, amount, contribution_amount, type)
    VALUES (membership.family_id, contributor_id, amount_input, amount_input, 'cash');

    -- 6. Update member contribution total
    UPDATE family_members
    SET contribution = contribution + amount_input
    WHERE player_id = contributor_id;

    -- 7. Create notification
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        contributor_id,
        'income',
        '🏛️ Treasury Contribution',
        'Contributed $' || amount_input || ' cash to ' || membership.family_name || ' treasury'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contributed $' || amount_input || ' to treasury!',
        'amount', amount_input,
        'family_name', membership.family_name
    );
END;
$$;

ALTER FUNCTION contribute_to_treasury(UUID, BIGINT) SET search_path = public;

COMMENT ON FUNCTION contribute_to_treasury(UUID, BIGINT) IS 
    'Contribute cash to family treasury. No daily cap.';
