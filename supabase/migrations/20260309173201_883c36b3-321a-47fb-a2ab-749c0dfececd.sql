
-- The existing policy already allows buyer_id = auth.uid() and admin, so no RLS change needed.
-- It already covers pending projects for buyers and admins.
-- This is a no-op migration to confirm the policy is correct.
SELECT 1;
