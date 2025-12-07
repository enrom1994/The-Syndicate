-- Function to buy a business securely
CREATE OR REPLACE FUNCTION buy_business(
    player_id_input UUID,
    business_id_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    business_record RECORD;
    business_cost BIGINT;
    player_cash BIGINT;
    existing_business_id TEXT;
    
    -- Variables to hold the definition details
    def_id UUID;
    def_price INTEGER;
BEGIN
    -- 1. Check if business exists and get cost. 
    -- Input is likely the 'id' UUID, not name.
    SELECT id, base_purchase_cost INTO def_id, def_price
    FROM business_definitions
    WHERE id = business_id_input::UUID; -- Cast to UUID just in case

    IF def_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid business ID');
    END IF;
    
    business_cost := def_price;

    -- 2. Check if player already owns the business
    SELECT id INTO existing_business_id
    FROM player_businesses
    WHERE player_id = player_id_input AND business_id = def_id;

    IF existing_business_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business already owned');
    END IF;

    -- 3. Check player cash
    SELECT cash INTO player_cash
    FROM players
    WHERE id = player_id_input;

    IF player_cash < business_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    -- 4. Execute Transaction
    -- Deduct cash
    UPDATE players
    SET cash = cash - business_cost
    WHERE id = player_id_input;

    -- Grant business
    INSERT INTO player_businesses (player_id, business_id, level, last_collected)
    VALUES (player_id_input, def_id, 1, NOW());

    -- Log transaction
    INSERT INTO transaction_log (player_id, amount, currency_type, reason)
    VALUES (player_id_input, -business_cost, 'cash', 'bought_business');

    RETURN jsonb_build_object('success', true, 'message', 'Business purchased successfully');
END;
$$;

-- Function to upgrade a business securely
CREATE OR REPLACE FUNCTION upgrade_business(
    player_id_input UUID,
    player_business_id_input UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    business_record RECORD;
    def_record RECORD;
    upgrade_cost BIGINT;
    player_cash BIGINT;
BEGIN
    -- 1. Get player business details
    SELECT pb.*, bd.base_purchase_cost, bd.upgrade_cost_multiplier, bd.max_level
    INTO business_record
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.id = player_business_id_input AND pb.player_id = player_id_input;

    IF business_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found or not owned');
    END IF;

    -- 2. Check Max Level
    IF business_record.level >= business_record.max_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max level reached');
    END IF;

    -- 3. Calculate Upgrade Cost
    -- Formula: Base Cost * (Multiplier ^ Current Level)
    -- e.g. Lvl 1 -> 2 cost: Base * (1.5 ^ 1)
    upgrade_cost := (business_record.base_purchase_cost * POWER(business_record.upgrade_cost_multiplier, business_record.level))::BIGINT;

    -- 4. Check Cash
    SELECT cash INTO player_cash
    FROM players
    WHERE id = player_id_input;

    IF player_cash < upgrade_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    -- 5. Execute Transaction
    -- Deduct cash
    UPDATE players
    SET cash = cash - upgrade_cost
    WHERE id = player_id_input;

    -- Update business level
    UPDATE player_businesses
    SET level = level + 1
    WHERE id = player_business_id_input;

    -- Log transaction
    INSERT INTO transaction_log (player_id, amount, currency_type, reason)
    VALUES (player_id_input, -upgrade_cost, 'cash', 'upgraded_business_' || business_record.level::TEXT);

    RETURN jsonb_build_object('success', true, 'message', 'Business upgraded successfully');
END;
$$;
