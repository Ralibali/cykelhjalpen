-- Migration: Juridiska villkor och avtal enligt svensk lag
-- Kör detta i Supabase SQL Editor

-- 1. Lägg till kolumner för villkorsgodkännande i workshops
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshops' 
    AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE public.workshops 
    ADD COLUMN terms_accepted_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshops' 
    AND column_name = 'terms_version'
  ) THEN
    ALTER TABLE public.workshops 
    ADD COLUMN terms_version TEXT DEFAULT '2026-07-28';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshops' 
    AND column_name = 'dpa_accepted_at'
  ) THEN
    ALTER TABLE public.workshops 
    ADD COLUMN dpa_accepted_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Lägg till kolumner för villkorsgodkännande i bike_repair_requests (kunder)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bike_repair_requests' 
    AND column_name = 'customer_terms_accepted_at'
  ) THEN
    ALTER TABLE public.bike_repair_requests 
    ADD COLUMN customer_terms_accepted_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bike_repair_requests' 
    AND column_name = 'customer_terms_version'
  ) THEN
    ALTER TABLE public.bike_repair_requests 
    ADD COLUMN customer_terms_version TEXT DEFAULT '2026-07-28';
  END IF;
END $$;

-- 3. Tabell för att spåra villkorsversioner (audit trail)
CREATE TABLE IF NOT EXISTS public.terms_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('customer', 'workshop', 'dpa')),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lägg in initiala versioner
INSERT INTO public.terms_versions (type, version, title, content_summary)
VALUES 
  ('customer', '2026-07-28', 'Användarvillkor för kunder', 'Offert är estimat, konsumentskydd, reklamationsrätt, distansavtalslagen'),
  ('workshop', '2026-07-28', 'Plattformsavtal för verkstäder', 'Prisinformation, konsumenttjänstlagen, förbjudet beteende, GDPR/DPA'),
  ('dpa', '2026-07-28', 'Personuppgiftsbiträdesavtal (DPA)', 'GDPR, hantering av kunduppgifter, radering')
ON CONFLICT DO NOTHING;

-- 4. Tabell för audit log av godkännanden
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

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_entity 
ON public.terms_acceptance_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user 
ON public.terms_acceptance_log(user_id);

-- 5. Funktion för att logga villkorsgodkännande
CREATE OR REPLACE FUNCTION log_terms_acceptance(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_terms_type TEXT,
  p_terms_version TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.terms_acceptance_log (
    user_id, entity_type, entity_id, terms_type, terms_version, ip_address, user_agent
  ) VALUES (
    p_user_id, p_entity_type, p_entity_id, p_terms_type, p_terms_version, p_ip_address, p_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Kommentarer
COMMENT ON COLUMN public.workshops.terms_accepted_at IS 'När verkstaden godkände plattformsavtalet';
COMMENT ON COLUMN public.workshops.dpa_accepted_at IS 'När verkstaden godkände personuppgiftsbiträdesavtalet (GDPR)';
COMMENT ON COLUMN public.bike_repair_requests.customer_terms_accepted_at IS 'När kunden godkände användarvillkoren';
COMMENT ON TABLE public.terms_acceptance_log IS 'Audit trail för alla villkorsgodkännanden enligt GDPR och avtalsrätt';
