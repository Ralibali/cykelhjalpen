-- Betala-vid-vinst: verkstäder svarar kostnadsfritt, avgiften (50 kr exkl. moms
-- eller ett gratis-lead) tas först ut när kunden väljer verkstaden som vinnare.
--
-- Statusvärden efter ändringen:
--   workshop_responses.status: 'draft'/'pending_payment' (utkast, ej synligt),
--     'sent' (synligt för kunden), 'won' (kundens val), 'lost' (ej vald).
--   bike_repair_requests.status: 'new', 'has_offers', 'closed_for_responses'
--     (tre skickade svar), 'completed' (kunden har valt verkstad).

-- 1. Max tre SKICKADE svar per ärende (tidigare: tre betalda).
CREATE OR REPLACE FUNCTION public.enforce_bike_response_sent_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sent_count integer;
  becomes_visible boolean := FALSE;
BEGIN
  IF NEW.status IN ('sent', 'won') THEN
    IF TG_OP = 'INSERT' THEN
      becomes_visible := TRUE;
    ELSIF COALESCE(OLD.status, '') NOT IN ('sent', 'won') THEN
      becomes_visible := TRUE;
    END IF;
  END IF;

  IF becomes_visible THEN
    -- Serialisera svar på samma ärende under transaktionens livstid.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.request_id::text, 0));

    SELECT count(*)
      INTO sent_count
      FROM public.workshop_responses
     WHERE request_id = NEW.request_id
       AND status IN ('sent', 'won')
       AND id <> NEW.id;

    IF sent_count >= 3 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'bike_request_full';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bike_response_paid_limit_insert ON public.workshop_responses;
DROP TRIGGER IF EXISTS enforce_bike_response_paid_limit_update ON public.workshop_responses;
DROP TRIGGER IF EXISTS enforce_bike_response_sent_limit ON public.workshop_responses;
CREATE TRIGGER enforce_bike_response_sent_limit
BEFORE INSERT OR UPDATE OF status ON public.workshop_responses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_bike_response_sent_limit();

-- 2. Ärendets status följer nu skickade svar (inte betalda). Triggern skapades
--    ursprungligen som AFTER UPDATE, så den behöver skapas om med samma event.
CREATE OR REPLACE FUNCTION public.close_bike_request_on_max_responses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS DISTINCT FROM 'sent') THEN
    SELECT count(*) INTO v_count
    FROM public.workshop_responses
    WHERE request_id = NEW.request_id AND status IN ('sent', 'won');

    IF v_count >= 3 THEN
      UPDATE public.bike_repair_requests
      SET status = 'closed_for_responses', updated_at = now()
      WHERE id = NEW.request_id AND status <> 'completed';
    ELSE
      UPDATE public.bike_repair_requests
      SET status = 'has_offers', updated_at = now()
      WHERE id = NEW.request_id AND status = 'new';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Kunden väljer vinnare. Hela regleringen sker atomiskt i databasen:
--    vinnaren blir 'won', övriga skickade svar blir 'lost', ärendet 'completed'.
CREATE OR REPLACE FUNCTION public.choose_bike_winner(
  p_request_id uuid,
  p_response_id uuid
)
RETURNS TABLE (
  winner_workshop_id uuid,
  already_chosen boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.bike_repair_requests%ROWTYPE;
  response_row public.workshop_responses%ROWTYPE;
  existing_winner public.workshop_responses%ROWTYPE;
BEGIN
  SELECT * INTO request_row FROM public.bike_repair_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'request_not_found';
  END IF;

  SELECT * INTO existing_winner
    FROM public.workshop_responses
   WHERE request_id = p_request_id AND status = 'won'
   LIMIT 1;

  IF FOUND THEN
    IF existing_winner.id = p_response_id THEN
      RETURN QUERY SELECT existing_winner.workshop_id, TRUE;
      RETURN;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'winner_already_chosen';
  END IF;

  SELECT * INTO response_row FROM public.workshop_responses WHERE id = p_response_id FOR UPDATE;
  IF NOT FOUND OR response_row.request_id <> p_request_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_not_found';
  END IF;
  IF response_row.status <> 'sent' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_not_sent';
  END IF;

  UPDATE public.workshop_responses SET status = 'won' WHERE id = p_response_id;
  UPDATE public.workshop_responses SET status = 'lost'
   WHERE request_id = p_request_id AND status = 'sent' AND id <> p_response_id;

  UPDATE public.bike_repair_requests
     SET status = 'completed', updated_at = now()
   WHERE id = p_request_id;

  RETURN QUERY SELECT response_row.workshop_id, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.choose_bike_winner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.choose_bike_winner(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.choose_bike_winner(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.choose_bike_winner(uuid, uuid) TO service_role;

-- 4. Vinnaren reglerar med ett gratis-lead: saldot dras, svaret markeras betalt
--    (status förblir 'won') och en kostnadsfri lead_charge loggas.
CREATE OR REPLACE FUNCTION public.settle_winner_free_lead(
  p_response_id uuid,
  p_workshop_id uuid
)
RETURNS TABLE (
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
BEGIN
  SELECT * INTO workshop_row FROM public.workshops WHERE id = p_workshop_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'workshop_not_found';
  END IF;

  SELECT * INTO response_row FROM public.workshop_responses WHERE id = p_response_id FOR UPDATE;
  IF NOT FOUND OR response_row.workshop_id <> p_workshop_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_not_found';
  END IF;
  IF response_row.status <> 'won' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_not_won';
  END IF;

  IF response_row.paid IS TRUE THEN
    IF response_row.used_free_lead IS TRUE THEN
      RETURN QUERY SELECT workshop_row.free_leads_remaining, TRUE;
      RETURN;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_already_paid';
  END IF;

  IF COALESCE(workshop_row.free_leads_remaining, 0) <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'no_free_leads';
  END IF;

  UPDATE public.workshops
     SET free_leads_remaining = free_leads_remaining - 1,
         updated_at = now()
   WHERE id = p_workshop_id
  RETURNING * INTO workshop_row;

  UPDATE public.workshop_responses
     SET paid = TRUE,
         used_free_lead = TRUE
   WHERE id = p_response_id;

  INSERT INTO public.lead_charges (
    response_id, request_id, workshop_id, amount, currency, status
  ) VALUES (
    p_response_id, response_row.request_id, p_workshop_id, 0, 'sek', 'free_lead'
  );

  RETURN QUERY SELECT workshop_row.free_leads_remaining, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_winner_free_lead(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_winner_free_lead(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.settle_winner_free_lead(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.settle_winner_free_lead(uuid, uuid) TO service_role;
