-- =====================================================
-- FIX FAMILY PAGE DISPLAY ISSUES
-- =====================================================
-- 1. Add 'inventory' to get_player_family response
-- 2. Removes misleading stats by ensuring correct data flow

-- Update get_player_family to include inventory
CREATE OR REPLACE FUNCTION get_player_family(target_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    membership RECORD;
    family_data RECORD;
    members_array JSONB;
BEGIN
    -- Get membership
    SELECT fm.*, f.*
    INTO membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = target_player_id;
    
    IF membership IS NULL THEN
        RETURN jsonb_build_object('has_family', false);
    END IF;
    
    -- Get all members WITH has_made_man flag
    SELECT json_agg(json_build_object(
        'player_id', fm.player_id,
        'username', p.username,
        'first_name', p.first_name,
        'role', fm.role,
        'contribution', fm.contribution,
        'level', p.level,
        'respect', p.respect,
        'joined_at', fm.joined_at,
        'has_made_man', COALESCE(p.starter_pack_claimed, false)
    ) ORDER BY 
        CASE fm.role 
            WHEN 'Don' THEN 1
            WHEN 'Consigliere' THEN 2 
            WHEN 'Advisor' THEN 3
            WHEN 'Lieutenant' THEN 4
            WHEN 'Associate' THEN 5
            WHEN 'Recruit' THEN 6
            WHEN 'Boss' THEN 1 
            WHEN 'Underboss' THEN 2 
            WHEN 'Caporegime' THEN 4 
            WHEN 'Soldier' THEN 5 
            ELSE 7 
        END
    )
    INTO members_array
    FROM family_members fm
    JOIN players p ON fm.player_id = p.id
    WHERE fm.family_id = membership.family_id;
    
    RETURN jsonb_build_object(
        'has_family', true,
        'family', jsonb_build_object(
            'id', membership.family_id,
            'name', membership.name,
            'tag', membership.tag,
            'description', membership.description,
            'treasury', membership.treasury,
            'total_respect', membership.total_respect,
            'is_recruiting', membership.is_recruiting,
            'min_level_required', membership.min_level_required,
            'created_at', membership.created_at,
            'invite_code', membership.invite_code,
            'inventory', COALESCE(membership.inventory, '{}'::jsonb)
        ),
        'my_role', membership.role,
        'my_contribution', membership.contribution,
        'members', COALESCE(members_array, '[]'::jsonb)
    );
END;
$$;

ALTER FUNCTION public.get_player_family(UUID) SET search_path = public;

COMMENT ON FUNCTION get_player_family IS 'Returns player family data including inventory for armory display.';
