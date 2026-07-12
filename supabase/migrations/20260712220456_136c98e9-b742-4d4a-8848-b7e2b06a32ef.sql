
-- Prospekt: unsubscribe + kontakthistorik
ALTER TABLE public.workshop_prospects
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS workshop_prospects_unsub_uniq
  ON public.workshop_prospects(unsubscribe_token);

-- Outreach: provider-metadata, låstid, idempotens
ALTER TABLE public.outreach_activities
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS send_lock_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS outreach_activities_idem_uniq
  ON public.outreach_activities(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Utöka statuslistan så vi kan markera "sending" atomiskt
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'outreach_activities_status_check'
  ) THEN
    ALTER TABLE public.outreach_activities DROP CONSTRAINT outreach_activities_status_check;
  END IF;
END $$;

ALTER TABLE public.outreach_activities
  ADD CONSTRAINT outreach_activities_status_check
  CHECK (status IN ('draft','pending_approval','approved','sending','sent','failed','skipped','replied'));
