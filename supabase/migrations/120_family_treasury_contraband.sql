-- =====================================================
-- FAMILY TREASURY CONTRABAND CONTRIBUTIONS
-- =====================================================
-- Allows players to contribute contraband to family treasury
-- Contraband is converted to cash at Black Market rate minus 10% "Family Tax"
-- Enforces $100,000/day per-player cap

SET search_path = public;

-- =====================================================
-- 1. ADD DAILY CAP TRACKING TO FAMILY_MEMBERS
-- =====================================================

-- Add column to track daily contraband contribution value
ALTER TABLE public.family_members
ADD COLUMN IF NOT EXISTS contraband_contributed_today BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS contraband_contribution_reset_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 2. CONTRIBUTE CONTRABAND TO TREASURY RPC
-- =====================================================

DROP FUNCTION IF EXISTS contribute_contraband_to_treasury(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION contribute_contraband_to_treasury(
    player_id_input UUID,
    item_id_input UUID,
    quantity_input INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    membership RECORD;
    player_item RECORD;
    item_def RECORD;
    base_value BIGINT;
    taxed_value BIGINT;
    total_contribution BIGINT;
    daily_cap BIGINT := 100000; -- $100,000 per day
    current_daily_total BIGINT;
    remaining_cap BIGINT;
    family_tax_rate NUMERIC := 0.10; -- 10% tax
BEGIN
    -- Validate quantity
    IF quantity_input <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;

    -- 1. Validate family membership
    SELECT fm.*, f.name as family_name, f.id as fam_id
    INTO membership
    FROM public.family_members fm
    JOIN public.families f ON fm.family_id = f.id
    WHERE fm.player_id = player_id_input;

    IF membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;

    -- 2. Get item definition (must be contraband)
    SELECT * INTO item_def
    FROM public.item_definitions
    WHERE id = item_id_input AND category = 'contraband';

    IF item_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found or not contraband.');
    END IF;

    -- 3. Check player owns quantity
    SELECT * INTO player_item
    FROM public.player_inventory
    WHERE player_id = player_id_input AND item_id = item_id_input;

    IF player_item IS NULL OR player_item.quantity < quantity_input THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Not enough ' || item_def.name || ' in inventory.'
        );
    END IF;

    -- 4. Calculate values
    base_value := item_def.sell_price;
    taxed_value := FLOOR(base_value * (1 - family_tax_rate)); -- 90% after 10% tax
    total_contribution := taxed_value * quantity_input;

    -- 5. Check and reset daily cap if needed (resets at midnight UTC)
    IF membership.contraband_contribution_reset_at IS NULL 
       OR membership.contraband_contribution_reset_at::date < CURRENT_DATE THEN
        -- Reset daily counter
        UPDATE public.family_members
        SET contraband_contributed_today = 0,
            contraband_contribution_reset_at = NOW()
        WHERE player_id = player_id_input;
        
        current_daily_total := 0;
    ELSE
        current_daily_total := COALESCE(membership.contraband_contributed_today, 0);
    END IF;

    remaining_cap := daily_cap - current_daily_total;

    -- 6. Enforce daily cap
    IF remaining_cap <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Daily contribution limit reached. Try again tomorrow.',
            'daily_cap', daily_cap,
            'contributed_today', current_daily_total
        );
    END IF;

    -- Cap the contribution if it would exceed daily limit
    IF total_contribution > remaining_cap THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This contribution would exceed your daily limit of $' || daily_cap || '. You can contribute up to $' || remaining_cap || ' more today.',
            'remaining_cap', remaining_cap,
            'attempted_value', total_contribution
        );
    END IF;

    -- 7. Remove item(s) from player inventory
    IF player_item.quantity = quantity_input THEN
        DELETE FROM public.player_inventory
        WHERE player_id = player_id_input AND item_id = item_id_input;
    ELSE
        UPDATE public.player_inventory
        SET quantity = quantity - quantity_input
        WHERE player_id = player_id_input AND item_id = item_id_input;
    END IF;


    -- 8. Add value to family treasury
    UPDATE public.families
    SET treasury = treasury + total_contribution,
        updated_at = NOW()
    WHERE id = membership.fam_id;

    -- 9. Update family_members contribution tracking
    UPDATE public.family_members
    SET contribution = contribution + total_contribution,
        contraband_contributed_today = COALESCE(contraband_contributed_today, 0) + total_contribution
    WHERE player_id = player_id_input;

    -- 10. Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (
        player_id_input,
        'family_contraband_contribution',
        'cash',
        total_contribution,
        'Contributed ' || quantity_input || 'x ' || item_def.name || ' to ' || membership.family_name || ' treasury (10% tax applied)'
    );

    -- Create notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        player_id_input,
        'income',
        '🏛️ Treasury Contribution',
        'Contributed ' || quantity_input || 'x ' || item_def.name || ' worth $' || total_contribution || ' to family treasury'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contributed $' || total_contribution || ' to treasury!',
        'item_name', item_def.name,
        'quantity', quantity_input,
        'base_value', base_value * quantity_input,
        'tax_amount', FLOOR(base_value * family_tax_rate) * quantity_input,
        'net_contribution', total_contribution,
        'remaining_daily_cap', remaining_cap - total_contribution
    );
END;
$$;

ALTER FUNCTION public.contribute_contraband_to_treasury(UUID, UUID, INTEGER) SET search_path = public;

COMMENT ON FUNCTION contribute_contraband_to_treasury IS 'Contribute contraband items to family treasury at Black Market rate minus 10% tax. Daily cap: $100,000 per player.';

-- =====================================================
-- 3. GET PLAYER CONTRABAND FOR TREASURY RPC
-- =====================================================
-- Returns player's contraband with treasury contribution values

CREATE OR REPLACE FUNCTION get_contraband_for_treasury(
    player_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    membership RECORD;
    contraband_items JSONB;
    daily_cap BIGINT := 100000;
    current_daily_total BIGINT;
    remaining_cap BIGINT;
    family_tax_rate NUMERIC := 0.10;
BEGIN
    -- Check membership
    SELECT * INTO membership
    FROM public.family_members
    WHERE player_id = player_id_input;

    IF membership IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You are not in a family.'
        );
    END IF;

    -- Get daily cap status
    IF membership.contraband_contribution_reset_at IS NULL 
       OR membership.contraband_contribution_reset_at::date < CURRENT_DATE THEN
        current_daily_total := 0;
    ELSE
        current_daily_total := COALESCE(membership.contraband_contributed_today, 0);
    END IF;

    remaining_cap := daily_cap - current_daily_total;

    -- Get contraband items with treasury values
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'item_id', id.id,
            'name', id.name,
            'rarity', id.rarity,
            'icon', id.icon,
            'quantity', pi.quantity,
            'base_value', id.sell_price,
            'treasury_value', FLOOR(id.sell_price * (1 - family_tax_rate)),
            'tax_amount', FLOOR(id.sell_price * family_tax_rate)
        ) ORDER BY id.rarity DESC, id.sell_price DESC
    ), '[]'::jsonb)
    INTO contraband_items
    FROM public.player_inventory pi
    JOIN public.item_definitions id ON pi.item_id = id.id
    WHERE pi.player_id = player_id_input
      AND id.category = 'contraband'
      AND pi.quantity > 0;

    RETURN jsonb_build_object(
        'success', true,
        'items', contraband_items,
        'daily_cap', daily_cap,
        'contributed_today', current_daily_total,
        'remaining_cap', remaining_cap,
        'tax_rate', family_tax_rate * 100
    );
END;
$$;

ALTER FUNCTION public.get_contraband_for_treasury(UUID) SET search_path = public;

COMMENT ON FUNCTION get_contraband_for_treasury IS 'Returns player contraband inventory with treasury contribution values and daily cap status.';

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Test queries after migration:
-- SELECT get_contraband_for_treasury('player-uuid-here');
-- SELECT contribute_contraband_to_treasury('player-uuid', 'item-uuid', 1);
