UPDATE storage.buckets SET public = false WHERE id = 'bike-images';
DROP POLICY IF EXISTS "Public reads bike-images" ON storage.objects;