-- =====================================================
-- FIX GET_CONTRABAND_FOR_TREASURY RPC
-- =====================================================
-- Update to use role-based caps from get_contraband_contribution_cap()
-- =====================================================

SET search_path = public;

DROP FUNCTION IF EXISTS get_contraband_for_treasury(UUID);

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
    daily_cap BIGINT;
    current_daily_total BIGINT;
    remaining_cap BIGINT;
    family_tax_rate NUMERIC := 0.10;
BEGIN
    -- Check membership and get role
    SELECT fm.player_id, fm.family_id, fm.role, f.name as family_name
    INTO membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = player_id_input;

    IF membership IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You are not in a family.'
        );
    END IF;

    -- Get role-based daily cap
    daily_cap := get_contraband_contribution_cap(membership.role);

    -- Get today's contribution total from family_contributions table
    SELECT COALESCE(SUM(contribution_amount), 0)
    INTO current_daily_total
    FROM family_contributions
    WHERE player_id = player_id_input
      AND contributed_at >= CURRENT_DATE
      AND type = 'contraband';

    remaining_cap := GREATEST(0, daily_cap - current_daily_total);

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
    FROM player_inventory pi
    JOIN item_definitions id ON pi.item_id = id.id
    WHERE pi.player_id = player_id_input
      AND id.category = 'contraband'
      AND pi.quantity > 0;

    RETURN jsonb_build_object(
        'success', true,
        'items', contraband_items,
        'daily_cap', daily_cap,
        'contributed_today', current_daily_total,
        'remaining_cap', remaining_cap,
        'tax_rate', family_tax_rate * 100,
        'role', membership.role
    );
END;
$$;

ALTER FUNCTION get_contraband_for_treasury(UUID) SET search_path = public;

COMMENT ON FUNCTION get_contraband_for_treasury(UUID) IS 
    'Returns player contraband inventory with role-based daily cap status for treasury contributions.';
