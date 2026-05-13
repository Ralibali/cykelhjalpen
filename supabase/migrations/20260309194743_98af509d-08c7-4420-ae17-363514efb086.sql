
-- Add attachment_url column to offers
ALTER TABLE public.offers ADD COLUMN attachment_url text DEFAULT NULL;

-- Create storage bucket for offer attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('offer-attachments', 'offer-attachments', true);

-- RLS: supplier can upload their own attachments
CREATE POLICY "Supplier uploads offer attachment"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'offer-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can read offer attachments
CREATE POLICY "Public read offer attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'offer-attachments');

-- RLS: supplier can delete own attachments
CREATE POLICY "Supplier deletes own offer attachment"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'offer-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
