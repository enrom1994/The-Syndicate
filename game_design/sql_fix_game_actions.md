# Sync Game Actions with Backend

We need to create server-side functions (RPCs) to handle critical game actions like Buying Items and Hiring Crew. This is necessary to:
1.  **Bypass RLS Issues**: Fix the "row-level security" errors you are seeing.
2.  **Prevent Cheating**: Ensure players can't just modify their inventory without paying cash.
3.  **Ensure Reliability**: Make sure cash is deducted ONLY if the item is successfully added.

## Instructions

1.  Open your **Supabase Dashboard**.
2.  Go to the **SQL Editor**.
3.  Click **New Query**.
4.  Copy the code below entirely and paste it into the editor.
5.  Click **Run**.

```sql
-- Function to buy an item (atomic: check cash -> deduct cash -> add item)
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

    RETURN jsonb_build_object('success', true, 'message', 'Item purchased');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to hire crew (atomic: check cash -> deduct cash -> add crew)
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

    RETURN jsonb_build_object('success', true, 'message', 'Crew hired');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a task (atomic: check -> complete -> reward)
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

    -- Mark as completed
    INSERT INTO public.player_tasks (player_id, task_id, is_completed, completed_at)
    VALUES (player_id_input, task_id_input, true, NOW())
    ON CONFLICT (player_id, task_id)
    DO UPDATE SET 
        is_completed = true,
        completed_at = NOW();

    -- Give Reward
    IF task_reward_type = 'cash' THEN
        UPDATE public.players SET cash = cash + task_reward_amount WHERE id = player_id_input;
    ELSIF task_reward_type = 'diamonds' THEN
        UPDATE public.players SET diamonds = diamonds + task_reward_amount WHERE id = player_id_input;
    ELSIF task_reward_type = 'energy' THEN
        UPDATE public.players SET energy = LEAST(energy + task_reward_amount, max_energy) WHERE id = player_id_input;
    END IF;

    -- Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'task_reward', task_reward_type, task_reward_amount, 'Completed task: ' || task_title);

    RETURN jsonb_build_object('success', true, 'message', 'Task completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
