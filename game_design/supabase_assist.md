Summarize the issue and suggest fixes for the following lint item: Title: Multiple Permissive Policies Entity: public.achievement_definitions Schema: public Issue Details: Table public.achievement_definitions has multiple permissive policies for role anon for action SELECT. Policies include {"Anyone can read achievement definitions","Public read achievement_definitions"} Description: Detects if multiple permissive row level security policies are present on a table for the same role and action (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.




Reasoned
Summary of the issue
The table public.achievement_definitions has two permissive RLS policies that both allow the role anon to SELECT:

"Anyone can read achievement definitions"
"Public read achievement_definitions"
Because they are permissive and target the same role and action, Postgres will evaluate both policies for every SELECT query that requires RLS. This is suboptimal for performance and can increase query planning/execution cost and complexity.

Why this matters
Permissive policies are ORed together: a row is visible if any permissive policy returns true.
When multiple permissive policies exist for the same role/action, the database must evaluate each policy expression for the applicable rows — extra CPU and potentially extra lookups.
Consolidating policies reduces evaluation overhead and simplifies maintenance and auditing of access rules.
Suggested fixes (ordered recommendations)
Consolidate into a single permissive SELECT policy

Combine the logic from both policies into one policy that covers the intended public read behavior.
Example approach: create a single policy named e.g. "Public read achievement_definitions" whose USING clause is the OR of the previous conditions, then drop the other redundant policy.
Steps:

Create the consolidated policy (replace condition_a/condition_b with the actual expressions from the two policies):
SQL Query



CREATE POLICY "Public read achievement_definitions" ON public.achievement_definitions
  FOR SELECT TO anon
  USING ( (condition_a) OR (condition_b) );

Drop the old policy (the one you want to remove):
SQL Query



DROP POLICY "Anyone can read achievement definitions" ON public.achievement_definitions;

If both were fully permissive (i.e., simply USING (true)), replace them with a single permissive policy or remove both and rely on no policy only if you intend to deny anonymous reads.

If the intent is to allow anyone, one policy USING (true) is enough.
If the intent is to restrict reads, remove permissive policies and replace with a targeted condition.
Prefer targeted policies over broad anon permissive access when possible

If you can restrict access (e.g., only to certain columns, or only rows with public = true or matching other criteria), express that in the single policy.
Example: USING (is_public = true).
Ensure proper indexing for any columns used in the policy expression

If your combined policy uses columns like is_public, tenant_id, or org_id, add indexes on those columns to avoid scan overhead when policies are evaluated.
Audit and test

After changing policies, test read behavior as an anonymous user to confirm correct visibility.
Measure any query performance improvement if you have baseline metrics.
Example concrete change (if both policies are simple)
If both policies were permissive and equivalent to allowing all reads, do this:

Create single policy:
SQL Query



CREATE POLICY "Public read achievement_definitions" ON public.achievement_definitions
  FOR SELECT TO anon
  USING ( true );

Drop the duplicate:
SQL Query



DROP POLICY "Anyone can read achievement definitions" ON public.achievement_definitions;

If the two policies had different conditions, combine them as described in suggestion #1.

Next steps I can help with
Inspect the actual policy definitions and produce the exact SQL to consolidate or remove a policy.
Run tests (or provide test queries) to validate behavior after changes.
Suggest appropriate indexes for any policy expression you plan to keep.
Which would you like me to do next: inspect the current policy definitions (and then craft exact SQL), or produce the consolidation SQL assuming both are permissive?



