CREATE OR REPLACE FUNCTION public.apply_free_lead_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.grant_leads', 'on', true);
  UPDATE public.workshops
     SET free_leads_remaining = COALESCE(free_leads_remaining, 0) + NEW.amount,
         updated_at = now()
   WHERE id = NEW.workshop_id;
  PERFORM set_config('app.grant_leads', 'off', true);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_workshop_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_jwt_role text;
BEGIN
  IF coalesce(current_setting('app.grant_leads', true), 'off') = 'on' THEN RETURN NEW; END IF;
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

CREATE OR REPLACE FUNCTION public.protect_workshop_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  privileged boolean;
BEGIN
  IF coalesce(current_setting('app.grant_leads', true), 'off') = 'on' THEN RETURN NEW; END IF;

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

-- Backfill tidigare påfyllnader
DO $$
BEGIN
  PERFORM set_config('app.grant_leads', 'on', true);
  UPDATE public.workshops w
     SET free_leads_remaining = COALESCE(w.free_leads_remaining, 0) + g.total,
         updated_at = now()
    FROM (SELECT workshop_id, sum(amount)::int AS total FROM public.free_lead_grants GROUP BY workshop_id) g
   WHERE w.id = g.workshop_id
     AND COALESCE(w.free_leads_remaining, 0) = 0;
  PERFORM set_config('app.grant_leads', 'off', true);
END $$;