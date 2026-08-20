CREATE OR REPLACE VIEW public.bike_requests_for_workshops
WITH (security_invoker = true) AS
SELECT
  id, bike_type, repair_category, description, postcode, city, area, urgency,
  can_drop_off, wants_pickup, status, created_at,
  CASE WHEN EXISTS (SELECT 1 FROM public.workshop_responses wr WHERE wr.request_id = bike_repair_requests.id AND wr.workshop_id = get_workshop_id(auth.uid()) AND wr.paid = true) THEN customer_name ELSE NULL END AS customer_name,
  CASE WHEN EXISTS (SELECT 1 FROM public.workshop_responses wr WHERE wr.request_id = bike_repair_requests.id AND wr.workshop_id = get_workshop_id(auth.uid()) AND wr.paid = true) THEN customer_email ELSE NULL END AS customer_email,
  CASE WHEN EXISTS (SELECT 1 FROM public.workshop_responses wr WHERE wr.request_id = bike_repair_requests.id AND wr.workshop_id = get_workshop_id(auth.uid()) AND wr.paid = true) THEN customer_phone ELSE NULL END AS customer_phone,
  EXISTS (SELECT 1 FROM public.workshop_responses wr WHERE wr.request_id = bike_repair_requests.id AND wr.workshop_id = get_workshop_id(auth.uid())) AS already_responded
FROM public.bike_repair_requests
WHERE status IN ('new', 'has_offers')
  AND admin_status = 'approved';

GRANT SELECT ON public.bike_requests_for_workshops TO authenticated;

UPDATE public.bike_repair_requests r
SET admin_status = 'approved', approved_at = COALESCE(r.approved_at, now())
WHERE r.admin_status = 'pending_approval'
  AND r.city IN ('Linköping', 'Norrköping', 'Uppsala', 'Lund')
  AND EXISTS (
    SELECT 1 FROM public.workshops w
    WHERE w.approved IS TRUE AND w.city = r.city
      AND EXISTS (SELECT 1 FROM public.workshop_responses wr WHERE wr.workshop_id = w.id AND wr.created_at >= now() - interval '30 days')
  );