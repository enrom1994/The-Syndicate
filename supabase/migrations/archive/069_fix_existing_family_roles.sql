-- =====================================================
-- HOTFIX: Update existing family member roles to new names
-- =====================================================
-- This fixes any existing family members that still have old role names

-- Update existing roles to new names
UPDATE family_members
SET role = CASE role
    WHEN 'Boss' THEN 'Don'
    WHEN 'Underboss' THEN 'Consigliere'
    WHEN 'Caporegime' THEN 'Lieutenant'
    WHEN 'Soldier' THEN 'Associate'
    WHEN 'Street Runner' THEN 'Recruit'
    -- 'Consigliere' and 'Advisor' stay the same or become 'Advisor'
    WHEN 'Consigliere' THEN 'Consigliere'
    ELSE role
END
WHERE role IN ('Boss', 'Underboss', 'Caporegime', 'Soldier', 'Street Runner');

-- Verify the update
SELECT role, COUNT(*) as member_count
FROM family_members
GROUP BY role
ORDER BY 
    CASE role 
        WHEN 'Don' THEN 1 
        WHEN 'Consigliere' THEN 2 
        WHEN 'Advisor' THEN 3 
        WHEN 'Lieutenant' THEN 4 
        WHEN 'Associate' THEN 5 
        WHEN 'Recruit' THEN 6
        ELSE 99
    END;
