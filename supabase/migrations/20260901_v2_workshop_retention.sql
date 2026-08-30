-- V2 WORKSHOP RETENTION (S8) — dormant-reaktivering, veckodigest, säsong,
-- månadssammanfattning, profilknuffar och review/outcome-notiser till verkstäder.
-- Contract: docs/v2/CONTRACTS.md §2.7, §3.7, §5, §6. ADDITIVE ONLY:
--   * kind-CHECK på v2_lifecycle_messages BREDDAS (befintliga värden orörda,
--     ingen data skrivs om) med nya värden för verkstadssidans cadences.
--   * Ny tabell v2_workshop_notification_prefs (S8-ägd).
--   * Nya underflaggor seedade OFF (huvudflagga v2.retention.lifecycle krävs ändå).
--
-- Rollback:
--   DELETE FROM public.v2_feature_flags WHERE key IN
--     ('v2.retention.dormant_reactivation','v2.retention.weekly_digest',
--      'v2.retention.seasonal_reactivation','v2.retention.performance_summary',
--      'v2.retention.profile_nudge','v2.retention.workshop_notifications');
--   DROP TABLE public.v2_workshop_notification_prefs;
--   DROP INDEX IF EXISTS public.v2_retention_contacts_stage;
--   ALTER TABLE public.v2_lifecycle_messages DROP CONSTRAINT IF EXISTS v2_lifecycle_messages_kind_check;
--   ALTER TABLE public.v2_lifecycle_messages ADD CONSTRAINT v2_lifecycle_messages_kind_check
--     CHECK (kind IN ('seasonal_reminder','reactivation','review_request','win_back','onboarding_nudge'));
--   (observera: rollback av CHECK kräver att inga rader med nya kind-värden finns)

-- ============================================
-- 1. Bredda kind-CHECK (nya cadence-typer, S8-ägd tabell)
-- ============================================
ALTER TABLE public.v2_lifecycle_messages
  DROP CONSTRAINT IF EXISTS v2_lifecycle_messages_kind_check;

ALTER TABLE public.v2_lifecycle_messages
  ADD CONSTRAINT v2_lifecycle_messages_kind_check
  CHECK (kind IN (
    'seasonal_reminder',
    'reactivation',
    'review_request',
    'win_back',
    'onboarding_nudge',
    'opportunity_digest',
    'performance_summary',
    'profile_nudge',
    'workshop_notification'
  ));

-- ============================================
-- 2. Notiseringspreferenser per verkstad (S8).
--    workshops-tabellen ägs av S1/S4 → preferenser bor här istället.
-- ============================================
CREATE TABLE public.v2_workshop_notification_prefs (
  workshop_id uuid PRIMARY KEY REFERENCES public.workshops(id) ON DELETE CASCADE,
  digest_enabled boolean NOT NULL DEFAULT true,
  seasonal_enabled boolean NOT NULL DEFAULT true,
  performance_enabled boolean NOT NULL DEFAULT true,
  profile_nudge_enabled boolean NOT NULL DEFAULT true,
  review_notifications_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.v2_workshop_notification_prefs IS
  'V2 (S8): verkstadens opt-out per retention-cadence. Unsubscribe-token i v2_retention_contacts vinner alltid.';

ALTER TABLE public.v2_workshop_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 workshop reads own notification prefs"
ON public.v2_workshop_notification_prefs FOR SELECT
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "V2 workshop upserts own notification prefs"
ON public.v2_workshop_notification_prefs FOR INSERT
TO authenticated
WITH CHECK (workshop_id = get_workshop_id(auth.uid()));

CREATE POLICY "V2 workshop updates own notification prefs"
ON public.v2_workshop_notification_prefs FOR UPDATE
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()))
WITH CHECK (workshop_id = get_workshop_id(auth.uid()));

CREATE POLICY "V2 admin manages notification prefs"
ON public.v2_workshop_notification_prefs FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 3. Underflaggor (alla OFF; kräver dessutom v2.retention.lifecycle)
-- ============================================
INSERT INTO public.v2_feature_flags (key, enabled, rollout, description) VALUES
  ('v2.retention.dormant_reactivation', false, '{}', 'S8: dormant-detektering + 3-stegs återaktiveringssekvens (gate G-T1)'),
  ('v2.retention.weekly_digest', false, '{}', 'S8: veckodigest "nya ärenden i ditt område" (skip-empty, gate G-T1)'),
  ('v2.retention.seasonal_reactivation', false, '{}', 'S8: vår-reaktivering feb–mars mot förra säsongens verkstäder (gate G-T1)'),
  ('v2.retention.performance_summary', false, '{}', 'S8: månatlig statistikmejl till verkstäder (gate G-T1)'),
  ('v2.retention.profile_nudge', false, '{}', 'S8: profilkompletthets-knuff kopplad till publik profil (gate G-T1)'),
  ('v2.retention.workshop_notifications', false, '{}', 'S8: notiser till verkstad vid publicerad recension / bekräftat utfall (gate G-T1)')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 4. Index för livscykel-frågor
-- ============================================
CREATE INDEX v2_retention_contacts_stage
  ON public.v2_retention_contacts (subject_type, lifecycle_stage);

-- ============================================
-- 5. Cron-register (registry R4 / invariant I7)
-- ============================================
-- Alla S8-cadences körs inne i den befintliga planerade jobbraden:
--   v2-retention-cron-daily  '50 7 * * *'  flag v2.retention.lifecycle
-- Dagliga loopen avgör själv vilka cadences som är aktuella (veckodag för
-- digest, månadsdag för sammanfattning, säsongsfönster feb–mars). S13
-- schemalägger och verifierar jobbet vid deploy — ingen auto-scheduling här.
