-- Manuell påfyllning av gratis-leads: en rad i free_lead_grants (som bara
-- admins får skriva via RLS) höjer nu automatiskt verkstadens saldo.
-- Tidigare var tabellen enbart en logg – saldot i workshops.free_leads_remaining
-- påverkades inte, så påfyllning krävde manuell databasredigering.

CREATE OR REPLACE FUNCTION public.apply_free_lead_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workshops
  SET free_leads_remaining = COALESCE(free_leads_remaining, 0) + NEW.amount
  WHERE id = NEW.workshop_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'workshop_not_found';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_free_lead_grant_trigger ON public.free_lead_grants;
CREATE TRIGGER apply_free_lead_grant_trigger
  AFTER INSERT ON public.free_lead_grants
  FOR EACH ROW EXECUTE FUNCTION public.apply_free_lead_grant();

-- Skydda mot misstag: påfyllningar ska alltid vara positiva.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'free_lead_grants_amount_positive'
  ) THEN
    ALTER TABLE public.free_lead_grants
      ADD CONSTRAINT free_lead_grants_amount_positive CHECK (amount > 0);
  END IF;
END $$;
