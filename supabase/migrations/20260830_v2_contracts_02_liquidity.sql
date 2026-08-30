-- V2 CONTRACTS 02 — marketplace liquidity: areas/cluster matching columns,
-- onboarding lifecycle, nudge log, zero-quote rescue, ghosted-lead claims,
-- supply health snapshots.
-- Contract: docs/v2/CONTRACTS.md §2.2. ADDITIVE ONLY (new columns are all
-- nullable or defaulted; no existing column touched, no data rewritten).
--
-- Rollback: drop table public.v2_supply_snapshots, public.v2_ghosted_lead_claims,
--   public.v2_rescue_actions, public.v2_nudge_log, public.v2_workshop_onboarding;
--   alter table public.workshops drop column service_area_mode, drop column
--   cluster_opt_in, drop column public_profile_opt_in, drop column bio_short,
--   drop column onboarding_state; alter table public.workshop_responses drop
--   column winner_reminded_at, drop column stalled_at, drop column
--   ghosted_claim_status; alter table public.bike_repair_requests drop column
--   reselection_count.

-- ============================================
-- 1. Additive columns on existing V1 tables
-- ============================================

-- workshops: matching mode + directory consent (S1/S4)
ALTER TABLE public.workshops
  ADD COLUMN service_area_mode text NOT NULL DEFAULT 'city',
  ADD COLUMN cluster_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN public_profile_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN bio_short text NULL,
  ADD COLUMN onboarding_state text NOT NULL DEFAULT 'registered';

COMMENT ON COLUMN public.workshops.service_area_mode IS
  'V2: city (exakt match, dagens beteende) | areas (areas_served[]) | cluster (kluster via v2_city_configs).';
COMMENT ON COLUMN public.workshops.public_profile_opt_in IS
  'V2: uttryckligt samtycke till publicering i v2_public_workshop_directory.';

-- workshop_responses: winner-reminder / stalled / ghosted tracking (S2/S4)
ALTER TABLE public.workshop_responses
  ADD COLUMN winner_reminded_at timestamptz NULL,
  ADD COLUMN stalled_at timestamptz NULL,
  ADD COLUMN ghosted_claim_status text NULL;

-- bike_repair_requests: re-selection after stalled winner (S2)
ALTER TABLE public.bike_repair_requests
  ADD COLUMN reselection_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bike_repair_requests.reselection_count IS
  'V2: antal gånger kunden valt ny vinnare. Statusvärdet awaiting_reselection är tillåtet (text-kolumn).';

-- ============================================
-- 2. Workshop onboarding lifecycle (S2)
-- ============================================
CREATE TABLE public.v2_workshop_onboarding (
  workshop_id uuid PRIMARY KEY REFERENCES public.workshops(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'registered',
  state_changed_at timestamptz NOT NULL DEFAULT now(),
  last_nudge_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (state IN ('registered','approved','first_quote_sent','first_win','activated','dormant','churned'))
);

ALTER TABLE public.v2_workshop_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 workshop reads own onboarding"
ON public.v2_workshop_onboarding FOR SELECT
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "V2 admin manages onboarding"
ON public.v2_workshop_onboarding FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 3. Nudge log — idempotent automated nudges (S2)
-- ============================================
CREATE TABLE public.v2_nudge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  kind text NOT NULL,
  request_id uuid NULL REFERENCES public.bike_repair_requests(id) ON DELETE CASCADE,
  workshop_id uuid NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  response_id uuid NULL REFERENCES public.workshop_responses(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email',
  sent_count integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind IN ('zero_quote','few_quotes','winner_payment','onboarding','dormant_workshop','closing_soon')),
  CHECK (channel IN ('email','sms','in_app'))
);

CREATE INDEX v2_nudge_log_request ON public.v2_nudge_log (request_id, created_at DESC);
CREATE INDEX v2_nudge_log_workshop ON public.v2_nudge_log (workshop_id, created_at DESC);

ALTER TABLE public.v2_nudge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 workshop reads own nudges"
ON public.v2_nudge_log FOR SELECT
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "V2 admin manages nudge log"
ON public.v2_nudge_log FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 4. Zero-quote rescue actions (S2)
-- ============================================
CREATE TABLE public.v2_rescue_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.bike_repair_requests(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  reason text NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (action_type IN ('auto_nudge','extend_window','founder_backstop','repost_invite','cross_cluster_broadcast')),
  CHECK (status IN ('planned','executed','skipped','failed'))
);

CREATE INDEX v2_rescue_actions_request ON public.v2_rescue_actions (request_id, created_at DESC);

ALTER TABLE public.v2_rescue_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages rescue actions"
ON public.v2_rescue_actions FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 5. Ghosted-lead claims (S4)
-- ============================================
CREATE TABLE public.v2_ghosted_lead_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL UNIQUE REFERENCES public.workshop_responses(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  customer_unreachable_since date NULL,
  evidence_note text NULL,
  admin_note text NULL,
  resolved_by uuid NULL REFERENCES auth.users(id),
  resolved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pending','approved','rejected','credited'))
);

ALTER TABLE public.v2_ghosted_lead_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 workshop reads own ghosted claims"
ON public.v2_ghosted_lead_claims FOR SELECT
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "V2 admin manages ghosted claims"
ON public.v2_ghosted_lead_claims FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 6. Supply health snapshots (S10)
-- ============================================
CREATE TABLE public.v2_supply_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_on date NOT NULL,
  city_slug text NOT NULL,
  approved_workshops integer NOT NULL DEFAULT 0,
  active_workshops integer NOT NULL DEFAULT 0,
  requests_30d integer NOT NULL DEFAULT 0,
  quotes_30d integer NOT NULL DEFAULT 0,
  fill_rate numeric(5,4) NULL,
  median_hours_to_first_quote numeric(8,2) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_slug, captured_on)
);

ALTER TABLE public.v2_supply_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages supply snapshots"
ON public.v2_supply_snapshots FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
