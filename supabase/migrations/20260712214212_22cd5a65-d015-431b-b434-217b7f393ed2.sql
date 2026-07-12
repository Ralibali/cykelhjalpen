
CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('in_app','email','sms')),
  provider text,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped','failed','retrying')),
  attempts integer NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_events_idem_uniq ON public.notification_events(idempotency_key);
CREATE INDEX IF NOT EXISTS notification_events_status_created_idx ON public.notification_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_events_channel_idx ON public.notification_events(channel);

GRANT SELECT ON public.notification_events TO authenticated;
GRANT ALL ON public.notification_events TO service_role;

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view notification events" ON public.notification_events;
CREATE POLICY "Admins can view notification events"
  ON public.notification_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_notification_events_updated_at ON public.notification_events;
CREATE TRIGGER update_notification_events_updated_at
  BEFORE UPDATE ON public.notification_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
