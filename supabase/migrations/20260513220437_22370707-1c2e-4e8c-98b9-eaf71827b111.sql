
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
  p_city text DEFAULT 'Linköping'
) RETURNS TABLE(id uuid, view_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.bike_repair_requests (
    bike_type, repair_category, description, area, postcode, urgency,
    can_drop_off, wants_pickup, customer_name, customer_email, customer_phone, city
  ) VALUES (
    p_bike_type, p_repair_category, p_description, p_area, p_postcode, p_urgency,
    p_can_drop_off, p_wants_pickup, p_customer_name, p_customer_email, p_customer_phone, p_city
  )
  RETURNING bike_repair_requests.id, bike_repair_requests.view_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_bike_repair_request(text,text,text,text,text,text,boolean,boolean,text,text,text,text) TO anon, authenticated;
