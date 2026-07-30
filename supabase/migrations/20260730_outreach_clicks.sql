-- Klickspårning för verkstadsrekrytering.
-- När ett rekryteringsmejl skickas byts registreringslänken mot en spårningslänk
-- per utskick (edge functionen outreach-click). Klicket loggas här och mottagaren
-- 302-vidarebefordras till /for-verkstader. Admin ser i prospektpanelen vilka
-- prospekt som klickat och kan prioritera uppföljning.

CREATE TABLE IF NOT EXISTS public.outreach_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.outreach_activities(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.workshop_prospects(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_outreach_clicks_activity ON public.outreach_clicks(activity_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_clicks_prospect ON public.outreach_clicks(prospect_id, clicked_at DESC);

GRANT SELECT ON public.outreach_clicks TO authenticated;
GRANT ALL ON public.outreach_clicks TO service_role;

ALTER TABLE public.outreach_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read outreach_clicks"
  ON public.outreach_clicks
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
