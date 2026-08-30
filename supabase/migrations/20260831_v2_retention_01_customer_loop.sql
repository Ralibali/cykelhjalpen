-- V2 S8 customer-retention: maintenance-reminder rule config + retention indexes.
-- Contract: docs/v2/CONTRACTS.md §2.7 (S8 retention). Branch: v2/customer-retention.
--
-- ADDITIVE ONLY. Rollback:
--   drop table if exists public.v2_maintenance_reminder_rules;
--   drop index if exists public.v2_retention_contacts_unsubscribe_token;
--   drop index if exists public.v2_retention_contacts_stage;
--
-- Cron scheduling note (registry R4 / invariant I7 — S13 schedules at deploy,
-- verifies with `select * from cron.job`):
--   v2-retention-cron-daily  '50 7 * * *'  → POST /functions/v1/v2-retention-cron
--   (registered in 20260830_v2_contracts_06_public_surface.sql §4; flag
--    v2.retention.lifecycle stays OFF until gate G-T1 is green).

-- ============================================
-- 1. Maintenance lifecycle hooks (mission #4):
--    which reminder a completed job schedules. Capability only — read by
--    v2-retention-cron, nothing sends while v2.retention.lifecycle is off.
-- ============================================
CREATE TABLE public.v2_maintenance_reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Exact match against bike_repair_requests.repair_category; '*' = fallback.
  repair_category text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'seasonal_reminder'
    CHECK (kind IN ('seasonal_reminder','reactivation')),
  -- Minsta ålder på ett avslutat jobb innan påminnelse blir aktuell.
  remind_after_months integer NOT NULL CHECK (remind_after_months BETWEEN 1 AND 36),
  -- Dagar efter första utskicket som UPPFÖLJNINGEN (max 1) skickas. 0 = ingen.
  followup_days integer NOT NULL DEFAULT 0 CHECK (followup_days BETWEEN 0 AND 30),
  enabled boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.v2_maintenance_reminder_rules IS
  'S8: konfiguration för underhållslivscykeln — vilken påminnelse ett avslutat jobb schemalägger. Ändras av admin, aldrig av kunder.';

INSERT INTO public.v2_maintenance_reminder_rules
  (repair_category, kind, remind_after_months, followup_days, notes)
VALUES
  -- Vårservice: årlig genomgång (BikePath/branchstandard: service minst 1 gång/år).
  ('Service / genomgång', 'seasonal_reminder', 11, 14, 'vårservice årlig'),
  ('Växlar / kedja', 'seasonal_reminder', 8, 14, 'kedjebyte → följ upp efter ~8 månader'),
  ('Bromsar', 'seasonal_reminder', 10, 14, 'bromsslitage → årlig kontroll'),
  ('Punktering / däckbyte', 'seasonal_reminder', 11, 14, 'däck/slang → inför nästa säsong'),
  ('Hjul / ekrar', 'seasonal_reminder', 11, 14, NULL),
  ('Elcykel-problem', 'seasonal_reminder', 11, 14, 'elcykel → årlig batteri-/systemkontroll'),
  ('Lyse / elektronik', 'seasonal_reminder', 11, 14, NULL),
  ('Annat', 'seasonal_reminder', 11, 14, NULL),
  ('*', 'seasonal_reminder', 11, 14, 'fallback för framtida kategorier');

ALTER TABLE public.v2_maintenance_reminder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages maintenance reminder rules"
ON public.v2_maintenance_reminder_rules FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 2. Indexes supporting the retention loop
-- ============================================
-- v2-retention-unsubscribe slår upp kontakten via den publika länkens token.
CREATE INDEX v2_retention_contacts_unsubscribe_token
  ON public.v2_retention_contacts (unsubscribe_token);

-- Cron-fasen filtrerar på kundkontakter med marknadssamtycke per stage.
CREATE INDEX v2_retention_contacts_stage
  ON public.v2_retention_contacts (subject_type, lifecycle_stage)
  WHERE unsubscribed_at IS NULL;
