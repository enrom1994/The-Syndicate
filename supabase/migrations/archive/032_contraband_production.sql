-- =====================================================
-- CONTRABAND PRODUCTION SYSTEM
-- =====================================================
-- Players can produce contraband by consuming crew members
-- at specific businesses they own.

-- Table to store production recipes
CREATE TABLE IF NOT EXISTS public.contraband_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_definitions(id),
    crew_id UUID NOT NULL REFERENCES public.crew_definitions(id),
    crew_required INTEGER NOT NULL DEFAULT 5,
    output_item_id UUID NOT NULL REFERENCES public.item_definitions(id),
    output_quantity INTEGER NOT NULL DEFAULT 10,
    cooldown_hours INTEGER NOT NULL DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track player production cooldowns
CREATE TABLE IF NOT EXISTS public.player_production_cooldowns (
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES public.contraband_recipes(id) ON DELETE CASCADE,
    last_produced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, recipe_id)
);

-- Enable RLS
ALTER TABLE public.contraband_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_production_cooldowns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read recipes" ON public.contraband_recipes FOR SELECT USING (true);
CREATE POLICY "Players can view own cooldowns" ON public.player_production_cooldowns 
    FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "Players can manage own cooldowns" ON public.player_production_cooldowns 
    FOR ALL USING (auth.uid() = player_id);


-- =====================================================
-- PRODUCE CONTRABAND RPC
-- =====================================================
CREATE OR REPLACE FUNCTION produce_contraband(
    producer_id UUID,
    target_recipe_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recipe RECORD;
    owned_business RECORD;
    crew_owned INTEGER;
    last_produced TIMESTAMPTZ;
    hours_since INTEGER;
    output_multiplier INTEGER;
BEGIN
    -- Get recipe details
    SELECT r.*, 
           bd.name as business_name,
           cd.name as crew_name,
           id.name as item_name
    INTO recipe
    FROM contraband_recipes r
    JOIN business_definitions bd ON r.business_id = bd.id
    JOIN crew_definitions cd ON r.crew_id = cd.id
    JOIN item_definitions id ON r.output_item_id = id.id
    WHERE r.id = target_recipe_id;
    
    IF recipe IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Recipe not found.');
    END IF;
    
    -- Check player owns the required business
    SELECT pb.* INTO owned_business
    FROM player_businesses pb
    WHERE pb.player_id = producer_id 
      AND pb.business_id = recipe.business_id;
    
    IF owned_business IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You need to own a ' || recipe.business_name || ' to produce this.');
    END IF;
    
    -- Check cooldown
    SELECT last_produced_at INTO last_produced
    FROM player_production_cooldowns
    WHERE player_id = producer_id AND recipe_id = target_recipe_id;
    
    IF last_produced IS NOT NULL THEN
        hours_since := EXTRACT(EPOCH FROM (NOW() - last_produced)) / 3600;
        IF hours_since < recipe.cooldown_hours THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Production on cooldown. ' || (recipe.cooldown_hours - hours_since) || ' hours remaining.'
            );
        END IF;
    END IF;
    
    -- Check player has enough crew
    SELECT COALESCE(quantity, 0) INTO crew_owned
    FROM player_crew
    WHERE player_id = producer_id AND crew_id = recipe.crew_id;
    
    IF crew_owned < recipe.crew_required THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Not enough ' || recipe.crew_name || '. Need ' || recipe.crew_required || ', have ' || crew_owned || '.'
        );
    END IF;
    
    -- Calculate output multiplier based on business level (10% bonus per level above 1)
    output_multiplier := recipe.output_quantity + ((owned_business.level - 1) * CEIL(recipe.output_quantity * 0.1));
    
    -- Consume crew
    UPDATE player_crew
    SET quantity = quantity - recipe.crew_required
    WHERE player_id = producer_id AND crew_id = recipe.crew_id;
    
    -- Delete crew record if quantity is 0
    DELETE FROM player_crew
    WHERE player_id = producer_id AND crew_id = recipe.crew_id AND quantity <= 0;
    
    -- Add contraband to inventory
    INSERT INTO player_inventory (player_id, item_id, quantity)
    VALUES (producer_id, recipe.output_item_id, output_multiplier)
    ON CONFLICT (player_id, item_id) 
    DO UPDATE SET quantity = player_inventory.quantity + output_multiplier;
    
    -- Set cooldown
    INSERT INTO player_production_cooldowns (player_id, recipe_id, last_produced_at)
    VALUES (producer_id, target_recipe_id, NOW())
    ON CONFLICT (player_id, recipe_id) 
    DO UPDATE SET last_produced_at = NOW();
    
    -- Create notification
    INSERT INTO notifications (player_id, type, title, description)
    VALUES (
        producer_id,
        'reward',
        'Production Complete!',
        'Produced ' || output_multiplier || 'x ' || recipe.item_name || ' at ' || recipe.business_name
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Produced ' || output_multiplier || 'x ' || recipe.item_name || '!',
        'item_name', recipe.item_name,
        'quantity', output_multiplier,
        'crew_consumed', recipe.crew_required,
        'crew_type', recipe.crew_name
    );
END;
$$;


-- =====================================================
-- GET AVAILABLE RECIPES RPC
-- =====================================================
CREATE OR REPLACE FUNCTION get_production_recipes(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recipes_array JSONB;
BEGIN
    SELECT json_agg(json_build_object(
        'id', r.id,
        'business_id', r.business_id,
        'business_name', bd.name,
        'crew_id', r.crew_id,
        'crew_name', cd.name,
        'crew_required', r.crew_required,
        'crew_owned', COALESCE(pc.quantity, 0),
        'output_item_id', r.output_item_id,
        'output_item_name', id.name,
        'output_quantity', r.output_quantity,
        'cooldown_hours', r.cooldown_hours,
        'owns_business', pb.id IS NOT NULL,
        'business_level', COALESCE(pb.level, 0),
        'last_produced_at', ppc.last_produced_at,
        'can_produce', pb.id IS NOT NULL 
            AND COALESCE(pc.quantity, 0) >= r.crew_required
            AND (ppc.last_produced_at IS NULL OR 
                 EXTRACT(EPOCH FROM (NOW() - ppc.last_produced_at)) / 3600 >= r.cooldown_hours)
    ))
    INTO recipes_array
    FROM contraband_recipes r
    JOIN business_definitions bd ON r.business_id = bd.id
    JOIN crew_definitions cd ON r.crew_id = cd.id
    JOIN item_definitions id ON r.output_item_id = id.id
    LEFT JOIN player_businesses pb ON pb.business_id = r.business_id AND pb.player_id = target_player_id
    LEFT JOIN player_crew pc ON pc.crew_id = r.crew_id AND pc.player_id = target_player_id
    LEFT JOIN player_production_cooldowns ppc ON ppc.recipe_id = r.id AND ppc.player_id = target_player_id;
    
    RETURN COALESCE(recipes_array, '[]'::jsonb);
END;
$$;
