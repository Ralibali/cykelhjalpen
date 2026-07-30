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

DROP POLICY IF EXISTS "Admins read outreach_clicks" ON public.outreach_clicks;
CREATE POLICY "Admins read outreach_clicks"
  ON public.outreach_clicks
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

ALTER TABLE public.outreach_activities
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'initial';

COMMENT ON COLUMN public.outreach_activities.kind IS
  'initial = första kontakten, followup = uppföljning till prospekt som klickat på länken';