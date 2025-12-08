# Fix Leaderboard Error

The previous error happened because an older version of the leaderboard function already existed. We need to **delete it first** before creating the new one.

## Instructions

1.  Open your **Supabase Dashboard**.
2.  Go to the **SQL Editor**.
3.  Click **New Query**.
4.  Copy the code below entirely and paste it into the editor.
5.  Click **Run**.

```sql
-- =====================================================
-- LEADERBOARD SYSTEM (FIXED)
-- =====================================================

-- 1. Helper: Calculate Net Worth (Cash + Bank + Business Assets)
CREATE OR REPLACE FUNCTION calculate_net_worth_for_player(target_player_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    liquid_cash BIGINT;
    bank_cash BIGINT;
    business_value BIGINT;
BEGIN
    SELECT cash, banked_cash INTO liquid_cash, bank_cash
    FROM players
    WHERE id = target_player_id;

    SELECT COALESCE(SUM(bd.base_purchase_cost * pb.level), 0) INTO business_value
    FROM player_businesses pb
    JOIN business_definitions bd ON pb.business_id = bd.id
    WHERE pb.player_id = target_player_id;

    RETURN (COALESCE(liquid_cash, 0) + COALESCE(bank_cash, 0) + COALESCE(business_value, 0));
END;
$$;

-- 2. Main Leaderboard Function
-- DROP to prevent "cannot change return type" error
DROP FUNCTION IF EXISTS get_leaderboard(text, integer);

CREATE OR REPLACE FUNCTION get_leaderboard(
    leaderboard_type TEXT,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank BIGINT,
    player_id UUID,
    username TEXT,
    avatar_url TEXT,
    value BIGINT,
    family_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF leaderboard_type = 'networth' THEN
        RETURN QUERY
        SELECT 
            RANK() OVER (ORDER BY (p.cash + p.banked_cash + (
                SELECT COALESCE(SUM(bd.base_purchase_cost * pb.level), 0)
                FROM player_businesses pb
                JOIN business_definitions bd ON pb.business_id = bd.id
                WHERE pb.player_id = p.id
            )) DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, 'Unknown Boss') as username,
            p.avatar_url,
            (p.cash + p.banked_cash + (
                SELECT COALESCE(SUM(bd.base_purchase_cost * pb.level), 0)
                FROM player_businesses pb
                JOIN business_definitions bd ON pb.business_id = bd.id
                WHERE pb.player_id = p.id
            ))::BIGINT as value,
            NULL::TEXT as family_name
        FROM players p
        ORDER BY value DESC
        LIMIT limit_count;

    ELSIF leaderboard_type = 'respect' THEN
        RETURN QUERY
        SELECT 
            RANK() OVER (ORDER BY p.respect DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, 'Unknown Boss') as username,
            p.avatar_url,
            p.respect::BIGINT as value,
            NULL::TEXT as family_name
        FROM players p
        ORDER BY value DESC
        LIMIT limit_count;

    ELSIF leaderboard_type = 'kills' THEN
        RETURN QUERY
        SELECT 
            RANK() OVER (ORDER BY p.total_kills DESC) as rank,
            p.id as player_id,
            COALESCE(p.username, 'Unknown Boss') as username,
            p.avatar_url,
            p.total_kills::BIGINT as value,
            NULL::TEXT as family_name
        FROM players p
        ORDER BY value DESC
        LIMIT limit_count;
    END IF;
END;
$$;

-- 3. Expose Net Worth Calculator to Frontend
CREATE OR REPLACE FUNCTION calculate_net_worth(player_id_input UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN calculate_net_worth_for_player(player_id_input);
END;
$$;
```
