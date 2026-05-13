
CREATE POLICY "Admin deletes any profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admin deletes any supplier_profile"
ON public.supplier_profiles
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
