
-- 1) workshops: remove public read entirely. Frontend & edge functions only read as owner, admin, or via service_role.
DROP POLICY IF EXISTS "Public reads approved workshops" ON public.workshops;

-- 2) profiles: limit anon to safe directory columns
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, role, full_name, company_name, city, avatar_url, is_bankid_verified, is_phone_verified)
  ON public.profiles TO anon;

-- 3) supplier_profiles: limit anon to safe directory columns
REVOKE SELECT ON public.supplier_profiles FROM anon;
GRANT SELECT (
  id, slug, bio, logo_url, cover_url, categories, services, portfolio_urls,
  website_url, avg_rating, review_count, completed_projects, is_featured,
  is_verified, contact_avatar_url
) ON public.supplier_profiles TO anon;

-- 4) bike-images storage: allow approved workshops that have a paid response for the request folder
DROP POLICY IF EXISTS "Workshops with paid response read bike-images" ON storage.objects;
CREATE POLICY "Workshops with paid response read bike-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bike-images'
  AND public.is_approved_workshop(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.workshop_responses wr
    JOIN public.workshops w ON w.id = wr.workshop_id
    WHERE w.user_id = auth.uid()
      AND wr.paid = true
      AND wr.request_id::text = (storage.foldername(name))[1]
  )
);
