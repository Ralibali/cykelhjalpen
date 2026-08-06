CREATE OR REPLACE FUNCTION public.apply_free_lead_grant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.amount = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'grant_amount_zero';
  END IF;

  PERFORM set_config('app.grant_leads', 'on', true);
  UPDATE public.workshops
     SET free_leads_remaining = GREATEST(0, COALESCE(free_leads_remaining, 0) + NEW.amount),
         updated_at = now()
   WHERE id = NEW.workshop_id;
  PERFORM set_config('app.grant_leads', 'off', true);
  RETURN NEW;
END;
$function$;