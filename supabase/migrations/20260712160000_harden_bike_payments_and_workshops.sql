-- Keep Stripe retries idempotent and prevent two active Checkout sessions for one response.
WITH ranked_events AS (
  SELECT id, row_number() OVER (PARTITION BY stripe_event_id ORDER BY created_at, id) AS row_number
  FROM public.stripe_events
)
DELETE FROM public.stripe_events
WHERE id IN (SELECT id FROM ranked_events WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_stripe_event_id_unique
  ON public.stripe_events (stripe_event_id);

WITH ranked_pending AS (
  SELECT id, row_number() OVER (PARTITION BY response_id ORDER BY created_at DESC, id DESC) AS row_number
  FROM public.lead_charges
  WHERE status = 'pending'
)
UPDATE public.lead_charges
SET status = 'expired'
WHERE id IN (SELECT id FROM ranked_pending WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS lead_charges_one_pending_per_response
  ON public.lead_charges (response_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS workshop_responses_paid_request_idx
  ON public.workshop_responses (request_id)
  WHERE paid IS TRUE;

-- Consume a free lead, send the response and record the charge in one transaction.
CREATE OR REPLACE FUNCTION public.consume_free_lead_for_response(
  p_response_id uuid,
  p_workshop_id uuid
)
RETURNS TABLE (
  request_id uuid,
  remaining_free_leads integer,
  already_processed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response_row public.workshop_responses%ROWTYPE;
  workshop_row public.workshops%ROWTYPE;
  paid_count integer;
BEGIN
  SELECT *
    INTO workshop_row
    FROM public.workshops
   WHERE id = p_workshop_id
   FOR UPDATE;

  IF NOT FOUND OR workshop_row.approved IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'workshop_not_approved';
  END IF;

  SELECT *
    INTO response_row
    FROM public.workshop_responses
   WHERE id = p_response_id
   FOR UPDATE;

  IF NOT FOUND OR response_row.workshop_id <> p_workshop_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_not_found';
  END IF;

  IF response_row.paid IS TRUE THEN
    IF response_row.used_free_lead IS TRUE THEN
      RETURN QUERY SELECT response_row.request_id, workshop_row.free_leads_remaining, TRUE;
      RETURN;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_already_paid';
  END IF;

  IF workshop_row.free_leads_remaining <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'no_free_leads';
  END IF;

  UPDATE public.workshops
     SET free_leads_remaining = free_leads_remaining - 1,
         updated_at = now()
   WHERE id = p_workshop_id
  RETURNING * INTO workshop_row;

  -- The existing paid-limit trigger serializes responses per request and rolls
  -- this entire transaction back if five paid offers already exist.
  UPDATE public.workshop_responses
     SET paid = TRUE,
         used_free_lead = TRUE,
         status = 'sent'
   WHERE id = p_response_id;

  INSERT INTO public.lead_charges (
    response_id,
    request_id,
    workshop_id,
    amount,
    currency,
    status
  ) VALUES (
    p_response_id,
    response_row.request_id,
    p_workshop_id,
    0,
    'sek',
    'free_lead'
  );

  SELECT count(*)
    INTO paid_count
    FROM public.workshop_responses
   WHERE request_id = response_row.request_id
     AND paid IS TRUE;

  UPDATE public.bike_repair_requests
     SET status = CASE WHEN paid_count >= 5 THEN 'full' ELSE 'has_offers' END,
         updated_at = now()
   WHERE id = response_row.request_id;

  RETURN QUERY SELECT response_row.request_id, workshop_row.free_leads_remaining, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_free_lead_for_response(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_free_lead_for_response(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.consume_free_lead_for_response(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_free_lead_for_response(uuid, uuid) TO service_role;

-- A workshop may update its public contact details, but cannot grant itself
-- approval/free leads or silently switch city after approval.
CREATE OR REPLACE FUNCTION public.protect_workshop_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  privileged boolean;
BEGIN
  privileged := auth.role() = 'service_role'
    OR (auth.uid() IS NOT NULL AND COALESCE(public.is_admin(auth.uid()), FALSE));

  IF privileged THEN
    RETURN NEW;
  END IF;

  IF OLD.approved IS TRUE AND NEW.city IS DISTINCT FROM OLD.city THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'approved_workshop_city_locked';
  END IF;

  NEW.approved := OLD.approved;
  NEW.free_leads_remaining := OLD.free_leads_remaining;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.user_id := OLD.user_id;
  NEW.email := OLD.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_workshop_sensitive_fields_trigger ON public.workshops;
CREATE TRIGGER protect_workshop_sensitive_fields_trigger
BEFORE UPDATE ON public.workshops
FOR EACH ROW
EXECUTE FUNCTION public.protect_workshop_sensitive_fields();
