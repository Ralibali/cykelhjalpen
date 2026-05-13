
-- Remove anon policies that expose sensitive data
DROP POLICY IF EXISTS "Anon reads profiles for directory" ON public.profiles;
DROP POLICY IF EXISTS "Anon reads supplier profiles for directory" ON public.supplier_profiles;

-- Grant anon SELECT on the safe views instead
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_supplier_profiles TO anon;

-- Also grant to authenticated for consistency
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_supplier_profiles TO authenticated;
