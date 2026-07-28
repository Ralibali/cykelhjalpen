-- Migration: Lead-credits system + fakturahistorik + notiser
-- Kör detta i Supabase SQL Editor

-- 1. Säkerställ free_leads_remaining
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshops' 
    AND column_name = 'free_leads_remaining'
  ) THEN
    ALTER TABLE public.workshops 
    ADD COLUMN free_leads_remaining INTEGER NOT NULL DEFAULT 2;
  END IF;
END $$;

ALTER TABLE public.workshops 
ALTER COLUMN free_leads_remaining SET DEFAULT 2;

COMMENT ON COLUMN public.workshops.free_leads_remaining 
IS 'Antal kvarvarande leads (gratis + köpta). Sätts till 5 vid registrering. Minskas av consume_free_lead_for_response().';

-- 2. Tabell för lead-credits-köp
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

-- Index för snabb lookup
CREATE INDEX IF NOT EXISTS idx_lead_credit_purchases_workshop 
ON public.lead_credit_purchases(workshop_id);

CREATE INDEX IF NOT EXISTS idx_lead_credit_purchases_status 
ON public.lead_credit_purchases(status);

-- Trigger för updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_lead_credit_purchases_updated_at 
ON public.lead_credit_purchases;

CREATE TRIGGER update_lead_credit_purchases_updated_at
  BEFORE UPDATE ON public.lead_credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS för lead_credit_purchases
ALTER TABLE public.lead_credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workshops can view own purchases" ON public.lead_credit_purchases;
CREATE POLICY "Workshops can view own purchases" 
ON public.lead_credit_purchases FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workshops w 
  WHERE w.id = workshop_id AND w.user_id = auth.uid()
));

-- 3. Stripe events deduplicering
CREATE TABLE IF NOT EXISTS public.stripe_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Uppdatera consume_free_lead_for_response för att fungera med köpta credits
-- (Den befintliga bör redan minska free_leads_remaining, vilket nu representerar totala credits)
-- Om du har en separat kolumn för köpta credits, slå ihop dem här:

-- Kontrollera om det finns en separat purchased_leads-kolumn
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workshops' 
    AND column_name = 'purchased_leads'
  ) THEN
    -- Slå ihop i free_leads_remaining
    UPDATE public.workshops 
    SET free_leads_remaining = COALESCE(free_leads_remaining, 0) + COALESCE(purchased_leads, 0)
    WHERE purchased_leads IS NOT NULL AND purchased_leads > 0;

    ALTER TABLE public.workshops DROP COLUMN purchased_leads;
  END IF;
END $$;

-- 5. Lägg till kommentarer
COMMENT ON TABLE public.lead_credit_purchases IS 'Lagrar alla köp av lead-credits av verkstäder';
COMMENT ON TABLE public.stripe_events IS 'Deduplicering av Stripe-webhook events';
