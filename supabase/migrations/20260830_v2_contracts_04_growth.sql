-- V2 CONTRACTS 04 — growth & monetization capability: content engine surface,
-- retention lifecycle, subscription/tier capability (OFF by default),
-- entitlement overrides, pricing experiments.
-- Contract: docs/v2/CONTRACTS.md §2.6–2.8. ADDITIVE ONLY.
--
-- Rollback: drop table public.v2_pricing_experiments,
--   public.v2_entitlement_overrides, public.v2_workshop_subscriptions,
--   public.v2_plans, public.v2_lifecycle_messages, public.v2_retention_contacts,
--   public.v2_content_pages.

-- ============================================
-- 1. Content engine surface (S7) — NO mass generation.
--    published requires reviewer_name + reviewed_at (enforced in function).
-- ============================================
CREATE TABLE public.v2_content_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host text NOT NULL DEFAULT 'cykelhjalpen',
  path text NOT NULL,
  page_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  indexability text NOT NULL DEFAULT 'noindex',
  title text NOT NULL,
  description text NULL,
  body_markdown text NULL,
  data_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  author_name text NULL,
  reviewer_name text NULL,
  reviewed_at timestamptz NULL,
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (host, path),
  CHECK (page_type IN ('guide','report','city_hub_extra','tool')),
  CHECK (status IN ('draft','in_review','published','archived')),
  CHECK (indexability IN ('index','noindex','auto'))
);

ALTER TABLE public.v2_content_pages ENABLE ROW LEVEL SECURITY;

-- Public reads published pages only (routing surface; body is public content).
CREATE POLICY "V2 public reads published content pages"
ON public.v2_content_pages FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY "V2 admin manages content pages"
ON public.v2_content_pages FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 2. Retention lifecycle (S8) — consent-aware
-- ============================================
CREATE TABLE public.v2_retention_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_key text NOT NULL,
  workshop_id uuid NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  consent_basis text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz NULL,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  lifecycle_stage text NOT NULL DEFAULT 'new',
  last_contacted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_key),
  CHECK (subject_type IN ('customer','workshop')),
  CHECK (consent_basis IN ('transactional','legitimate_interest','marketing_consent')),
  CHECK (lifecycle_stage IN ('new','active','lapsing','dormant','win_back'))
);

COMMENT ON COLUMN public.v2_retention_contacts.subject_key IS
  'customer: sha256(lower(email)); workshop: workshops.id::text. Aldrig rå e-post.';

ALTER TABLE public.v2_retention_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 workshop reads own retention contact"
ON public.v2_retention_contacts FOR SELECT
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "V2 admin manages retention contacts"
ON public.v2_retention_contacts FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.v2_lifecycle_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.v2_retention_contacts(id) ON DELETE CASCADE,
  kind text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz NULL,
  dedupe_key text NOT NULL UNIQUE,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind IN ('seasonal_reminder','reactivation','review_request','win_back','onboarding_nudge')),
  CHECK (channel IN ('email','sms')),
  CHECK (status IN ('scheduled','sent','skipped','failed','suppressed'))
);

CREATE INDEX v2_lifecycle_messages_due
  ON public.v2_lifecycle_messages (scheduled_for)
  WHERE status = 'scheduled';

ALTER TABLE public.v2_lifecycle_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages lifecycle messages"
ON public.v2_lifecycle_messages FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 3. Subscription / tier capability (S9) — OFF by default.
--    plans.active = false until HQ activates (gate G-S1).
-- ============================================
CREATE TABLE public.v2_plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  price_ore_monthly integer NOT NULL DEFAULT 0 CHECK (price_ore_monthly >= 0),
  currency text NOT NULL DEFAULT 'SEK',
  stripe_price_id text NULL,
  trial_days integer NOT NULL DEFAULT 0,
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 public reads active plans"
ON public.v2_plans FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "V2 admin manages plans"
ON public.v2_plans FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Capability rows; active=false → nothing sellable. pay_per_win = today's model.
INSERT INTO public.v2_plans (code, name, price_ore_monthly, trial_days, entitlements, active) VALUES
  ('pay_per_win', 'Betala vid vinst', 0, 0, '{}'::jsonb, true),
  ('pro', 'Verkstad Pro', 29900, 30,
   '{"directory_featured": true, "profile_rich_modules": true, "price_index_early_access": true}'::jsonb, false),
  ('pro_plus', 'Verkstad Pro Plus', 49900, 30,
   '{"directory_featured": true, "profile_rich_modules": true, "price_index_early_access": true, "priority_slots": true, "free_wins_per_month": 1}'::jsonb, false);

CREATE TABLE public.v2_workshop_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.v2_plans(code),
  status text NOT NULL DEFAULT 'trialing',
  stripe_subscription_id text NULL,
  stripe_customer_id text NULL,
  trial_ends_at timestamptz NULL,
  current_period_end timestamptz NULL,
  cancelled_at timestamptz NULL,
  granted_by_admin boolean NOT NULL DEFAULT false,
  override_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('trialing','active','past_due','cancelled','expired'))
);

-- One live subscription per workshop.
CREATE UNIQUE INDEX v2_workshop_subscriptions_one_live
  ON public.v2_workshop_subscriptions (workshop_id)
  WHERE status IN ('trialing','active','past_due');

ALTER TABLE public.v2_workshop_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 workshop reads own subscription"
ON public.v2_workshop_subscriptions FOR SELECT
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "V2 admin manages subscriptions"
ON public.v2_workshop_subscriptions FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.v2_entitlement_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL,
  value jsonb NOT NULL DEFAULT 'true'::jsonb,
  expires_at timestamptz NULL,
  granted_by uuid NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id, entitlement_key)
);

ALTER TABLE public.v2_entitlement_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 workshop reads own entitlement overrides"
ON public.v2_entitlement_overrides FOR SELECT
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "V2 admin manages entitlement overrides"
ON public.v2_entitlement_overrides FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 4. Pricing experiments (S9) — inert until flagged; commission stays 0.
-- ============================================
CREATE TABLE public.v2_pricing_experiments (
  key text PRIMARY KEY,
  variants jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_pricing_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages pricing experiments"
ON public.v2_pricing_experiments FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "V2 public reads active pricing experiments"
ON public.v2_pricing_experiments FOR SELECT
TO anon, authenticated
USING (active = true);
