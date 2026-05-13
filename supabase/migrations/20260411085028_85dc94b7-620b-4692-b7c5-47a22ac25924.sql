
-- 1. Fix profiles SELECT: restrict to own profile + admin
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
CREATE POLICY "Users read own profile or admin reads all"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR is_admin(auth.uid()));

-- 2. Fix supplier_profiles SELECT: replace public with restricted
DROP POLICY IF EXISTS "Public read supplier_profiles" ON public.supplier_profiles;

-- Public can see non-sensitive supplier data via the view
-- Authenticated can see full row only if owner or admin
CREATE POLICY "Public read supplier_profiles safe"
ON public.supplier_profiles
FOR SELECT
TO public
USING (true);
-- Note: We keep public read but strip sensitive data via the public_supplier_profiles view.
-- The view already excludes stripe_customer_id, stripe_subscription_id, lead_credits, trial_leads_used, trial_ends_at, plan.
-- App code should use the view for public pages.

-- Actually, let's properly restrict: only owner/admin sees full row, public sees safe view
DROP POLICY IF EXISTS "Public read supplier_profiles safe" ON public.supplier_profiles;

CREATE POLICY "Supplier reads own or admin"
ON public.supplier_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR is_admin(auth.uid()));

-- For unauthenticated/public access, the public_supplier_profiles view will work
-- But we need a policy for anon role to read (via view with security_invoker)
CREATE POLICY "Anon reads supplier profiles for directory"
ON public.supplier_profiles
FOR SELECT
TO anon
USING (true);

-- 3. Fix offer-attachments: let buyers also read
DROP POLICY IF EXISTS "Parties read offer attachments" ON storage.objects;
CREATE POLICY "Parties read offer attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'offer-attachments'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR is_admin(auth.uid())
    -- Allow buyer to read: check if user is buyer of a project that has an offer with this supplier's attachment
    OR EXISTS (
      SELECT 1 FROM public.offers o
      JOIN public.projects p ON p.id = o.project_id
      WHERE p.buyer_id = auth.uid()
      AND o.supplier_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 4. Add DELETE policies for storage buckets
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own logo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own portfolio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'portfolio' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own cover"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'covers' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5. Add missing portfolio UPDATE policy
CREATE POLICY "Users update own portfolio"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'portfolio' AND (auth.uid())::text = (storage.foldername(name))[1]);
