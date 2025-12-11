-- Fix/Restore search_players_for_bounty RPC
-- This ensures the function exists and is accessible

CREATE OR REPLACE FUNCTION search_players_for_bounty(
    searcher_id UUID,
    search_query TEXT,
    result_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    results JSONB;
BEGIN
    SELECT json_agg(json_build_object(
        'id', p.id,
        'username', p.username,
        'first_name', p.first_name,
        'level', p.level,
        'respect', p.respect,
        'has_active_bounty', EXISTS(SELECT 1 FROM bounties WHERE target_player_id = p.id AND status = 'active')
    ) ORDER BY p.level DESC)
    INTO results
    FROM players p
    WHERE p.id != searcher_id
      AND (
          p.username ILIKE '%' || search_query || '%'
          OR p.first_name ILIKE '%' || search_query || '%'
      )
    LIMIT result_limit;
    
    RETURN COALESCE(results, '[]'::jsonb);
END;
$$;
