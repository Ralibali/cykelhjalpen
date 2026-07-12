-- Lock down server-only bike request creation and outreach reservation.
-- Both functions are SECURITY DEFINER and must only be callable by service_role.

REVOKE ALL ON FUNCTION public.submit_bike_repair_request(
  text, text, text, text, text, text, boolean, boolean, text, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_bike_repair_request(
  text, text, text, text, text, text, boolean, boolean, text, text, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.reserve_outreach_send_slot(uuid, integer, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_outreach_send_slot(uuid, integer, uuid)
TO service_role;

DROP POLICY IF EXISTS "Anyone submits bike request"
ON public.bike_repair_requests;

REVOKE INSERT ON public.bike_repair_requests FROM anon, authenticated;
