CREATE OR REPLACE FUNCTION public.get_cykel_open_requests_teaser()
RETURNS TABLE (
  repair_category text,
  bike_type text,
  city text,
  area text,
  urgency text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.repair_category, r.bike_type, r.city, r.area, r.urgency, r.created_at
  FROM public.bike_repair_requests r
  WHERE r.admin_status = 'approved'
    AND r.status IN ('new', 'has_offers')
    AND r.created_at > (now() - interval '14 days')
  ORDER BY r.created_at DESC
  LIMIT 12
$$;

GRANT EXECUTE ON FUNCTION public.get_cykel_open_requests_teaser() TO anon, authenticated;