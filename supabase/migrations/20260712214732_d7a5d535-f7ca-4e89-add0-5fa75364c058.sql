
-- Statuslista för prospects
CREATE TABLE IF NOT EXISTS public.workshop_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  normalized_name text NOT NULL,
  website text,
  normalized_domain text,
  email text,
  normalized_email text,
  phone text,
  normalized_phone text,
  address text,
  city text NOT NULL,
  services text[] NOT NULL DEFAULT '{}',
  opening_hours text,
  ai_summary text,
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','review','approved_for_contact','contacted','replied','converted','rejected','do_not_contact')),
  do_not_contact boolean NOT NULL DEFAULT false,
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_checked_at timestamptz,
  converted_workshop_id uuid REFERENCES public.workshops(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workshop_prospects_domain_uniq ON public.workshop_prospects(normalized_domain) WHERE normalized_domain IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workshop_prospects_phone_uniq ON public.workshop_prospects(normalized_phone) WHERE normalized_phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workshop_prospects_name_city_uniq ON public.workshop_prospects(normalized_name, city);
CREATE INDEX IF NOT EXISTS workshop_prospects_status_city_idx ON public.workshop_prospects(status, city, score DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_prospects TO authenticated;
GRANT ALL ON public.workshop_prospects TO service_role;
ALTER TABLE public.workshop_prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage workshop_prospects" ON public.workshop_prospects;
CREATE POLICY "Admins manage workshop_prospects" ON public.workshop_prospects
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_workshop_prospects_updated_at ON public.workshop_prospects;
CREATE TRIGGER update_workshop_prospects_updated_at
  BEFORE UPDATE ON public.workshop_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- prospect_sources
CREATE TABLE IF NOT EXISTS public.prospect_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.workshop_prospects(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_url text,
  search_term text,
  city text,
  raw_excerpt text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospect_sources_prospect_idx ON public.prospect_sources(prospect_id, fetched_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_sources TO authenticated;
GRANT ALL ON public.prospect_sources TO service_role;
ALTER TABLE public.prospect_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage prospect_sources" ON public.prospect_sources;
CREATE POLICY "Admins manage prospect_sources" ON public.prospect_sources
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- outreach_activities
CREATE TABLE IF NOT EXISTS public.outreach_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.workshop_prospects(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','manual')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','sent','failed','skipped','replied')),
  subject text,
  message text NOT NULL,
  recipient text NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outreach_activities_prospect_idx ON public.outreach_activities(prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_activities_status_idx ON public.outreach_activities(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_activities TO authenticated;
GRANT ALL ON public.outreach_activities TO service_role;
ALTER TABLE public.outreach_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage outreach_activities" ON public.outreach_activities;
CREATE POLICY "Admins manage outreach_activities" ON public.outreach_activities
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_outreach_activities_updated_at ON public.outreach_activities;
CREATE TRIGGER update_outreach_activities_updated_at
  BEFORE UPDATE ON public.outreach_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- contact_suppression
CREATE TABLE IF NOT EXISTS public.contact_suppression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type text NOT NULL CHECK (contact_type IN ('email','phone','domain')),
  value text NOT NULL,
  reason text,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contact_suppression_type_value_uniq ON public.contact_suppression(contact_type, value);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_suppression TO authenticated;
GRANT ALL ON public.contact_suppression TO service_role;
ALTER TABLE public.contact_suppression ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage contact_suppression" ON public.contact_suppression;
CREATE POLICY "Admins manage contact_suppression" ON public.contact_suppression
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger: när ett prospekt sätts till do_not_contact, lägg till dess kontaktvärden i suppression
CREATE OR REPLACE FUNCTION public.sync_prospect_suppression()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.do_not_contact = true AND (OLD.do_not_contact IS DISTINCT FROM true) THEN
    IF NEW.normalized_email IS NOT NULL THEN
      INSERT INTO public.contact_suppression(contact_type, value, reason)
      VALUES ('email', NEW.normalized_email, 'prospect_do_not_contact')
      ON CONFLICT (contact_type, value) DO NOTHING;
    END IF;
    IF NEW.normalized_phone IS NOT NULL THEN
      INSERT INTO public.contact_suppression(contact_type, value, reason)
      VALUES ('phone', NEW.normalized_phone, 'prospect_do_not_contact')
      ON CONFLICT (contact_type, value) DO NOTHING;
    END IF;
    IF NEW.normalized_domain IS NOT NULL THEN
      INSERT INTO public.contact_suppression(contact_type, value, reason)
      VALUES ('domain', NEW.normalized_domain, 'prospect_do_not_contact')
      ON CONFLICT (contact_type, value) DO NOTHING;
    END IF;
    IF NEW.status <> 'do_not_contact' THEN
      NEW.status := 'do_not_contact';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_prospect_suppression_trigger ON public.workshop_prospects;
CREATE TRIGGER sync_prospect_suppression_trigger
  BEFORE UPDATE ON public.workshop_prospects
  FOR EACH ROW EXECUTE FUNCTION public.sync_prospect_suppression();
