-- Inkorg i adminportalen: inkommande mejl till info@cykelhjalpen.se (via Resend
-- inbound-webhook) lagras i inbound_emails, och mejl som skickas från portalen
-- sparas i sent_emails. Endast admins kan läsa/markera – skrivning sker via
-- edge-funktioner med service role.

CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id text UNIQUE,
  message_id text,
  from_email text NOT NULL,
  from_name text,
  to_emails text[] NOT NULL DEFAULT '{}',
  subject text,
  text_body text,
  html_body text,
  headers jsonb,
  raw jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  replied_at timestamptz,
  archived_at timestamptz,
  prospect_id uuid REFERENCES public.workshop_prospects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inbound_emails_received_idx ON public.inbound_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS inbound_emails_unread_idx ON public.inbound_emails(read_at) WHERE read_at IS NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS inbound_emails_from_idx ON public.inbound_emails(from_email);

CREATE TABLE IF NOT EXISTS public.sent_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_emails text[] NOT NULL,
  subject text NOT NULL,
  text_body text NOT NULL,
  html_body text,
  from_email text NOT NULL DEFAULT 'info@cykelhjalpen.se',
  in_reply_to uuid REFERENCES public.inbound_emails(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.workshop_prospects(id) ON DELETE SET NULL,
  resend_email_id text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed')),
  error text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sent_emails_created_idx ON public.sent_emails(created_at DESC);

GRANT SELECT, UPDATE ON public.inbound_emails TO authenticated;
GRANT ALL ON public.inbound_emails TO service_role;
GRANT SELECT, INSERT ON public.sent_emails TO authenticated;
GRANT ALL ON public.sent_emails TO service_role;

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read inbound_emails" ON public.inbound_emails;
CREATE POLICY "Admins read inbound_emails" ON public.inbound_emails
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update inbound_emails" ON public.inbound_emails;
CREATE POLICY "Admins update inbound_emails" ON public.inbound_emails
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read sent_emails" ON public.sent_emails;
CREATE POLICY "Admins read sent_emails" ON public.sent_emails
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins insert sent_emails" ON public.sent_emails;
CREATE POLICY "Admins insert sent_emails" ON public.sent_emails
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
