
-- Page views tracking table
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  path text NOT NULL,
  referrer text,
  device_type text DEFAULT 'desktop',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Click events tracking table
CREATE TABLE public.click_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  event_name text NOT NULL,
  element_text text,
  path text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous tracking)
CREATE POLICY "Anyone inserts page views" ON public.page_views FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone inserts click events" ON public.click_events FOR INSERT TO public WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins read page views" ON public.page_views FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins read click events" ON public.click_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_session ON public.page_views (session_id);
CREATE INDEX idx_click_events_created_at ON public.click_events (created_at DESC);
CREATE INDEX idx_click_events_session ON public.click_events (session_id);
