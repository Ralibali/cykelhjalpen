-- Enforce the five-response limit inside PostgreSQL so concurrent Stripe
-- webhooks and free-lead submissions cannot exceed it.
CREATE OR REPLACE FUNCTION public.enforce_bike_response_paid_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  paid_count integer;
  should_check boolean := FALSE;
BEGIN
  IF NEW.paid IS TRUE THEN
    IF TG_OP = 'INSERT' THEN
      should_check := TRUE;
    ELSIF COALESCE(OLD.paid, FALSE) IS FALSE THEN
      should_check := TRUE;
    END IF;
  END IF;

  IF should_check THEN
    -- Serialize paid responses for the same request for the duration of this transaction.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.request_id::text, 0));

    SELECT count(*)
      INTO paid_count
      FROM public.workshop_responses
     WHERE request_id = NEW.request_id
       AND paid IS TRUE
       AND id <> NEW.id;

    IF paid_count >= 5 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'bike_request_full';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bike_response_paid_limit_insert ON public.workshop_responses;
CREATE TRIGGER enforce_bike_response_paid_limit_insert
BEFORE INSERT ON public.workshop_responses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_bike_response_paid_limit();

DROP TRIGGER IF EXISTS enforce_bike_response_paid_limit_update ON public.workshop_responses;
CREATE TRIGGER enforce_bike_response_paid_limit_update
BEFORE UPDATE OF paid ON public.workshop_responses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_bike_response_paid_limit();
