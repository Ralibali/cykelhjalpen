
-- ============================================
-- CYKELHJÄLPEN MARKETPLACE TABLES
-- ============================================

-- 1. bike_repair_requests
CREATE TABLE public.bike_repair_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  bike_type TEXT NOT NULL,
  repair_category TEXT NOT NULL,
  description TEXT NOT NULL,
  postcode TEXT,
  city TEXT NOT NULL DEFAULT 'Linköping',
  area TEXT,
  urgency TEXT,
  can_drop_off BOOLEAN NOT NULL DEFAULT true,
  wants_pickup BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new',
  view_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. bike_request_images
CREATE TABLE public.bike_request_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.bike_repair_requests(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. workshops
CREATE TABLE public.workshops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT NOT NULL DEFAULT 'Linköping',
  areas_served TEXT[] DEFAULT '{}',
  services TEXT[] DEFAULT '{}',
  approved BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. workshop_responses
CREATE TABLE public.workshop_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.bike_repair_requests(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  estimated_price_min INTEGER,
  estimated_price_max INTEGER,
  estimated_time TEXT,
  can_pickup BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  paid BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, workshop_id)
);

-- 5. lead_charges
CREATE TABLE public.lead_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.bike_repair_requests(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES public.workshop_responses(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 5000,
  currency TEXT NOT NULL DEFAULT 'sek',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bike_requests_status ON public.bike_repair_requests(status);
CREATE INDEX idx_bike_requests_city ON public.bike_repair_requests(city);
CREATE INDEX idx_bike_requests_token ON public.bike_repair_requests(view_token);
CREATE INDEX idx_bike_images_request ON public.bike_request_images(request_id);
CREATE INDEX idx_workshops_user ON public.workshops(user_id);
CREATE INDEX idx_workshops_approved ON public.workshops(approved);
CREATE INDEX idx_responses_request ON public.workshop_responses(request_id);
CREATE INDEX idx_responses_workshop ON public.workshop_responses(workshop_id);
CREATE INDEX idx_charges_workshop ON public.lead_charges(workshop_id);
CREATE INDEX idx_charges_status ON public.lead_charges(status);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if a user is an approved workshop
CREATE OR REPLACE FUNCTION public.is_approved_workshop(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workshops
    WHERE user_id = _user_id AND approved = true
  )
$$;

-- Get workshop id for a user
CREATE OR REPLACE FUNCTION public.get_workshop_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.workshops WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE public.bike_repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_request_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_charges ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS: bike_repair_requests
-- ============================================

-- Anyone (anonymous) can submit a bike repair request
CREATE POLICY "Anyone submits bike request"
ON public.bike_repair_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins read all
CREATE POLICY "Admins read all bike requests"
ON public.bike_repair_requests FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Approved workshops read non-sensitive fields via the view (see below).
-- For the table itself, approved workshops can SELECT but the app must use the view.
-- We allow direct SELECT for workshops only on rows where they have a paid response.
CREATE POLICY "Workshop reads requests with paid response"
ON public.bike_repair_requests FOR SELECT
TO authenticated
USING (
  is_approved_workshop(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.workshop_responses wr
    WHERE wr.request_id = bike_repair_requests.id
      AND wr.workshop_id = get_workshop_id(auth.uid())
      AND wr.paid = true
  )
);

-- Admins can update/delete
CREATE POLICY "Admins update bike requests"
ON public.bike_repair_requests FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins delete bike requests"
ON public.bike_repair_requests FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- ============================================
-- VIEW: masked requests for workshops
-- ============================================
CREATE OR REPLACE VIEW public.bike_requests_for_workshops
WITH (security_invoker = true) AS
SELECT
  id,
  bike_type,
  repair_category,
  description,
  postcode,
  city,
  area,
  urgency,
  can_drop_off,
  wants_pickup,
  status,
  created_at,
  -- Mask customer fields unless the workshop has a paid response
  CASE WHEN EXISTS (
    SELECT 1 FROM public.workshop_responses wr
    WHERE wr.request_id = bike_repair_requests.id
      AND wr.workshop_id = get_workshop_id(auth.uid())
      AND wr.paid = true
  ) THEN customer_name ELSE NULL END AS customer_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.workshop_responses wr
    WHERE wr.request_id = bike_repair_requests.id
      AND wr.workshop_id = get_workshop_id(auth.uid())
      AND wr.paid = true
  ) THEN customer_email ELSE NULL END AS customer_email,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.workshop_responses wr
    WHERE wr.request_id = bike_repair_requests.id
      AND wr.workshop_id = get_workshop_id(auth.uid())
      AND wr.paid = true
  ) THEN customer_phone ELSE NULL END AS customer_phone,
  -- Helper flag for UI
  EXISTS (
    SELECT 1 FROM public.workshop_responses wr
    WHERE wr.request_id = bike_repair_requests.id
      AND wr.workshop_id = get_workshop_id(auth.uid())
  ) AS already_responded
FROM public.bike_repair_requests
WHERE status IN ('new', 'has_offers');

GRANT SELECT ON public.bike_requests_for_workshops TO authenticated;

-- ============================================
-- RLS: bike_request_images
-- ============================================
CREATE POLICY "Anyone uploads bike image record"
ON public.bike_request_images FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public reads bike images"
ON public.bike_request_images FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins delete bike images"
ON public.bike_request_images FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- ============================================
-- RLS: workshops
-- ============================================
CREATE POLICY "Workshop owner reads own"
ON public.workshops FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Public reads approved workshops (for directory pages)
CREATE POLICY "Public reads approved workshops"
ON public.workshops FOR SELECT
TO anon, authenticated
USING (approved = true);

CREATE POLICY "User creates own workshop"
ON public.workshops FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Workshop owner updates own (non-approval fields)"
ON public.workshops FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin updates any workshop"
ON public.workshops FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin deletes workshop"
ON public.workshops FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- ============================================
-- RLS: workshop_responses
-- ============================================
CREATE POLICY "Workshop reads own responses"
ON public.workshop_responses FOR SELECT
TO authenticated
USING (
  workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid())
);

CREATE POLICY "Approved workshop creates own response"
ON public.workshop_responses FOR INSERT
TO authenticated
WITH CHECK (
  is_approved_workshop(auth.uid())
  AND workshop_id = get_workshop_id(auth.uid())
);

CREATE POLICY "Workshop updates own draft response"
ON public.workshop_responses FOR UPDATE
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()))
WITH CHECK (workshop_id = get_workshop_id(auth.uid()));

CREATE POLICY "Admin manages any response"
ON public.workshop_responses FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- RLS: lead_charges
-- ============================================
CREATE POLICY "Workshop reads own charges"
ON public.lead_charges FOR SELECT
TO authenticated
USING (
  workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid())
);

CREATE POLICY "Admin manages any charge"
ON public.lead_charges FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- TRIGGERS
-- ============================================

-- updated_at triggers
CREATE TRIGGER trg_bike_requests_updated_at
BEFORE UPDATE ON public.bike_repair_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_workshops_updated_at
BEFORE UPDATE ON public.workshops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Close request when 5 paid responses are received
CREATE OR REPLACE FUNCTION public.close_bike_request_on_max_responses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NEW.paid = true AND (OLD.paid IS DISTINCT FROM true) THEN
    SELECT count(*) INTO v_count
    FROM public.workshop_responses
    WHERE request_id = NEW.request_id AND paid = true;

    IF v_count >= 5 THEN
      UPDATE public.bike_repair_requests
      SET status = 'closed_for_responses'
      WHERE id = NEW.request_id;
    ELSE
      UPDATE public.bike_repair_requests
      SET status = 'has_offers'
      WHERE id = NEW.request_id AND status = 'new';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_close_bike_request
AFTER UPDATE ON public.workshop_responses
FOR EACH ROW EXECUTE FUNCTION public.close_bike_request_on_max_responses();

-- ============================================
-- STORAGE BUCKET: bike-images
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('bike-images', 'bike-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public reads bike-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'bike-images');

CREATE POLICY "Anyone uploads bike-images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'bike-images');

CREATE POLICY "Admin deletes bike-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bike-images' AND is_admin(auth.uid()));
