
-- 1. Fix notifications INSERT: only allow creating notifications for yourself
DROP POLICY IF EXISTS "Authenticated inserts notifications" ON public.notifications;
CREATE POLICY "User inserts own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Secure offer-attachments bucket: make private
UPDATE storage.buckets SET public = false WHERE id = 'offer-attachments';

-- Replace public read policy with restricted one
DROP POLICY IF EXISTS "Public read offer attachments" ON storage.objects;
CREATE POLICY "Parties read offer attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'offer-attachments'
  AND (
    -- Supplier who uploaded it
    (storage.foldername(name))[1] = (auth.uid())::text
    -- Or admin
    OR is_admin(auth.uid())
  )
);

-- 3. Restrict profiles: replace wide-open SELECT with column-safe approach
-- Since RLS can't filter columns, we restrict to authenticated and use a view for public
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;

-- Authenticated users can see all profiles (needed for supplier directory, messaging, etc.)
CREATE POLICY "Authenticated read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 4. Create a public-safe view for unauthenticated access (e.g. agency pages)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, company_name, city, avatar_url, role
FROM public.profiles;

-- 5. Restrict supplier_profiles: hide sensitive billing fields via a secure view
-- Keep the existing public SELECT policy (needed for directory) but create a safe view
CREATE OR REPLACE VIEW public.public_supplier_profiles AS
SELECT
  id, slug, bio, categories, services, logo_url, cover_url, website_url,
  portfolio_urls, avg_rating, review_count, completed_projects,
  is_verified, is_featured, contact_name, contact_email, contact_phone,
  contact_avatar_url, org_number, has_fskatt, has_fskatt_verified_at,
  credit_check_passed, credit_check_at, created_at
FROM public.supplier_profiles;
