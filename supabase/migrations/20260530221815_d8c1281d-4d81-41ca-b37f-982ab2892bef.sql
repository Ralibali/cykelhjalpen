CREATE OR REPLACE FUNCTION public.guard_workshop_write()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_jwt_role text;
BEGIN
  v_jwt_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  IF v_jwt_role = 'service_role' OR public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.approved := false; NEW.stripe_customer_id := NULL; NEW.free_leads_remaining := 0;
    RETURN NEW;
  END IF;
  NEW.approved := OLD.approved; NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.free_leads_remaining := OLD.free_leads_remaining; NEW.user_id := OLD.user_id;
  NEW.slug := OLD.slug; NEW.created_at := OLD.created_at;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_workshop_self_update ON public.workshops;
DROP TRIGGER IF EXISTS trg_guard_workshop_write ON public.workshops;
CREATE TRIGGER trg_guard_workshop_write BEFORE INSERT OR UPDATE ON public.workshops
FOR EACH ROW EXECUTE FUNCTION public.guard_workshop_write();

CREATE OR REPLACE FUNCTION public.guard_response_write()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_jwt_role text;
BEGIN
  v_jwt_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  IF v_jwt_role = 'service_role' OR public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.paid := false; NEW.used_free_lead := false; NEW.stripe_payment_intent_id := NULL;
    IF NEW.status IS NULL OR NEW.status NOT IN ('draft','pending_payment') THEN NEW.status := 'pending_payment'; END IF;
    RETURN NEW;
  END IF;
  NEW.paid := OLD.paid; NEW.used_free_lead := OLD.used_free_lead;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.workshop_id := OLD.workshop_id; NEW.request_id := OLD.request_id;
  NEW.created_at := OLD.created_at; NEW.status := OLD.status;
  IF OLD.paid = true OR OLD.status IN ('sent','closed') THEN
    RAISE EXCEPTION 'Cannot modify a response that has been paid or sent';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_response_self_update ON public.workshop_responses;
DROP TRIGGER IF EXISTS trg_guard_response_write ON public.workshop_responses;
CREATE TRIGGER trg_guard_response_write BEFORE INSERT OR UPDATE ON public.workshop_responses
FOR EACH ROW EXECUTE FUNCTION public.guard_response_write();