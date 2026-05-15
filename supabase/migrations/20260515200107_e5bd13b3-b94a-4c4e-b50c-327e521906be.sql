-- 1) Make bucket private + restrict size and mime types
UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'bike-images';

-- 2) Drop old loose policies
DROP POLICY IF EXISTS "Public reads bike-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone uploads bike-images" ON storage.objects;

-- 3) Restrict uploads: path must begin with an existing bike_repair_requests.id
CREATE POLICY "Upload bike-images for existing request"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bike-images'
  AND EXISTS (
    SELECT 1 FROM public.bike_repair_requests r
    WHERE r.id::text = (storage.foldername(name))[1]
  )
);

-- 4) Allow admins to read bike-images directly
CREATE POLICY "Admins read bike-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'bike-images' AND public.is_admin(auth.uid()));