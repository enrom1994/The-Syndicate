-- =====================================================
-- PROTECTION SYSTEMS: NPP FIX + INSURANCE
-- =====================================================
-- 1. Fix NPP (New Player Protection) - not currently enforced
-- 2. Add Insurance system for loss mitigation

-- Set search path for SQL Editor compatibility
SET search_path = public;

-- =====================================================
-- 1. FIX NPP DURATION (36h instead of 48h)
-- =====================================================
ALTER TABLE public.players 
ALTER COLUMN newbie_shield_expires_at 
SET DEFAULT (NOW() + INTERVAL '36 hours');

COMMENT ON COLUMN public.players.newbie_shield_expires_at IS 'New Player Protection: blocks all PvP for 36 hours from signup';


-- =====================================================
-- 2. INSURANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.player_insurance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    insurance_type TEXT NOT NULL CHECK (insurance_type IN ('basic', 'premium')),
    mitigation_percent INTEGER NOT NULL, -- 30 or 50
    max_coverage BIGINT NOT NULL, -- max cash protected per incident
    claims_remaining INTEGER NOT NULL DEFAULT 1, -- how many times it can be used
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, insurance_type)
);

-- RLS
ALTER TABLE public.player_insurance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view own insurance" ON public.player_insurance;
CREATE POLICY "Players can view own insurance" 
    ON public.player_insurance FOR SELECT 
    USING (player_id = auth.uid());

-- Index for quick lookup during combat
CREATE INDEX IF NOT EXISTS idx_player_insurance_player ON public.player_insurance(player_id);

COMMENT ON TABLE public.player_insurance IS 'Insurance mitigates PvP losses when no shield is active';


-- =====================================================
-- 3. PURCHASE INSURANCE RPC
-- =====================================================
CREATE OR REPLACE FUNCTION purchase_insurance(
    player_id_input UUID,
    insurance_type_input TEXT -- 'basic' or 'premium'
)
RETURNS JSONB AS $$
DECLARE
    mitigation INTEGER;
    max_cov BIGINT;
    claims INTEGER;
BEGIN
    -- Validate insurance type
    IF insurance_type_input NOT IN ('basic', 'premium') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid insurance type');
    END IF;

    -- Set tier values
    IF insurance_type_input = 'basic' THEN
        mitigation := 30;
        max_cov := 50000;
        claims := 1;
    ELSE -- premium
        mitigation := 50;
        max_cov := 200000;
        claims := 3;
    END IF;

    -- Insert or update (extend) insurance
    INSERT INTO public.player_insurance (
        player_id, insurance_type, mitigation_percent, max_coverage, claims_remaining
    )
    VALUES (
        player_id_input, insurance_type_input, mitigation, max_cov, claims
    )
    ON CONFLICT (player_id, insurance_type) 
    DO UPDATE SET 
        claims_remaining = player_insurance.claims_remaining + claims,
        purchased_at = NOW();

    -- Log transaction
    INSERT INTO public.transactions (player_id, transaction_type, currency, amount, description)
    VALUES (player_id_input, 'purchase', 'ton', 
            CASE WHEN insurance_type_input = 'basic' THEN -2 ELSE -5 END, 
            'Purchased ' || insurance_type_input || ' insurance');

    -- Notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (player_id_input, 'purchase', '🛡️ Insurance Purchased', 
            CASE WHEN insurance_type_input = 'basic' 
                THEN 'Basic Insurance: 30% loss reduction, up to $50K, 1 claim'
                ELSE 'Premium Insurance: 50% loss reduction, up to $200K, 3 claims'
            END);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Insurance purchased successfully',
        'insurance_type', insurance_type_input,
        'mitigation_percent', mitigation,
        'max_coverage', max_cov,
        'claims', claims
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.purchase_insurance(UUID, TEXT) SET search_path = public;


-- =====================================================
-- 4. GET PLAYER INSURANCE STATUS
-- =====================================================
CREATE OR REPLACE FUNCTION get_player_insurance(player_id_input UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'insurance_type', insurance_type,
            'mitigation_percent', mitigation_percent,
            'max_coverage', max_coverage,
            'claims_remaining', claims_remaining
        ))
        FROM public.player_insurance
        WHERE player_id = player_id_input AND claims_remaining > 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_player_insurance(UUID) SET search_path = public;


-- =====================================================
-- 5. UPDATE PERFORM_PVP_ATTACK WITH NPP + INSURANCE
-- =====================================================
-- Drop existing to recreate with new signature
DROP FUNCTION IF EXISTS perform_pvp_attack(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION perform_pvp_attack(
    attacker_id_input UUID,
    defender_id_input UUID,
    attack_type_input TEXT
)
RETURNS JSONB AS $$
DECLARE
    attack_type RECORD;
    attacker RECORD;
    defender RECORD;
    attacker_strength INTEGER;
    defender_strength INTEGER;
    strength_ratio FLOAT;
    
    -- Consumable check
    consumable_item RECORD;
    player_consumable_qty INTEGER;
    
    -- Booster checks
    has_attack_boost BOOLEAN := false;
    has_shield BOOLEAN := false;
    
    -- Insurance
    defender_insurance RECORD;
    insurance_applied BOOLEAN := false;
    insurance_savings BIGINT := 0;
    
    win_chance INTEGER;
    roll INTEGER;
    attacker_wins BOOLEAN;
    
    -- Losses/gains
    base_cash_stolen BIGINT := 0;
    cash_stolen BIGINT := 0;
    vault_stolen BIGINT := 0;
    contraband_stolen INTEGER := 0;
    respect_stolen INTEGER := 0;
    crew_killed INTEGER := 0;
    
    -- Attacker losses on defeat
    attacker_consumable_loss INTEGER := 0;
    attacker_crew_loss INTEGER := 0;
    attacker_respect_loss INTEGER := 0;
    
    random_item_id UUID;
    random_qty INTEGER;
    stolen_item_name TEXT;
BEGIN
    -- Get attack type
    SELECT * INTO attack_type FROM public.pvp_attack_types WHERE id = attack_type_input AND is_active = true;
    IF attack_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid attack type');
    END IF;

    -- Can't attack self
    IF attacker_id_input = defender_id_input THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot attack yourself');
    END IF;

    -- Get attacker with crew stats and items
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER as crew_defense,
           COALESCE(SUM(pc.quantity), 0)::INTEGER as total_crew,
           COALESCE((SELECT SUM(id.attack_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_attack,
           COALESCE((SELECT SUM(id.defense_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_defense
    INTO attacker
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = attacker_id_input
    GROUP BY p.id;

    -- Get defender with crew stats and items
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0)::INTEGER as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0)::INTEGER as crew_defense,
           COALESCE(SUM(pc.quantity), 0)::INTEGER as total_crew,
           COALESCE((SELECT SUM(id.attack_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_attack,
           COALESCE((SELECT SUM(id.defense_bonus * pi.quantity) FROM player_inventory pi JOIN item_definitions id ON pi.item_id = id.id WHERE pi.player_id = p.id), 0)::INTEGER as item_defense
    INTO defender
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = defender_id_input
    GROUP BY p.id;

    IF attacker IS NULL OR defender IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    -- =====================================================
    -- CHECK NEW PLAYER PROTECTION (NPP)
    -- =====================================================
    IF defender.newbie_shield_expires_at > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Target is under New Player Protection',
            'npp_expires_at', defender.newbie_shield_expires_at
        );
    END IF;

    -- Check stamina
    IF attacker.stamina < attack_type.stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;

    -- Check crew requirement
    IF attack_type.requires_crew AND attacker.total_crew = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'This attack requires crew members');
    END IF;

    -- Check consumable requirement
    IF attack_type.requires_consumables AND attack_type.consumable_item_name IS NOT NULL THEN
        SELECT * INTO consumable_item FROM public.item_definitions WHERE name = attack_type.consumable_item_name;
        
        IF consumable_item IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Consumable item not found: ' || attack_type.consumable_item_name);
        END IF;
        
        SELECT COALESCE(quantity, 0) INTO player_consumable_qty
        FROM public.player_inventory
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id;
        
        IF player_consumable_qty < attack_type.consumable_qty THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Need ' || attack_type.consumable_qty || 'x ' || attack_type.consumable_item_name || ' (have ' || COALESCE(player_consumable_qty, 0) || ')'
            );
        END IF;
        
        -- Deduct consumables
        UPDATE public.player_inventory 
        SET quantity = quantity - attack_type.consumable_qty
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id;
        
        DELETE FROM public.player_inventory 
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id AND quantity <= 0;
    END IF;

    -- Check for boosters
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = attacker_id_input 
        AND booster_type = '2x_attack' 
        AND expires_at > NOW()
    ) INTO has_attack_boost;
    
    SELECT EXISTS (
        SELECT 1 FROM player_boosters 
        WHERE player_id = defender_id_input 
        AND booster_type = 'shield' 
        AND expires_at > NOW()
    ) INTO has_shield;

    -- Calculate strengths
    attacker_strength := (attacker.level * 10) + attacker.crew_attack + attacker.item_attack + (attacker.respect / 10);
    defender_strength := (defender.level * 10) + defender.crew_defense + defender.item_defense + (defender.respect / 10);
    
    IF has_attack_boost THEN
        attacker_strength := attacker_strength * 2;
    END IF;
    
    IF has_shield THEN
        defender_strength := defender_strength * 2;
    END IF;

    IF defender_strength < 1 THEN defender_strength := 1; END IF;

    -- Calculate win chance
    strength_ratio := attacker_strength::FLOAT / defender_strength::FLOAT;
    
    IF strength_ratio >= 2.0 THEN
        win_chance := 85;
    ELSIF strength_ratio >= 1.5 THEN
        win_chance := 70;
    ELSIF strength_ratio >= 1.0 THEN
        win_chance := 55;
    ELSIF strength_ratio >= 0.75 THEN
        win_chance := 40;
    ELSIF strength_ratio >= 0.5 THEN
        win_chance := 25;
    ELSE
        win_chance := 15;
    END IF;

    -- Deduct stamina
    UPDATE public.players SET stamina = stamina - attack_type.stamina_cost WHERE id = attacker_id_input;

    -- Roll for victory
    roll := floor(random() * 100) + 1;
    attacker_wins := roll <= win_chance;

    -- =====================================================
    -- ATTACKER WINS
    -- =====================================================
    IF attacker_wins THEN
        IF attack_type.steals_cash THEN
            base_cash_stolen := LEAST(
                (defender.cash * attack_type.cash_steal_percent / 100)::BIGINT,
                (defender.cash * 0.45)::BIGINT
            );
            cash_stolen := base_cash_stolen;
        END IF;

        IF attack_type.steals_vault THEN
            vault_stolen := LEAST(
                (defender.banked_cash * attack_type.vault_steal_percent / 100)::BIGINT,
                (defender.banked_cash * 0.15)::BIGINT
            );
        END IF;

        IF attack_type.steals_respect THEN
            respect_stolen := LEAST((defender.respect * 0.10)::INTEGER, 100);
        END IF;

        IF attack_type.kills_crew THEN
            crew_killed := LEAST(defender.total_crew / 4, 5);
        END IF;

        -- =====================================================
        -- APPLY INSURANCE (only if no shield active)
        -- =====================================================
        IF NOT has_shield AND (cash_stolen > 0 OR vault_stolen > 0) THEN
            -- Get defender's best insurance
            SELECT * INTO defender_insurance
            FROM public.player_insurance
            WHERE player_id = defender_id_input AND claims_remaining > 0
            ORDER BY mitigation_percent DESC
            LIMIT 1;
            
            IF defender_insurance IS NOT NULL THEN
                insurance_applied := true;
                
                -- Calculate savings (capped at max_coverage)
                insurance_savings := LEAST(
                    ((cash_stolen + vault_stolen) * defender_insurance.mitigation_percent / 100)::BIGINT,
                    defender_insurance.max_coverage
                );
                
                -- Apply mitigation to cash first
                IF cash_stolen > 0 THEN
                    cash_stolen := GREATEST(0, cash_stolen - insurance_savings);
                END IF;
                
                -- Decrement insurance claims
                UPDATE public.player_insurance 
                SET claims_remaining = claims_remaining - 1 
                WHERE id = defender_insurance.id;
                
                -- Clean up exhausted insurance
                DELETE FROM public.player_insurance WHERE id = defender_insurance.id AND claims_remaining <= 0;
            END IF;
        END IF;

        -- Apply gains/losses
        UPDATE public.players SET 
            cash = cash + cash_stolen + vault_stolen,
            respect = respect + respect_stolen + 5
        WHERE id = attacker_id_input;

        UPDATE public.players SET 
            cash = GREATEST(0, cash - cash_stolen),
            banked_cash = GREATEST(0, banked_cash - vault_stolen),
            respect = GREATEST(0, respect - respect_stolen - 3)
        WHERE id = defender_id_input;

        -- Kill defender crew
        IF crew_killed > 0 THEN
            WITH random_crew AS (
                SELECT id FROM public.player_crew 
                WHERE player_id = defender_id_input AND quantity > 0
                ORDER BY random() LIMIT 1
            )
            UPDATE public.player_crew pc
            SET quantity = GREATEST(0, quantity - crew_killed)
            FROM random_crew rc
            WHERE pc.id = rc.id;
        END IF;

        -- Steal contraband
        IF attack_type.steals_contraband THEN
            SELECT pi.item_id, LEAST(pi.quantity, 2), id.name INTO random_item_id, random_qty, stolen_item_name
            FROM public.player_inventory pi
            JOIN public.item_definitions id ON pi.item_id = id.id
            WHERE pi.player_id = defender_id_input AND id.category = 'contraband' AND pi.quantity > 0
            ORDER BY random() LIMIT 1;

            IF random_item_id IS NOT NULL THEN
                contraband_stolen := random_qty;
                
                UPDATE public.player_inventory SET quantity = quantity - random_qty 
                WHERE player_id = defender_id_input AND item_id = random_item_id;
                
                INSERT INTO public.player_inventory (player_id, item_id, quantity)
                VALUES (attacker_id_input, random_item_id, random_qty)
                ON CONFLICT (player_id, item_id)
                DO UPDATE SET quantity = player_inventory.quantity + random_qty;
            END IF;
        END IF;

    -- =====================================================
    -- ATTACKER LOSES
    -- =====================================================
    ELSE
        IF strength_ratio < 0.5 THEN
            attacker_respect_loss := 10;
        ELSIF strength_ratio < 1.0 THEN
            attacker_respect_loss := 5;
        ELSE
            attacker_respect_loss := 2;
        END IF;

        IF attack_type.requires_crew AND attacker.total_crew > 0 THEN
            attacker_crew_loss := LEAST(2, attacker.total_crew / 5);
            
            WITH random_crew AS (
                SELECT id FROM public.player_crew 
                WHERE player_id = attacker_id_input AND quantity > 0
                ORDER BY random() LIMIT 1
            )
            UPDATE public.player_crew pc
            SET quantity = GREATEST(0, quantity - attacker_crew_loss)
            FROM random_crew rc
            WHERE pc.id = rc.id;
        END IF;

        UPDATE public.players SET respect = GREATEST(0, respect - attacker_respect_loss) WHERE id = attacker_id_input;
        UPDATE public.players SET respect = respect + 3 WHERE id = defender_id_input;
    END IF;

    -- Log the attack
    INSERT INTO public.attack_log (attacker_id, defender_id, attack_type, attacker_won, cash_stolen, respect_change)
    VALUES (
        attacker_id_input, 
        defender_id_input, 
        attack_type_input,
        attacker_wins, 
        COALESCE(cash_stolen + vault_stolen, 0)::INTEGER,
        CASE WHEN attacker_wins THEN respect_stolen + 5 ELSE -attacker_respect_loss END
    );

    -- Notifications
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES 
        (attacker_id_input, 'attack', 
         CASE WHEN attacker_wins THEN 'Attack Successful!' ELSE 'Attack Failed!' END,
         CASE WHEN attacker_wins 
            THEN 'Hit ' || defender.username || ' with ' || attack_type.name || '. Stole $' || (cash_stolen + vault_stolen)
            ELSE 'Failed ' || attack_type.name || ' on ' || defender.username || '. Lost ' || attacker_respect_loss || ' respect'
         END),
        (defender_id_input, 'attack',
         CASE WHEN attacker_wins THEN 'You Were Attacked!' ELSE 'Attack Defended!' END,
         CASE WHEN attacker_wins 
            THEN attacker.username || ' hit you with ' || attack_type.name || '. Lost $' || (cash_stolen + vault_stolen) ||
                 CASE WHEN insurance_applied THEN ' (Insurance saved $' || insurance_savings || ')' ELSE '' END
            ELSE 'Successfully defended against ' || attacker.username || '''s ' || attack_type.name
         END);

    RETURN jsonb_build_object(
        'success', true,
        'result', CASE WHEN attacker_wins THEN 'victory' ELSE 'defeat' END,
        'attack_type', attack_type.name,
        'defender_name', defender.username,
        'win_chance', win_chance,
        'roll', roll,
        'cash_stolen', cash_stolen + vault_stolen,
        'respect_stolen', respect_stolen,
        'contraband_stolen', contraband_stolen,
        'stolen_item_name', stolen_item_name,
        'crew_killed', crew_killed,
        'attacker_crew_loss', attacker_crew_loss,
        'attacker_respect_loss', attacker_respect_loss,
        'consumable_used', attack_type.consumable_item_name,
        'consumable_qty_used', attack_type.consumable_qty,
        'had_attack_boost', has_attack_boost,
        'defender_had_shield', has_shield,
        'insurance_applied', insurance_applied,
        'insurance_savings', insurance_savings
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.perform_pvp_attack(UUID, UUID, TEXT) SET search_path = public;

COMMENT ON FUNCTION perform_pvp_attack(UUID, UUID, TEXT) IS 'PvP attack with NPP check, shield check, and insurance mitigation';
