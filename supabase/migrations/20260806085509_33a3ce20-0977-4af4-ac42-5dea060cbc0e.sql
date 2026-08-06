ALTER TABLE public.bike_repair_requests
  ADD COLUMN IF NOT EXISTS customer_language text NOT NULL DEFAULT 'sv';

ALTER TABLE public.bike_repair_requests
  DROP CONSTRAINT IF EXISTS bike_repair_requests_customer_language_check;
ALTER TABLE public.bike_repair_requests
  ADD CONSTRAINT bike_repair_requests_customer_language_check CHECK (customer_language IN ('sv','en'));

CREATE OR REPLACE FUNCTION public.submit_bike_repair_request(
  p_bike_type text,
  p_repair_category text,
  p_description text,
  p_area text,
  p_postcode text,
  p_urgency text,
  p_can_drop_off boolean,
  p_wants_pickup boolean,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_city text,
  p_customer_language text DEFAULT 'sv'
)
RETURNS TABLE(id uuid, view_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_token uuid;
  v_lang text := CASE WHEN lower(coalesce(p_customer_language,'sv')) = 'en' THEN 'en' ELSE 'sv' END;
BEGIN
  INSERT INTO public.bike_repair_requests (
    bike_type, repair_category, description, area, postcode, urgency,
    can_drop_off, wants_pickup, customer_name, customer_email, customer_phone, city,
    customer_language
  ) VALUES (
    p_bike_type, p_repair_category, p_description, nullif(p_area,''), nullif(p_postcode,''), p_urgency,
    coalesce(p_can_drop_off,false), coalesce(p_wants_pickup,false), p_customer_name, lower(p_customer_email),
    nullif(p_customer_phone,''), p_city, v_lang
  )
  RETURNING bike_repair_requests.id, bike_repair_requests.view_token INTO v_id, v_token;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_bike_repair_request(text,text,text,text,text,text,boolean,boolean,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_bike_repair_request(text,text,text,text,text,text,boolean,boolean,text,text,text,text,text) TO service_role;