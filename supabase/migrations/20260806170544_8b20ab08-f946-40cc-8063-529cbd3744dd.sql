ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS org_number text,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS price_info text,
  ADD COLUMN IF NOT EXISTS booking_url text;

DROP POLICY IF EXISTS "Admins can delete responses" ON public.workshop_responses;
CREATE POLICY "Admins can delete responses"
  ON public.workshop_responses FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));