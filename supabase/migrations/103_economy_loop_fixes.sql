-- =====================================================
-- ECONOMY LOOP FIXES & REFINEMENTS
-- =====================================================
-- 1. Enable Selling Items (Black Market Loop)
-- 2. Enable Job Item Consumption (Burn Loop)
-- 3. Enable Family Inventory (Storage Loop)

-- =====================================================
-- 1. SELL ITEM RPC
-- =====================================================
-- Drop existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS sell_item(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS sell_item(UUID, UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION sell_item(
    player_id_input UUID,
    item_id_input UUID,
    quantity_input INTEGER
)
RETURNS JSONB AS $$
DECLARE
    item_def RECORD;
    player_item RECORD;
    total_value BIGINT;
BEGIN
    -- Validate quantity
    IF quantity_input <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;

    -- Get item definition
    SELECT * INTO item_def FROM public.item_definitions WHERE id = item_id_input;
    IF item_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item definition not found');
    END IF;

    -- Check if item is sellable
    IF item_def.sell_price <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'This item cannot be sold');
    END IF;

    -- Check player inventory
    SELECT * INTO player_item 
    FROM public.player_inventory 
    WHERE player_id = player_id_input AND item_id = item_id_input;

    IF player_item IS NULL OR player_item.quantity < quantity_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough items to sell');
    END IF;

    -- Calculate value
    total_value := item_def.sell_price * quantity_input;

    -- Deduct Item
    UPDATE public.player_inventory
    SET quantity = quantity - quantity_input,
        -- If equipped/assigned quantity exceeds new total, clamp it down
        assigned_quantity = LEAST(assigned_quantity, quantity - quantity_input)
    WHERE id = player_item.id;

    -- Add Cash
    UPDATE public.players
    SET cash = cash + total_value,
        updated_at = NOW()
    WHERE id = player_id_input;

    -- Log Transaction
    -- INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    -- VALUES (player_id_input, 'sell_item', 'cash', total_value, 'Sold Items');

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Sold successfully',
        'cash_earned', total_value,
        'new_balance', (SELECT cash FROM public.players WHERE id = player_id_input)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 2. JOB CONSUMPTION LOGIC
-- =====================================================

-- Add consumption columns to job_definitions if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_definitions' AND column_name = 'required_item_id') THEN
        ALTER TABLE public.job_definitions ADD COLUMN required_item_id UUID REFERENCES public.item_definitions(id);
        ALTER TABLE public.job_definitions ADD COLUMN required_item_quantity INTEGER DEFAULT 0;
    END IF;
END $$;


-- Drop existing function if it has different parameter defaults
DROP FUNCTION IF EXISTS perform_job(UUID, UUID);

-- Update perform_job to handle item consumption
CREATE OR REPLACE FUNCTION perform_job(
    player_id_input UUID,
    job_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    job_def RECORD;
    player_rec RECORD;
    new_xp INTEGER;
    new_level INTEGER;
    energy_cost INTEGER;
    player_item_qty INTEGER;
BEGIN
    -- Get job details
    SELECT * INTO job_def FROM public.job_definitions WHERE id = job_id_input;
    IF job_def IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Job not found');
    END IF;

    -- Get player details
    SELECT * INTO player_rec FROM public.players WHERE id = player_id_input;
    IF player_rec IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    -- Check Cooldown
    -- (Simplified check, assuming client handles basic UX, strict check would be here)

    -- Check Requirements (Level)
    IF player_rec.level < job_def.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Level too low');
    END IF;

    -- Check Requirements (Item Consumption)
    IF job_def.required_item_id IS NOT NULL AND job_def.required_item_quantity > 0 THEN
        SELECT quantity INTO player_item_qty 
        FROM public.player_inventory 
        WHERE player_id = player_id_input AND item_id = job_def.required_item_id;

        IF COALESCE(player_item_qty, 0) < job_def.required_item_quantity THEN
             RETURN jsonb_build_object('success', false, 'message', 'Missing required items for this job');
        END IF;
    END IF;

    -- Check Energy
    energy_cost := job_def.energy_cost;
    IF player_rec.energy < energy_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough energy');
    END IF;

    -- EXECUTE JOB
    
    -- Deduct Energy
    UPDATE public.players 
    SET energy = energy - energy_cost, 
        last_energy_update = NOW()
    WHERE id = player_id_input;

    -- Deduct Consumables (The Burn)
    IF job_def.required_item_id IS NOT NULL AND job_def.required_item_quantity > 0 THEN
        UPDATE public.player_inventory
        SET quantity = quantity - job_def.required_item_quantity
        WHERE player_id = player_id_input AND item_id = job_def.required_item_id;
    END IF;

    -- Calculate Rewards
    -- (Success/Fail logic could go here, assumes 100% success for basic jobs for now)
    
    -- Award Cash & XP & Respect
    UPDATE public.players
    SET cash = cash + job_def.cash_reward,
        experience = experience + job_def.experience_reward,
        respect = respect + COALESCE(job_def.respect_reward, 0),
        total_jobs_completed = total_jobs_completed + 1
    WHERE id = player_id_input
    RETURNING experience, level INTO new_xp, new_level;

    -- Return Result
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Job completed!',
        'cash_earned', job_def.cash_reward,
        'xp_earned', job_def.experience_reward,
        'respect_earned', COALESCE(job_def.respect_reward, 0),
        'items_consumed', job_def.required_item_quantity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 3. FAMILY INVENTORY & CONTRIBUTION
-- =====================================================

-- Add inventory column to families (JSONB for flexibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'families' AND column_name = 'inventory') THEN
        ALTER TABLE public.families ADD COLUMN inventory JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- RPC to contribute items
CREATE OR REPLACE FUNCTION contribute_item_to_family(
    player_id_input UUID,
    item_id_input UUID,
    quantity_input INTEGER
)
RETURNS JSONB AS $$
DECLARE
    membership RECORD;
    player_item RECORD;
    item_def RECORD;
    current_fam_qty INTEGER;
BEGIN
    -- Validate quantity
    IF quantity_input <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;

    -- Check Membership
    SELECT * INTO membership FROM public.family_members WHERE player_id = player_id_input;
    IF membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family');
    END IF;

    -- Get Item Def
    SELECT * INTO item_def FROM public.item_definitions WHERE id = item_id_input;

    -- Check Player Inventory
    SELECT * INTO player_item 
    FROM public.player_inventory 
    WHERE player_id = player_id_input AND item_id = item_id_input;

    IF player_item IS NULL OR player_item.quantity < quantity_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough items');
    END IF;

    -- Deduct from Player
    UPDATE public.player_inventory
    SET quantity = quantity - quantity_input,
        assigned_quantity = LEAST(assigned_quantity, quantity - quantity_input)
    WHERE id = player_item.id;

    -- Add to Family Inventory (JSONB manipulation)
    -- We use a simple JSON object where Key = ItemName or ItemID and Value = Quantity
    -- For robustness, we'll assume Key = ItemID (UUID)
    
    UPDATE public.families
    SET inventory = jsonb_set(
        COALESCE(inventory, '{}'::jsonb),
        ARRAY[item_id_input::text],
        to_jsonb(
            COALESCE((inventory->>item_id_input::text)::int, 0) + quantity_input
        )
    ),
    updated_at = NOW()
    WHERE id = membership.family_id;

    -- Log Contribution
    -- (We might want a specific family_logs table later, using transactions for now or just generic log)
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contributed ' || quantity_input || ' ' || item_def.name || ' to family armory.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
