
CREATE OR REPLACE FUNCTION public.reserve_outreach_send_slot(
  _activity_id uuid,
  _cap int,
  _sender uuid
)
RETURNS SETOF public.outreach_activities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_key   text;
BEGIN
  -- Global lås så att räknaren och statusuppdateringen sker atomiskt
  PERFORM pg_advisory_xact_lock(hashtext('outreach_daily_cap'));

  SELECT count(*) INTO v_count
    FROM public.outreach_activities
   WHERE channel = 'email'
     AND status IN ('sent', 'sending')
     AND COALESCE(sent_at, send_lock_at) >= date_trunc('day', (now() AT TIME ZONE 'UTC'));

  IF v_count >= _cap THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'daily_cap_reached';
  END IF;

  v_key := 'outreach:' || _activity_id::text;

  RETURN QUERY
    UPDATE public.outreach_activities
       SET status          = 'sending',
           send_lock_at    = now(),
           sent_by         = _sender,
           provider        = 'resend',
           idempotency_key = v_key,
           error           = NULL,
           retry_count     = CASE WHEN status = 'failed' THEN retry_count + 1 ELSE retry_count END
     WHERE id = _activity_id
       AND status IN ('approved', 'failed')
    RETURNING *;
END
$$;

REVOKE ALL ON FUNCTION public.reserve_outreach_send_slot(uuid, int, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_outreach_send_slot(uuid, int, uuid) TO service_role;
