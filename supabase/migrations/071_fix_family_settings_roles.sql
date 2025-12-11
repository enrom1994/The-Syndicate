-- =====================================================
-- HOTFIX: Update get_family_settings to use new role names
-- =====================================================
-- Fix role check from Boss/Underboss to Don/Consigliere

CREATE OR REPLACE FUNCTION get_family_settings(actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player_family UUID;
    player_role TEXT;
    family_data JSONB;
BEGIN
    -- Get player's family and role
    SELECT family_id, role INTO player_family, player_role
    FROM family_members
    WHERE player_id = actor_id;
    
    IF player_family IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check if player is Don or Consigliere
    IF player_role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can access family settings.');
    END IF;
    
    -- Get family data
    SELECT jsonb_build_object(
        'id', f.id,
        'name', f.name,
        'tag', f.tag,
        'description', f.description,
        'treasury', f.treasury,
        'total_respect', f.total_respect,
        'is_recruiting', f.is_recruiting,
        'join_type', f.join_type,
        'min_level_required', f.min_level_required,
        'created_at', f.created_at
    ) INTO family_data
    FROM families f
    WHERE f.id = player_family;
    
    RETURN jsonb_build_object(
        'success', true,
        'family', family_data,
        'is_boss', player_role = 'Don'
    );
END;
$$;
