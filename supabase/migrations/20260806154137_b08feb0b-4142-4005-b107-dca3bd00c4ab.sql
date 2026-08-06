CREATE OR REPLACE FUNCTION public.apply_free_lead_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.workshops
     SET free_leads_remaining = COALESCE(free_leads_remaining, 0) + NEW.amount,
         updated_at = now()
   WHERE id = NEW.workshop_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_free_lead_grant ON public.free_lead_grants;
CREATE TRIGGER trg_apply_free_lead_grant
AFTER INSERT ON public.free_lead_grants
FOR EACH ROW EXECUTE FUNCTION public.apply_free_lead_grant();

-- Backfill grants that never reached the workshop balance
UPDATE public.workshops w
   SET free_leads_remaining = COALESCE(w.free_leads_remaining, 0) + g.total,
       updated_at = now()
  FROM (SELECT workshop_id, sum(amount)::int AS total FROM public.free_lead_grants GROUP BY workshop_id) g
 WHERE w.id = g.workshop_id
   AND COALESCE(w.free_leads_remaining, 0) = 0;