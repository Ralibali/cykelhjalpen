-- Auto-approve only in cities with an active workshop.
-- Active = approved AND at least one workshop_responses row in the last 30 days
-- (same definition as admin-health / PR #9). City match is exact.

-- Hide unapproved requests from the workshop board view. The live workshop
-- list already filters admin_status = 'approved' in list-open-bike-requests.
CREATE OR REPLACE VIEW public.bike_requests_for_workshops
WITH (security_invoker = true) AS
SELECT
  id,
  bike_type,
  repair_category,
  description,
  postcode,
  city,
  area,
  urgency,
  can_drop_off,
  wants_pickup,
  status,
  created_at,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.workshop_responses wr
    WHERE wr.request_id = bike_repair_requests.id
      AND wr.workshop_id = get_workshop_id(auth.uid())
      AND wr.paid = true
  ) THEN customer_name ELSE NULL END AS customer_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.workshop_responses wr
    WHERE wr.request_id = bike_repair_requests.id
      AND wr.workshop_id = get_workshop_id(auth.uid())
      AND wr.paid = true
  ) THEN customer_email ELSE NULL END AS customer_email,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.workshop_responses wr
    WHERE wr.request_id = bike_repair_requests.id
      AND wr.workshop_id = get_workshop_id(auth.uid())
      AND wr.paid = true
  ) THEN customer_phone ELSE NULL END AS customer_phone,
  EXISTS (
    SELECT 1 FROM public.workshop_responses wr
    WHERE wr.request_id = bike_repair_requests.id
      AND wr.workshop_id = get_workshop_id(auth.uid())
  ) AS already_responded
FROM public.bike_repair_requests
WHERE status IN ('new', 'has_offers')
  AND admin_status = 'approved';

GRANT SELECT ON public.bike_requests_for_workshops TO authenticated;

-- One-time pass: approve currently pending requests only in eligible cities.
-- Norrköping (and any other city without an active workshop) is left pending.
UPDATE public.bike_repair_requests r
SET
  admin_status = 'approved',
  approved_at = COALESCE(r.approved_at, now())
WHERE r.admin_status = 'pending_approval'
  AND r.city IN ('Linköping', 'Norrköping', 'Uppsala', 'Lund')
  AND EXISTS (
    SELECT 1
    FROM public.workshops w
    WHERE w.approved IS TRUE
      AND w.city = r.city
      AND EXISTS (
        SELECT 1
        FROM public.workshop_responses wr
        WHERE wr.workshop_id = w.id
          AND wr.created_at >= now() - interval '30 days'
      )
  );
