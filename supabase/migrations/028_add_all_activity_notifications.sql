-- =====================================================
-- ADD NOTIFICATIONS FOR ALL PLAYER ACTIVITIES
-- =====================================================
-- Updates buy_item, complete_task, upgrade_business, hire_crew,
-- and buy_business RPCs to create notifications for Activity page.
-- Also fixes notifications table to allow more types.

-- First, update the notifications table to allow more activity types
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('attack', 'income', 'job', 'family', 'system', 'bounty', 'purchase', 'upgrade', 'reward'));

-- =====================================================
-- UPDATE BUY_ITEM RPC WITH NOTIFICATION
-- =====================================================
CREATE OR REPLACE FUNCTION buy_item(
    player_id_input UUID,
    item_id_input UUID,
    quantity_input INTEGER
)
RETURNS JSONB AS $$
DECLARE
    item_cost INTEGER;
    item_name TEXT;
    current_cash BIGINT;
    total_cost BIGINT;
BEGIN
    -- Get item details
    SELECT buy_price, name INTO item_cost, item_name
    FROM public.item_definitions 
    WHERE id = item_id_input;

    IF item_cost IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    total_cost := item_cost * quantity_input;

    -- Check cash
    SELECT cash INTO current_cash FROM public.players WHERE id = player_id_input;
    
    IF current_cash IS NULL OR current_cash < total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    -- Deduct cash
    UPDATE public.players 
    SET cash = cash - total_cost, updated_at = NOW()
    WHERE id = player_id_input;

    -- Add item to inventory (Upsert)
    INSERT INTO public.player_inventory (player_id, item_id, quantity)
    VALUES (player_id_input, item_id_input, quantity_input)
    ON CONFLICT (player_id, item_id)
    DO UPDATE SET 
        quantity = player_inventory.quantity + EXCLUDED.quantity;

    -- Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'market_buy', 'cash', -total_cost, 'Bought ' || quantity_input || 'x ' || item_name);

    -- Create notification for Activity page
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        player_id_input, 
        'purchase', 
        'Item Purchased',
        'Bought ' || quantity_input || 'x ' || item_name || ' for $' || total_cost::TEXT
    );

    RETURN jsonb_build_object('success', true, 'message', 'Item purchased');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- UPDATE HIRE_CREW RPC WITH NOTIFICATION
-- =====================================================
CREATE OR REPLACE FUNCTION hire_crew(
    player_id_input UUID,
    crew_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    crew_cost INTEGER;
    crew_name TEXT;
    current_cash BIGINT;
BEGIN
    -- Get crew details
    SELECT hire_cost, name INTO crew_cost, crew_name
    FROM public.crew_definitions 
    WHERE id = crew_id_input;

    IF crew_cost IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Crew definition not found');
    END IF;

    -- Check cash
    SELECT cash INTO current_cash FROM public.players WHERE id = player_id_input;
    
    IF current_cash IS NULL OR current_cash < crew_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    -- Deduct cash
    UPDATE public.players 
    SET cash = cash - crew_cost, updated_at = NOW()
    WHERE id = player_id_input;

    -- Add crew member (Upsert)
    INSERT INTO public.player_crew (player_id, crew_id, quantity)
    VALUES (player_id_input, crew_id_input, 1)
    ON CONFLICT (player_id, crew_id)
    DO UPDATE SET 
        quantity = player_crew.quantity + 1;

    -- Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'crew_hire', 'cash', -crew_cost, 'Hired ' || crew_name);

    -- Create notification for Activity page
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        player_id_input, 
        'purchase', 
        'Crew Hired',
        'Hired ' || crew_name || ' for $' || crew_cost::TEXT
    );

    RETURN jsonb_build_object('success', true, 'message', 'Crew hired');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- UPDATE COMPLETE_TASK RPC WITH NOTIFICATION
-- =====================================================
CREATE OR REPLACE FUNCTION complete_task(
    player_id_input UUID,
    task_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    task_reward_type TEXT;
    task_reward_amount INTEGER;
    task_title TEXT;
    is_already_completed BOOLEAN;
    reward_display TEXT;
BEGIN
    -- Get task details
    SELECT reward_type, reward_amount, title INTO task_reward_type, task_reward_amount, task_title
    FROM public.task_definitions
    WHERE id = task_id_input;

    IF task_reward_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task not found');
    END IF;

    -- Check if already completed
    SELECT is_completed INTO is_already_completed
    FROM public.player_tasks
    WHERE player_id = player_id_input AND task_id = task_id_input;

    IF is_already_completed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Task already completed');
    END IF;

    -- Mark as completed (Upsert)
    INSERT INTO public.player_tasks (player_id, task_id, is_completed, completed_at)
    VALUES (player_id_input, task_id_input, true, NOW())
    ON CONFLICT (player_id, task_id)
    DO UPDATE SET 
        is_completed = true,
        completed_at = NOW();

    -- Give Reward
    IF task_reward_type = 'cash' THEN
        UPDATE public.players SET cash = cash + task_reward_amount WHERE id = player_id_input;
        reward_display := '$' || task_reward_amount::TEXT;
    ELSIF task_reward_type = 'diamonds' THEN
        UPDATE public.players SET diamonds = diamonds + task_reward_amount WHERE id = player_id_input;
        reward_display := task_reward_amount::TEXT || ' 💎';
    ELSIF task_reward_type = 'energy' THEN
        UPDATE public.players SET energy = LEAST(energy + task_reward_amount, max_energy) WHERE id = player_id_input;
        reward_display := task_reward_amount::TEXT || ' ⚡';
    ELSE
        reward_display := task_reward_amount::TEXT || ' ' || task_reward_type;
    END IF;

    -- Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'task_reward', task_reward_type, task_reward_amount, 'Completed task: ' || task_title);

    -- Create notification for Activity page
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        player_id_input, 
        'reward', 
        'Task Completed',
        'Completed "' || task_title || '" and earned ' || reward_display
    );

    RETURN jsonb_build_object('success', true, 'message', 'Task completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- UPDATE UPGRADE_BUSINESS RPC WITH NOTIFICATION
-- =====================================================
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
    business_name TEXT;
    upgrade_cost BIGINT;
    player_cash BIGINT;
    new_level INTEGER;
BEGIN
    -- 1. Get player business details with name
    SELECT pb.*, bd.base_purchase_cost, bd.upgrade_cost_multiplier, bd.max_level, bd.name
    INTO business_record
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.id = player_business_id_input AND pb.player_id = player_id_input;

    IF business_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found or not owned');
    END IF;

    business_name := business_record.name;
    new_level := business_record.level + 1;

    -- 2. Check Max Level
    IF business_record.level >= business_record.max_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max level reached');
    END IF;

    -- 3. Calculate Upgrade Cost
    upgrade_cost := (business_record.base_purchase_cost * POWER(business_record.upgrade_cost_multiplier, business_record.level))::BIGINT;

    -- 4. Check Cash
    SELECT cash INTO player_cash
    FROM players
    WHERE id = player_id_input;

    IF player_cash < upgrade_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    -- 5. Execute Transaction
    UPDATE players
    SET cash = cash - upgrade_cost
    WHERE id = player_id_input;

    -- Update business level
    UPDATE player_businesses
    SET level = new_level
    WHERE id = player_business_id_input;

    -- Log transaction
    INSERT INTO transactions (player_id, amount, currency, transaction_type, description)
    VALUES (player_id_input, -upgrade_cost, 'cash', 'business_upgrade', 'Upgraded ' || business_name || ' to level ' || new_level::TEXT);

    -- Create notification for Activity page
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        player_id_input, 
        'upgrade', 
        'Business Upgraded',
        'Upgraded ' || business_name || ' to level ' || new_level::TEXT || ' for $' || upgrade_cost::TEXT
    );

    RETURN jsonb_build_object('success', true, 'message', 'Business upgraded successfully');
END;
$$;


-- =====================================================
-- UPDATE BUY_BUSINESS RPC WITH NOTIFICATION
-- =====================================================
CREATE OR REPLACE FUNCTION buy_business(
    player_id_input UUID,
    business_id_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    business_cost BIGINT;
    player_cash BIGINT;
    existing_business_id TEXT;
    def_id UUID;
    def_price INTEGER;
    business_name TEXT;
BEGIN
    -- 1. Check if business exists and get cost + name
    SELECT id, base_purchase_cost, name INTO def_id, def_price, business_name
    FROM business_definitions
    WHERE id = business_id_input::UUID;

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
    UPDATE players
    SET cash = cash - business_cost
    WHERE id = player_id_input;

    -- Grant business
    INSERT INTO player_businesses (player_id, business_id, level, last_collected)
    VALUES (player_id_input, def_id, 1, NOW());

    -- Log transaction
    INSERT INTO transactions (player_id, amount, currency, transaction_type, description)
    VALUES (player_id_input, -business_cost, 'cash', 'business_purchase', 'Bought ' || business_name);

    -- Create notification for Activity page
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        player_id_input, 
        'purchase', 
        'Business Purchased',
        'Bought ' || business_name || ' for $' || business_cost::TEXT
    );

    RETURN jsonb_build_object('success', true, 'message', 'Business purchased successfully');
END;
$$;
