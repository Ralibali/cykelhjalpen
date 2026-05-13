
-- Fix the directory view back to security_invoker
ALTER VIEW public.public_agency_directory SET (security_invoker = on);

-- Re-add anon SELECT on underlying tables so the view works
CREATE POLICY "Anon reads profiles for directory"
ON public.profiles
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon reads supplier profiles for directory"
ON public.supplier_profiles
FOR SELECT
TO anon
USING (true);
