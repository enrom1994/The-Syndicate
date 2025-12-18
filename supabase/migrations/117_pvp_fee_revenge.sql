-- =====================================================
-- PVP CASH FEE + REVENGE SYSTEM
-- =====================================================
-- Reduces spam, prevents griefing, increases meaningful PvP
-- 
-- FEE STRUCTURE (by attacker tier):
--   Early game (0-999 respect): $500
--   Mid game (1000-4999 respect): $1,000
--   Late game (5000+ respect): $2,000
--
-- REVENGE RULES:
--   - Available 24h after being attacked
--   - Same fee as normal PvP
--   - Cannot target protected/shielded players
--   - One revenge per attack (no chaining)
--   - Counts as normal PvP win

SET search_path = public;

-- =====================================================
-- 1. ADD REVENGE TRACKING TO ATTACK_LOG
-- =====================================================

ALTER TABLE public.attack_log ADD COLUMN IF NOT EXISTS revenge_taken BOOLEAN DEFAULT false;
ALTER TABLE public.attack_log ADD COLUMN IF NOT EXISTS is_revenge BOOLEAN DEFAULT false;
ALTER TABLE public.attack_log ADD COLUMN IF NOT EXISTS original_attack_id UUID;

-- Index for revenge eligibility queries
CREATE INDEX IF NOT EXISTS idx_attack_log_revenge ON public.attack_log(defender_id, created_at, revenge_taken);

-- =====================================================
-- 2. HELPER FUNCTION: GET PVP FEE
-- =====================================================
-- Returns the attack fee based on attacker's respect tier

CREATE OR REPLACE FUNCTION get_pvp_fee(attacker_respect INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF attacker_respect >= 5000 THEN
        RETURN 2000;  -- Late game
    ELSIF attacker_respect >= 1000 THEN
        RETURN 1000;  -- Mid game
    ELSE
        RETURN 500;   -- Early game
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_pvp_fee IS 'Returns PvP attack fee based on attacker respect tier: Early $500, Mid $1000, Late $2000';

-- =====================================================
-- 3. HELPER FUNCTION: CHECK REVENGE ELIGIBILITY
-- =====================================================
-- Returns eligible revenge targets for a player

DROP FUNCTION IF EXISTS get_revenge_targets(UUID);

CREATE OR REPLACE FUNCTION get_revenge_targets(player_id_input UUID)
RETURNS TABLE (
    attack_log_id UUID,
    attacker_id UUID,
    attacker_name TEXT,
    attacked_at TIMESTAMPTZ,
    hours_remaining INTEGER,
    attacker_has_shield BOOLEAN,
    attacker_has_npp BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id AS attack_log_id,
        al.attacker_id,
        p.username AS attacker_name,
        al.created_at AS attacked_at,
        (24 - EXTRACT(HOUR FROM (NOW() - al.created_at)))::INTEGER AS hours_remaining,
        EXISTS (
            SELECT 1 FROM player_boosters pb 
            WHERE pb.player_id = al.attacker_id 
            AND pb.booster_type = 'shield' 
            AND pb.expires_at > NOW()
        ) AS attacker_has_shield,
        (p.newbie_shield_expires_at > NOW()) AS attacker_has_npp
    FROM public.attack_log al
    JOIN public.players p ON p.id = al.attacker_id
    WHERE al.defender_id = player_id_input
      AND al.attacker_won = true
      AND al.revenge_taken = false
      AND al.created_at > NOW() - INTERVAL '24 hours'
    ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_revenge_targets(UUID) SET search_path = public;

COMMENT ON FUNCTION get_revenge_targets IS 'Returns eligible revenge targets for a player (attacks within 24h, not yet revenged)';

-- =====================================================
-- 4. UPDATE PERFORM_PVP_ATTACK WITH CASH FEE
-- =====================================================

DROP FUNCTION IF EXISTS perform_pvp_attack(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION perform_pvp_attack(
    attacker_id_input UUID,
    defender_id_input UUID,
    attack_type_input TEXT,
    is_revenge_input BOOLEAN DEFAULT false,
    original_attack_id_input UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    attack_type RECORD;
    attacker RECORD;
    defender RECORD;
    attacker_strength INTEGER;
    defender_strength INTEGER;
    strength_ratio FLOAT;
    
    -- Cash fee
    attack_fee INTEGER;
    
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
    
    -- Respect values - explicit gain/loss tracking
    attacker_respect_gain INTEGER := 0;
    attacker_respect_loss INTEGER := 0;
    defender_respect_gain INTEGER := 0;
    defender_respect_loss INTEGER := 0;
    
    -- Respect bonus for consumable attacks
    respect_bonus INTEGER := 5;
    
    -- Losses/gains
    base_cash_stolen BIGINT := 0;
    cash_stolen BIGINT := 0;
    vault_stolen BIGINT := 0;
    contraband_stolen INTEGER := 0;
    respect_stolen INTEGER := 0;
    crew_killed INTEGER := 0;
    
    -- Attacker losses on defeat
    attacker_crew_loss INTEGER := 0;
    
    random_item_id UUID;
    random_qty INTEGER;
    stolen_item_name TEXT;
    
    new_attack_log_id UUID;
BEGIN
    -- Get attack type
    SELECT * INTO attack_type FROM public.pvp_attack_types WHERE id = attack_type_input AND is_active = true;
    IF attack_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid attack type');
    END IF;

    -- Set respect bonus based on consumable requirement
    IF attack_type.requires_consumables THEN
        respect_bonus := 10;
    ELSE
        respect_bonus := 5;
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
    -- VALIDATE REVENGE (if applicable)
    -- =====================================================
    IF is_revenge_input THEN
        IF original_attack_id_input IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Revenge requires original attack ID');
        END IF;
        
        -- Check if revenge is valid
        IF NOT EXISTS (
            SELECT 1 FROM attack_log al
            WHERE al.id = original_attack_id_input
              AND al.defender_id = attacker_id_input  -- Current attacker was the defender
              AND al.attacker_id = defender_id_input  -- Current defender was the attacker
              AND al.attacker_won = true
              AND al.revenge_taken = false
              AND al.created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Revenge not available or expired');
        END IF;
    END IF;

    -- =====================================================
    -- CALCULATE AND VALIDATE CASH FEE
    -- =====================================================
    attack_fee := get_pvp_fee(attacker.respect);
    
    IF attacker.cash < attack_fee THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Not enough cash for attack fee ($' || attack_fee || ')',
            'attack_fee', attack_fee,
            'player_cash', attacker.cash
        );
    END IF;

    -- Deduct attack fee
    UPDATE public.players SET cash = cash - attack_fee WHERE id = attacker_id_input;

    -- CHECK NEW PLAYER PROTECTION (NPP)
    IF defender.newbie_shield_expires_at > NOW() THEN
        -- Refund fee if target has NPP
        UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Target is under New Player Protection',
            'npp_expires_at', defender.newbie_shield_expires_at
        );
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

    -- =====================================================
    -- SHIELD BLOCKS PVP ENTIRELY
    -- =====================================================
    IF has_shield THEN
        -- Refund fee if target has shield
        UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Target has an active Shield - attack blocked',
            'defender_had_shield', true
        );
    END IF;

    -- Check stamina
    IF attacker.stamina < attack_type.stamina_cost THEN
        -- Refund fee
        UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;

    -- Check crew requirement
    IF attack_type.requires_crew AND attacker.total_crew = 0 THEN
        -- Refund fee
        UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
        RETURN jsonb_build_object('success', false, 'message', 'This attack requires crew members');
    END IF;

    -- Check consumable requirement
    IF attack_type.requires_consumables AND attack_type.consumable_item_name IS NOT NULL THEN
        SELECT * INTO consumable_item FROM public.item_definitions WHERE name = attack_type.consumable_item_name;
        
        IF consumable_item IS NULL THEN
            UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
            RETURN jsonb_build_object('success', false, 'message', 'Consumable item not found: ' || attack_type.consumable_item_name);
        END IF;
        
        SELECT COALESCE(quantity, 0) INTO player_consumable_qty
        FROM public.player_inventory
        WHERE player_id = attacker_id_input AND item_id = consumable_item.id;
        
        IF player_consumable_qty < attack_type.consumable_qty THEN
            UPDATE public.players SET cash = cash + attack_fee WHERE id = attacker_id_input;
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

    -- Calculate strengths using RESPECT TIERS
    attacker_strength := get_respect_tier(attacker.respect) + attacker.crew_attack + attacker.item_attack;
    defender_strength := get_respect_tier(defender.respect) + defender.crew_defense + defender.item_defense;
    
    IF has_attack_boost THEN
        attacker_strength := attacker_strength * 2;
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
            -- DRIVE-BY NERF: Cap crew kills at 2 for drive_by
            IF attack_type_input = 'drive_by' THEN
                crew_killed := LEAST(2, defender.total_crew);
            ELSE
                crew_killed := LEAST(defender.total_crew / 4, 5);
            END IF;
        END IF;

        -- APPLY INSURANCE (protects cash only, NOT Respect)
        IF cash_stolen > 0 OR vault_stolen > 0 THEN
            SELECT * INTO defender_insurance
            FROM public.player_insurance
            WHERE player_id = defender_id_input AND claims_remaining > 0
            ORDER BY mitigation_percent DESC
            LIMIT 1;
            
            IF defender_insurance IS NOT NULL THEN
                insurance_applied := true;
                
                insurance_savings := LEAST(
                    ((cash_stolen + vault_stolen) * defender_insurance.mitigation_percent / 100)::BIGINT,
                    defender_insurance.max_coverage
                );
                
                IF cash_stolen > 0 THEN
                    cash_stolen := GREATEST(0, cash_stolen - insurance_savings);
                END IF;
                
                UPDATE public.player_insurance 
                SET claims_remaining = claims_remaining - 1 
                WHERE id = defender_insurance.id;
                
                DELETE FROM public.player_insurance WHERE id = defender_insurance.id AND claims_remaining <= 0;
            END IF;
        END IF;

        -- Calculate Respect changes (Insurance does NOT protect Respect)
        attacker_respect_gain := respect_stolen + respect_bonus;
        defender_respect_loss := respect_stolen + 3;  -- Flat penalty for losing

        -- Apply gains/losses
        UPDATE public.players SET 
            cash = cash + cash_stolen + vault_stolen,
            respect = respect + attacker_respect_gain,
            total_attacks_won = total_attacks_won + 1
        WHERE id = attacker_id_input;

        UPDATE public.players SET 
            cash = GREATEST(0, cash - cash_stolen),
            banked_cash = GREATEST(0, banked_cash - vault_stolen),
            respect = GREATEST(0, respect - defender_respect_loss)
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
        -- FLAT Respect loss for attacker: -4 to -8 (randomized)
        attacker_respect_loss := 4 + floor(random() * 5)::INTEGER;
        
        -- Defender gains +2 for successful defense
        defender_respect_gain := 2;

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
        UPDATE public.players SET respect = respect + defender_respect_gain WHERE id = defender_id_input;
    END IF;

    -- Update total_attacks counter
    UPDATE public.players SET total_attacks = total_attacks + 1 WHERE id = attacker_id_input;

    -- Log the attack
    INSERT INTO public.attack_log (attacker_id, defender_id, attack_type, attacker_won, cash_stolen, respect_change, is_revenge, original_attack_id)
    VALUES (
        attacker_id_input, 
        defender_id_input, 
        attack_type_input,
        attacker_wins, 
        COALESCE(cash_stolen + vault_stolen, 0)::INTEGER,
        CASE WHEN attacker_wins THEN attacker_respect_gain ELSE -attacker_respect_loss END,
        is_revenge_input,
        original_attack_id_input
    )
    RETURNING id INTO new_attack_log_id;

    -- Mark original attack as revenged (if this was a revenge attack)
    IF is_revenge_input AND original_attack_id_input IS NOT NULL THEN
        UPDATE public.attack_log SET revenge_taken = true WHERE id = original_attack_id_input;
    END IF;

    -- Notifications
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES 
        (attacker_id_input, 'attack', 
         CASE WHEN attacker_wins THEN 'Attack Successful!' ELSE 'Attack Failed!' END,
         CASE WHEN attacker_wins 
            THEN 'Hit ' || defender.username || ' with ' || attack_type.name || '. Stole $' || (cash_stolen + vault_stolen) || ' (+' || attacker_respect_gain || ' respect). Fee: $' || attack_fee
            ELSE 'Failed ' || attack_type.name || ' on ' || defender.username || '. Lost ' || attacker_respect_loss || ' respect. Fee: $' || attack_fee
         END),
        (defender_id_input, 'attack',
         CASE WHEN attacker_wins THEN 'You Were Attacked!' ELSE 'Attack Defended!' END,
         CASE WHEN attacker_wins 
            THEN attacker.username || ' hit you with ' || attack_type.name || '. Lost $' || (cash_stolen + vault_stolen) ||
                 CASE WHEN insurance_applied THEN ' (Insurance saved $' || insurance_savings || ')' ELSE '' END ||
                 ' (-' || defender_respect_loss || ' respect)'
            ELSE 'Successfully defended against ' || attacker.username || '''s ' || attack_type.name || ' (+' || defender_respect_gain || ' respect)'
         END);

    -- Return with EXPLICIT respect_gained and respect_lost fields
    RETURN jsonb_build_object(
        'success', true,
        'result', CASE WHEN attacker_wins THEN 'victory' ELSE 'defeat' END,
        'attack_type', attack_type.name,
        'defender_name', defender.username,
        'attack_fee', attack_fee,
        'is_revenge', is_revenge_input,
        'win_chance', win_chance,
        'roll', roll,
        'cash_stolen', cash_stolen + vault_stolen,
        -- Explicit Respect fields
        'respect_gained', CASE WHEN attacker_wins THEN attacker_respect_gain ELSE 0 END,
        'respect_lost', CASE WHEN attacker_wins THEN 0 ELSE attacker_respect_loss END,
        -- Legacy fields for compatibility
        'respect_stolen', respect_stolen,
        'respect_bonus', respect_bonus,
        'contraband_stolen', contraband_stolen,
        'stolen_item_name', stolen_item_name,
        'crew_killed', crew_killed,
        'attacker_crew_loss', attacker_crew_loss,
        'attacker_respect_loss', attacker_respect_loss,
        'defender_respect_gain', defender_respect_gain,
        'defender_respect_loss', defender_respect_loss,
        'consumable_used', attack_type.consumable_item_name,
        'consumable_qty_used', attack_type.consumable_qty,
        'had_attack_boost', has_attack_boost,
        'defender_had_shield', has_shield,
        'insurance_applied', insurance_applied,
        'insurance_savings', insurance_savings
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.perform_pvp_attack(UUID, UUID, TEXT, BOOLEAN, UUID) SET search_path = public;

COMMENT ON FUNCTION perform_pvp_attack(UUID, UUID, TEXT, BOOLEAN, UUID) IS 'PvP attack with tiered cash fee (Early $500, Mid $1000, Late $2000), revenge support, shield/NPP blocks. Fee refunded if attack blocked.';
