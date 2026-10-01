-- Antal öppna, granskade kundärenden per stad de senaste 14 dagarna.
-- Visas för verkstäder på /for-cykelverkstader som verklig efterfrågan.
-- Returnerar bara aggregat (stad, antal, senaste tidpunkt) – inga ärendedetaljer.
-- Samma urval som get_cykel_open_requests_teaser(), men utan LIMIT så att
-- siffrorna inte kapas.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.get_cykel_open_request_counts();

CREATE OR REPLACE FUNCTION public.get_cykel_open_request_counts()
RETURNS TABLE (
  city text,
  open_count bigint,
  latest_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.city, count(*) AS open_count, max(r.created_at) AS latest_at
  FROM public.bike_repair_requests r
  WHERE r.admin_status = 'approved'
    AND r.status IN ('new', 'has_offers')
    AND r.created_at > (now() - interval '14 days')
  GROUP BY r.city
$$;

REVOKE ALL ON FUNCTION public.get_cykel_open_request_counts() FROM public;
GRANT EXECUTE ON FUNCTION public.get_cykel_open_request_counts() TO anon, authenticated;
