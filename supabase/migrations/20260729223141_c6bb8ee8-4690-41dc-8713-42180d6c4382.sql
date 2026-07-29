-- ============ 1. LEAD CREDITS SYSTEM ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name = 'workshops' AND column_name = 'free_leads_remaining'
  ) THEN
    ALTER TABLE public.workshops ADD COLUMN free_leads_remaining INTEGER NOT NULL DEFAULT 2;
  END IF;
END $$;

ALTER TABLE public.workshops ALTER COLUMN free_leads_remaining SET DEFAULT 2;

COMMENT ON COLUMN public.workshops.free_leads_remaining
IS 'Antal kvarvarande leads (gratis + köpta). Minskas av consume_free_lead_for_response().';

CREATE TABLE IF NOT EXISTS public.lead_credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount_ore INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'sek',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lead_credit_purchases TO authenticated;
GRANT ALL ON public.lead_credit_purchases TO service_role;

CREATE INDEX IF NOT EXISTS idx_lead_credit_purchases_workshop ON public.lead_credit_purchases(workshop_id);
CREATE INDEX IF NOT EXISTS idx_lead_credit_purchases_status ON public.lead_credit_purchases(status);

DROP TRIGGER IF EXISTS update_lead_credit_purchases_updated_at ON public.lead_credit_purchases;
CREATE TRIGGER update_lead_credit_purchases_updated_at
  BEFORE UPDATE ON public.lead_credit_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lead_credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workshops can view own purchases" ON public.lead_credit_purchases;
CREATE POLICY "Workshops can view own purchases"
ON public.lead_credit_purchases FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workshops w
  WHERE w.id = lead_credit_purchases.workshop_id AND w.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins can view all purchases" ON public.lead_credit_purchases;
CREATE POLICY "Admins can view all purchases"
ON public.lead_credit_purchases FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.stripe_events_dedupe_noop AS SELECT 1 WHERE false;
DROP TABLE IF EXISTS public.stripe_events_dedupe_noop;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name = 'workshops' AND column_name = 'purchased_leads'
  ) THEN
    UPDATE public.workshops
    SET free_leads_remaining = COALESCE(free_leads_remaining, 0) + COALESCE(purchased_leads, 0)
    WHERE purchased_leads IS NOT NULL AND purchased_leads > 0;
    ALTER TABLE public.workshops DROP COLUMN purchased_leads;
  END IF;
END $$;

COMMENT ON TABLE public.lead_credit_purchases IS 'Lagrar alla köp av lead-credits av verkstäder';

-- ============ 2. LEGAL TERMS ============
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '2026-07-28';
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS dpa_accepted_at TIMESTAMPTZ;

ALTER TABLE public.bike_repair_requests ADD COLUMN IF NOT EXISTS customer_terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.bike_repair_requests ADD COLUMN IF NOT EXISTS customer_terms_version TEXT DEFAULT '2026-07-28';

CREATE TABLE IF NOT EXISTS public.terms_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('customer', 'workshop', 'dpa')),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.terms_versions TO anon, authenticated;
GRANT ALL ON public.terms_versions TO service_role;

ALTER TABLE public.terms_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read terms versions" ON public.terms_versions;
CREATE POLICY "Anyone can read terms versions"
ON public.terms_versions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage terms versions" ON public.terms_versions;
CREATE POLICY "Admins manage terms versions"
ON public.terms_versions FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.terms_versions (type, version, title, content_summary)
SELECT v.type, v.version, v.title, v.summary
FROM (VALUES
  ('customer', '2026-07-28', 'Användarvillkor för kunder', 'Offert är estimat, konsumentskydd, reklamationsrätt, distansavtalslagen'),
  ('workshop', '2026-07-28', 'Plattformsavtal för verkstäder', 'Prisinformation, konsumenttjänstlagen, förbjudet beteende, GDPR/DPA'),
  ('dpa', '2026-07-28', 'Personuppgiftsbiträdesavtal (DPA)', 'GDPR, hantering av kunduppgifter, radering')
) AS v(type, version, title, summary)
WHERE NOT EXISTS (
  SELECT 1 FROM public.terms_versions t WHERE t.type = v.type AND t.version = v.version
);

CREATE TABLE IF NOT EXISTS public.terms_acceptance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'workshop')),
  entity_id UUID NOT NULL,
  terms_type TEXT NOT NULL CHECK (terms_type IN ('customer', 'workshop', 'dpa')),
  terms_version TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.terms_acceptance_log TO authenticated;
GRANT ALL ON public.terms_acceptance_log TO service_role;

ALTER TABLE public.terms_acceptance_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read acceptance log" ON public.terms_acceptance_log;
CREATE POLICY "Admins can read acceptance log"
ON public.terms_acceptance_log FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_entity ON public.terms_acceptance_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user ON public.terms_acceptance_log(user_id);

CREATE OR REPLACE FUNCTION public.log_terms_acceptance(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_terms_type TEXT,
  p_terms_version TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.terms_acceptance_log (
    user_id, entity_type, entity_id, terms_type, terms_version, ip_address, user_agent
  ) VALUES (
    p_user_id, p_entity_type, p_entity_id, p_terms_type, p_terms_version, p_ip_address, p_user_agent
  );
END;
$$;

COMMENT ON TABLE public.terms_acceptance_log IS 'Audit trail för alla villkorsgodkännanden enligt GDPR och avtalsrätt';