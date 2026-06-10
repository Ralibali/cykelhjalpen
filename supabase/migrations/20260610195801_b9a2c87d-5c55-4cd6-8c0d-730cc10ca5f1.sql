
CREATE OR REPLACE FUNCTION public.get_cykel_public_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'workshops', (SELECT count(*) FROM public.workshops WHERE approved = true),
    'requests',  (SELECT count(*) FROM public.bike_repair_requests),
    'responses', (SELECT count(*) FROM public.workshop_responses WHERE status = 'sent' OR paid = true)
  );
$$;
REVOKE ALL ON FUNCTION public.get_cykel_public_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_cykel_public_stats() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_cykel_price_stats()
RETURNS TABLE (
  repair_category text,
  sample_count bigint,
  price_low integer,
  price_high integer,
  price_typical integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.repair_category,
    count(*) AS sample_count,
    (round(min(wr.estimated_price_min) / 50.0) * 50)::int AS price_low,
    (round(max(wr.estimated_price_max) / 50.0) * 50)::int AS price_high,
    (round(avg((wr.estimated_price_min + wr.estimated_price_max) / 2.0) / 50.0) * 50)::int AS price_typical
  FROM public.workshop_responses wr
  JOIN public.bike_repair_requests r ON r.id = wr.request_id
  WHERE (wr.status = 'sent' OR wr.paid = true)
    AND wr.estimated_price_min IS NOT NULL
    AND wr.estimated_price_max IS NOT NULL
  GROUP BY r.repair_category
  HAVING count(*) >= 3;
$$;
REVOKE ALL ON FUNCTION public.get_cykel_price_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_cykel_price_stats() TO anon, authenticated;

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS sms_notifications boolean NOT NULL DEFAULT false;
