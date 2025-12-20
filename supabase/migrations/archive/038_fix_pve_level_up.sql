-- =====================================================
-- FIX: PvE Attack - use add_experience instead of check_level_up
-- =====================================================

CREATE OR REPLACE FUNCTION attack_pve(
    attacker_id UUID,
    target_id_input UUID
)
RETURNS JSONB AS $$
DECLARE
    target RECORD;
    attacker RECORD;
    attacker_strength INTEGER;
    cooldown_record RECORD;
    success_chance INTEGER;
    roll INTEGER;
    is_victory BOOLEAN;
    cash_earned INTEGER := 0;
    xp_earned INTEGER := 0;
    respect_earned INTEGER := 0;
    xp_result JSONB;
BEGIN
    -- Get target
    SELECT * INTO target FROM public.pve_targets WHERE id = target_id_input AND is_active = true;
    IF target IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target not found');
    END IF;

    -- Get attacker
    SELECT p.*, 
           COALESCE(SUM(cd.attack_bonus * pc.quantity), 0) as crew_attack,
           COALESCE(SUM(cd.defense_bonus * pc.quantity), 0) as crew_defense
    INTO attacker
    FROM public.players p
    LEFT JOIN public.player_crew pc ON pc.player_id = p.id
    LEFT JOIN public.crew_definitions cd ON cd.id = pc.crew_id
    WHERE p.id = attacker_id
    GROUP BY p.id;

    IF attacker IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Player not found');
    END IF;

    -- Check level requirement
    IF attacker.level < target.required_level THEN
        RETURN jsonb_build_object('success', false, 'message', 'Need level ' || target.required_level || ' to attack this target');
    END IF;

    -- Check stamina
    IF attacker.stamina < target.stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not enough stamina');
    END IF;

    -- Check cooldown
    SELECT * INTO cooldown_record FROM public.pve_attack_cooldowns 
    WHERE player_id = attacker_id AND target_id = target_id_input;

    IF cooldown_record IS NOT NULL THEN
        IF cooldown_record.last_attacked_at + (target.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
            RETURN jsonb_build_object('success', false, 'message', 'Target on cooldown');
        END IF;
    END IF;

    -- Calculate attacker strength
    attacker_strength := attacker.level * 10 + attacker.crew_attack;

    -- Calculate success chance (base + bonus from strength advantage)
    success_chance := target.base_success_rate;
    IF attacker_strength > target.base_strength THEN
        success_chance := LEAST(95, success_chance + ((attacker_strength - target.base_strength) / 2));
    ELSE
        success_chance := GREATEST(10, success_chance - ((target.base_strength - attacker_strength) / 2));
    END IF;

    -- Deduct stamina
    UPDATE public.players SET stamina = stamina - target.stamina_cost WHERE id = attacker_id;

    -- Roll for success
    roll := floor(random() * 100) + 1;
    is_victory := roll <= success_chance;

    IF is_victory THEN
        cash_earned := target.cash_reward;
        xp_earned := target.xp_reward;
        respect_earned := target.respect_reward;

        -- Apply cash and respect rewards
        UPDATE public.players 
        SET cash = cash + cash_earned,
            respect = respect + respect_earned
        WHERE id = attacker_id;

        -- Add XP using the existing add_experience function
        xp_result := add_experience(attacker_id, xp_earned);
    END IF;

    -- Update cooldown
    INSERT INTO public.pve_attack_cooldowns (player_id, target_id, last_attacked_at)
    VALUES (attacker_id, target_id_input, NOW())
    ON CONFLICT (player_id, target_id)
    DO UPDATE SET last_attacked_at = NOW();

    -- Create notification
    INSERT INTO public.notifications (player_id, type, title, description)
    VALUES (
        attacker_id, 
        'attack', 
        CASE WHEN is_victory THEN 'Victory!' ELSE 'Defeat!' END,
        CASE WHEN is_victory 
            THEN 'Defeated ' || target.name || '! Earned $' || cash_earned || ', ' || xp_earned || ' XP'
            ELSE 'Failed to defeat ' || target.name
        END
    );

    RETURN jsonb_build_object(
        'success', true,
        'result', CASE WHEN is_victory THEN 'victory' ELSE 'defeat' END,
        'target_name', target.name,
        'cash_earned', cash_earned,
        'xp_earned', xp_earned,
        'respect_earned', respect_earned,
        'success_chance', success_chance,
        'roll', roll,
        'leveled_up', COALESCE((xp_result->>'leveled_up')::BOOLEAN, false),
        'new_level', COALESCE((xp_result->>'new_level')::INTEGER, attacker.level)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
