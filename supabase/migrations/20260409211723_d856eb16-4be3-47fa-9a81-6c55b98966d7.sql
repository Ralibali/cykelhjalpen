
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text DEFAULT 'homepage',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email)
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins read subscribers"
  ON public.newsletter_subscribers
  FOR SELECT
  USING (is_admin(auth.uid()));
