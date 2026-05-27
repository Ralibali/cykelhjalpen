-- Guard: workshops — block owner-update of sensitive fields
CREATE OR REPLACE FUNCTION public.guard_workshop_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.approved := OLD.approved;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.user_id := OLD.user_id;
  NEW.slug := OLD.slug;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_workshop_self_update ON public.workshops;
CREATE TRIGGER trg_guard_workshop_self_update
BEFORE UPDATE ON public.workshops
FOR EACH ROW EXECUTE FUNCTION public.guard_workshop_self_update();

-- Guard: workshop_responses — block owner-update of paid + stripe-id,
-- and prevent any change to an already paid/sent response (except admin)
CREATE OR REPLACE FUNCTION public.guard_response_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.paid := OLD.paid;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.workshop_id := OLD.workshop_id;
  NEW.request_id := OLD.request_id;
  NEW.created_at := OLD.created_at;
  NEW.status := OLD.status;
  IF OLD.paid = true OR OLD.status IN ('sent', 'closed') THEN
    RAISE EXCEPTION 'Cannot modify a response that has been paid or sent';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_response_self_update ON public.workshop_responses;
CREATE TRIGGER trg_guard_response_self_update
BEFORE UPDATE ON public.workshop_responses
FOR EACH ROW EXECUTE FUNCTION public.guard_response_self_update();

-- Tighten bike_request_images — require referenced request to exist
DROP POLICY IF EXISTS "Anyone uploads bike image record" ON public.bike_request_images;
CREATE POLICY "Anyone uploads bike image with valid request"
ON public.bike_request_images FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bike_repair_requests
    WHERE id = bike_request_images.request_id
  )
);

-- Tighten read access on bike_request_images
DROP POLICY IF EXISTS "Public reads bike images" ON public.bike_request_images;
CREATE POLICY "Workshop reads images of paid request"
ON public.bike_request_images FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (
    public.is_approved_workshop(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workshop_responses wr
      WHERE wr.request_id = bike_request_images.request_id
        AND wr.workshop_id = public.get_workshop_id(auth.uid())
        AND wr.paid = true
    )
  )
);