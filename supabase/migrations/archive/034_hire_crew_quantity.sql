-- =====================================================
-- UPDATE HIRE_CREW RPC WITH QUANTITY SUPPORT
-- =====================================================
-- Adds quantity_input parameter and enforces max_available limit

CREATE OR REPLACE FUNCTION hire_crew(
    player_id_input UUID,
    crew_id_input UUID,
    quantity_input INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    crew_cost INTEGER;
    crew_name TEXT;
    crew_max_available INTEGER;
    current_cash BIGINT;
    current_owned INTEGER;
    total_cost BIGINT;
    available_to_hire INTEGER;
    actual_quantity INTEGER;
BEGIN
    -- Validate quantity
    IF quantity_input < 1 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;

    -- Get crew details
    SELECT hire_cost, name, max_available INTO crew_cost, crew_name, crew_max_available
    FROM public.crew_definitions 
    WHERE id = crew_id_input;

    IF crew_cost IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Crew definition not found');
    END IF;

    -- Get current owned count
    SELECT COALESCE(quantity, 0) INTO current_owned
    FROM public.player_crew
    WHERE player_id = player_id_input AND crew_id = crew_id_input;

    IF current_owned IS NULL THEN
        current_owned := 0;
    END IF;

    -- Calculate available slots
    available_to_hire := crew_max_available - current_owned;
    
    IF available_to_hire <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum ' || crew_name || ' already hired (' || crew_max_available || ')');
    END IF;

    -- Cap quantity to available slots
    actual_quantity := LEAST(quantity_input, available_to_hire);
    total_cost := crew_cost * actual_quantity;

    -- Check cash
    SELECT cash INTO current_cash FROM public.players WHERE id = player_id_input;
    
    IF current_cash IS NULL OR current_cash < total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds. Need $' || total_cost::TEXT);
    END IF;

    -- Deduct cash
    UPDATE public.players 
    SET cash = cash - total_cost, updated_at = NOW()
    WHERE id = player_id_input;

    -- Add crew members (Upsert)
    INSERT INTO public.player_crew (player_id, crew_id, quantity)
    VALUES (player_id_input, crew_id_input, actual_quantity)
    ON CONFLICT (player_id, crew_id)
    DO UPDATE SET 
        quantity = player_crew.quantity + actual_quantity;

    -- Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'crew_hire', 'cash', -total_cost, 'Hired ' || actual_quantity || 'x ' || crew_name);

    -- Create notification for Activity page
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        player_id_input, 
        'purchase', 
        'Crew Hired',
        'Hired ' || actual_quantity || 'x ' || crew_name || ' for $' || total_cost::TEXT
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Hired ' || actual_quantity || 'x ' || crew_name,
        'quantity', actual_quantity,
        'total_cost', total_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
