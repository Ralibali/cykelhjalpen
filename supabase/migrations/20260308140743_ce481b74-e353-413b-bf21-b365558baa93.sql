
-- Update close_project_on_max_offers to also notify the buyer
CREATE OR REPLACE FUNCTION public.close_project_on_max_offers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max int;
  v_count int;
  v_buyer_id uuid;
  v_title text;
BEGIN
  SELECT max_offers, buyer_id, title INTO v_max, v_buyer_id, v_title
  FROM public.projects WHERE id = NEW.project_id;

  v_max := COALESCE(v_max, 5);

  SELECT count(*) INTO v_count FROM public.offers WHERE project_id = NEW.project_id;

  IF v_count >= v_max THEN
    UPDATE public.projects SET status = 'closed' WHERE id = NEW.project_id;

    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      v_buyer_id,
      'project_closed',
      'Ditt uppdrag har fått max antal offerter',
      '"' || v_title || '" har nu ' || v_count || ' offerter och är stängt för nya svar.',
      '/dashboard/buyer/uppdrag/' || NEW.project_id
    );
  END IF;

  RETURN NEW;
END;
$$;
