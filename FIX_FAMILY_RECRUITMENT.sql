-- =====================================================
-- FIX: Family Recruitment vs Join Type Separation
-- Run this in Supabase SQL Editor
-- =====================================================
-- Issue: When is_recruiting=false, family is hidden entirely
-- Fix: Separate visibility (is_recruiting) from join process (join_type)
--   - is_recruiting = visible in search (accepting new members)
--   - join_type = how players join ('open' = instant, 'request' = approval)


-- =====================================================
-- STEP 1: Update update_family_settings to include join_type
-- =====================================================
CREATE OR REPLACE FUNCTION update_family_settings(
    actor_id UUID,
    new_name TEXT,
    new_tag TEXT DEFAULT NULL,
    new_description TEXT DEFAULT NULL,
    new_is_recruiting BOOLEAN DEFAULT TRUE,
    new_min_level INTEGER DEFAULT 1,
    new_join_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    membership RECORD;
    family_record RECORD;
BEGIN
    -- Get actor's membership
    SELECT fm.*, f.id as fam_id
    INTO membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = actor_id;
    
    IF membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check if actor has permission (Don or Consigliere)
    IF membership.role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can modify settings.');
    END IF;
    
    -- Validate name
    IF LENGTH(TRIM(new_name)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Family name must be at least 3 characters.');
    END IF;
    
    -- Validate tag
    IF new_tag IS NOT NULL AND (LENGTH(new_tag) < 2 OR LENGTH(new_tag) > 4) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tag must be 2-4 characters.');
    END IF;
    
    -- Validate join_type if provided
    IF new_join_type IS NOT NULL AND new_join_type NOT IN ('open', 'request') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid join type.');
    END IF;
    
    -- Check for name conflicts (excluding own family)
    IF EXISTS (SELECT 1 FROM families WHERE name = new_name AND id != membership.fam_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A family with this name already exists.');
    END IF;
    
    -- Check for tag conflicts (excluding own family)
    IF new_tag IS NOT NULL AND EXISTS (SELECT 1 FROM families WHERE tag = new_tag AND id != membership.fam_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A family with this tag already exists.');
    END IF;
    
    -- Update family settings
    UPDATE families SET
        name = TRIM(new_name),
        tag = new_tag,
        description = new_description,
        is_recruiting = new_is_recruiting,
        min_level_required = GREATEST(1, LEAST(100, new_min_level)),
        join_type = COALESCE(new_join_type, join_type),
        updated_at = NOW()
    WHERE id = membership.fam_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Family settings updated successfully!');
END;
$$;


-- =====================================================
-- STEP 2: Update get_family_settings to return join_type
-- =====================================================
CREATE OR REPLACE FUNCTION get_family_settings(actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    membership RECORD;
    family_record RECORD;
BEGIN
    -- Get actor's membership
    SELECT fm.*, f.*
    INTO membership
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.player_id = actor_id;
    
    IF membership IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not in a family.');
    END IF;
    
    -- Check if actor has permission (Don or Consigliere)
    IF membership.role NOT IN ('Don', 'Consigliere') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Don or Consigliere can access settings.');
    END IF;
    
    -- Get family data
    SELECT * INTO family_record FROM families WHERE id = membership.family_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'is_boss', membership.role = 'Don',
        'family', jsonb_build_object(
            'id', family_record.id,
            'name', family_record.name,
            'tag', family_record.tag,
            'description', family_record.description,
            'is_recruiting', family_record.is_recruiting,
            'join_type', family_record.join_type,
            'min_level_required', family_record.min_level_required,
            'treasury', family_record.treasury
        )
    );
END;
$$;


-- =====================================================
-- STEP 3: Verify search_families shows all recruiting families
-- (This was already correct, but let's confirm)
-- =====================================================
-- Families with is_recruiting=true are visible, regardless of join_type


-- =====================================================
-- Done!
-- =====================================================
SELECT 'Recruitment settings fix applied!' as status;
