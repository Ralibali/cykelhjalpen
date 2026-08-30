-- V2 CONTRACTS 01 — foundation: feature flags, city activation config, clusters,
-- canonical pricing config, guide prices, data-moat event log.
-- Contract: docs/v2/CONTRACTS.md §2.1. ADDITIVE ONLY.
--
-- Rollback: drop table public.v2_events, public.v2_guide_prices,
--   public.v2_pricing_config, public.v2_feature_flags, public.v2_city_configs,
--   public.v2_city_clusters; drop type public.v2_city_state.
--   (All objects are new; dropping them touches no V1 data.)

-- ============================================
-- City activation states (RESEARCH/SUPPLY_BUILDING/LIMITED/ACTIVE/PAUSED)
-- ============================================
CREATE TYPE public.v2_city_state AS ENUM (
  'RESEARCH',
  'SUPPLY_BUILDING',
  'LIMITED',
  'ACTIVE',
  'PAUSED'
);

-- ============================================
-- City clusters (e.g. Östergötland = Linköping + Norrköping)
-- ============================================
CREATE TABLE public.v2_city_clusters (
  cluster_slug text PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_city_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages city clusters"
ON public.v2_city_clusters FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- City configs are read by every edge function; anon/authenticated read is safe
-- (no private data: state + display config only).
CREATE POLICY "V2 public reads city clusters"
ON public.v2_city_clusters FOR SELECT
TO anon, authenticated
USING (active = true);

-- ============================================
-- Per-city activation config
-- ============================================
CREATE TABLE public.v2_city_configs (
  city_slug text PRIMARY KEY,
  city_name text NOT NULL,
  state public.v2_city_state NOT NULL DEFAULT 'RESEARCH',
  cluster_slug text NULL REFERENCES public.v2_city_clusters(cluster_slug),
  demand_open boolean NOT NULL DEFAULT false,
  auto_approve_requests boolean NOT NULL DEFAULT false,
  directory_indexable boolean NOT NULL DEFAULT false,
  price_index_public boolean NOT NULL DEFAULT false,
  target_active_workshops integer NOT NULL DEFAULT 5,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_city_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages city configs"
ON public.v2_city_configs FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "V2 public reads city configs"
ON public.v2_city_configs FOR SELECT
TO anon, authenticated
USING (true);

-- Seed: city #5 is deliberately NOT present. HQ seed states 2026-08-30.
INSERT INTO public.v2_city_clusters (cluster_slug, name) VALUES
  ('ostergotland', 'Östergötland');

INSERT INTO public.v2_city_configs
  (city_slug, city_name, state, cluster_slug, demand_open, auto_approve_requests, notes)
VALUES
  ('linkoping', 'Linköping', 'ACTIVE', 'ostergotland', true, true,
   'Fokusstad. Befintlig auto-approve-gate (aktiv verkstad 30d) gäller tills G-L1.'),
  ('norrkoping', 'Norrköping', 'SUPPLY_BUILDING', 'ostergotland', true, false,
   'Supply-sprint pågår; ärenden fortsatt manuellt godkända tills supply finns.'),
  ('uppsala', 'Uppsala', 'LIMITED', NULL, true, true,
   'Begränsad öppning; auto-approve på trots tunt supply (cold-start-inversion).'),
  ('lund', 'Lund', 'LIMITED', NULL, true, true,
   'Begränsad öppning; auto-approve på trots tunt supply (cold-start-inversion).');

-- ============================================
-- Feature flags (registry: docs/v2/CONTRACTS.md §5). All OFF.
-- ============================================
CREATE TABLE public.v2_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  rollout jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text NOT NULL DEFAULT '',
  updated_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages feature flags"
ON public.v2_feature_flags FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "V2 public reads feature flags"
ON public.v2_feature_flags FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.v2_feature_flags (key, enabled, description) VALUES
  ('v2.liquidity.areas_served_matching', false, 'areas_served/kluster-matchning i board + notiser (gate G-L1)'),
  ('v2.liquidity.zero_quote_rescue', false, 'automatisk räddning av ärenden utan offerter (gate G-L2)'),
  ('v2.liquidity.winner_reminders', false, 'påminnelser om vinstavgift + stalled-recovery (gate G-L2)'),
  ('v2.liquidity.reselection', false, 'kund kan välja ny vinnare efter stalled winner (gate G-L3)'),
  ('v2.reviews.outcome_lifecycle', false, 'utfallslivscykel efter vinst (gate G-R1)'),
  ('v2.reviews.verified_reviews', false, 'verifierade recensioner: submit/moderering/visning (gate G-R2)'),
  ('v2.directory.public_profiles', false, 'publika verkstadsprofiler + katalog (gate G-D1)'),
  ('v2.prisindex.engine', false, 'beräkning av Cykelprisindex-statistik (gate G-P1)'),
  ('v2.prisindex.public_display', false, 'publik visning av prisstatistik, sample-gated i SQL (gate G-P2)'),
  ('v2.datamoat.event_collection', false, 'server-side domänhändelser till v2_events (gate G-M1)'),
  ('v2.seo.content_surface', false, 'v2_content_pages routing/publicering (gate G-C1)'),
  ('v2.retention.lifecycle', false, 'retentions-crons: säsongspåminnelser m.m. (gate G-T1)'),
  ('v2.subscriptions.enabled', false, 'abonnemang/tiers via Stripe (gate G-S1, kräver D1-D4)'),
  ('v2.pricing.config_reader', false, 'läs priser från v2_pricing_config i stället för konstanter (gate G-X1)');

-- ============================================
-- Canonical pricing config. Seed = exakt dagens live-regel.
-- 0% provision FÖR ALLTID uppframtvingas av CHECK (commission_bps = 0).
-- ============================================
CREATE TABLE public.v2_pricing_config (
  key text PRIMARY KEY,
  amount_ore integer NOT NULL,
  currency text NOT NULL DEFAULT 'SEK',
  vat_rate numeric(5,4) NOT NULL DEFAULT 0.25,
  commission_bps integer NOT NULL DEFAULT 0 CHECK (commission_bps = 0),
  credit_pack_min integer NOT NULL DEFAULT 1,
  credit_pack_max integer NOT NULL DEFAULT 100,
  credit_unit_ore integer NOT NULL DEFAULT 5000,
  free_wins_on_signup integer NOT NULL DEFAULT 2,
  effective_from timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Max one active row per key.
CREATE UNIQUE INDEX v2_pricing_config_one_active
  ON public.v2_pricing_config (key)
  WHERE active;

ALTER TABLE public.v2_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages pricing config"
ON public.v2_pricing_config FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Readable by all: the price is public information (står i villkoren).
CREATE POLICY "V2 public reads pricing config"
ON public.v2_pricing_config FOR SELECT
TO anon, authenticated
USING (active = true);

INSERT INTO public.v2_pricing_config
  (key, amount_ore, currency, vat_rate, commission_bps, credit_pack_min, credit_pack_max, credit_unit_ore, free_wins_on_signup, notes)
VALUES
  ('winner_fee', 5000, 'SEK', 0.25, 0, 1, 100, 5000, 2,
   'LIVE-regel 2026-08-30: 50 kr exkl. moms (62,50 kr inkl.) per vunnen lead. 0% provision för alltid.');

-- ============================================
-- Guide prices ("riktpriser") — prisindex fallback
-- ============================================
CREATE TABLE public.v2_guide_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_category text NOT NULL,
  bike_type text NULL,
  city_slug text NULL,
  price_min_sek integer NOT NULL,
  price_max_sek integer NOT NULL,
  typical_sek integer NULL,
  label text NOT NULL DEFAULT 'riktpris',
  source_note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX v2_guide_prices_unique_cell
  ON public.v2_guide_prices (repair_category, coalesce(bike_type, ''), coalesce(city_slug, ''));

ALTER TABLE public.v2_guide_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 admin manages guide prices"
ON public.v2_guide_prices FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "V2 public reads guide prices"
ON public.v2_guide_prices FOR SELECT
TO anon, authenticated
USING (true);

-- Seed: riktpriser from published Swedish price lists (research dim07 §5 / dim08 §3).
INSERT INTO public.v2_guide_prices (repair_category, bike_type, price_min_sek, price_max_sek, typical_sek, source_note) VALUES
  ('Punktering / däckbyte', NULL, 150, 400, 250, 'Publicerade prislistor 2026 (dim07/dim08)'),
  ('Punktering / däckbyte', 'Elcykel', 200, 550, 350, 'Elcykel +50-150 kr enligt prislistor'),
  ('Bromsar', NULL, 200, 600, 350, 'Bromsjustering/byte, prislistor 2026'),
  ('Växlar / kedja', NULL, 200, 700, 400, 'Växeljustering/kedjebyte, prislistor 2026'),
  ('Service / genomgång', NULL, 395, 1700, 800, 'Liten 395-800 / stor 799-1700 service'),
  ('Elcykel-problem', 'Elcykel', 795, 1800, 1000, 'Elcykelservice 795-1800 enligt prislistor'),
  ('Hjul / ekrar', NULL, 250, 900, 500, 'Hjulriktning/ekrar, prislistor 2026'),
  ('Lyse / elektronik', NULL, 150, 600, 300, 'Prislistor 2026'),
  ('Annat', NULL, 150, 1200, 500, 'Generellt spann, prislistor 2026');

-- ============================================
-- Data-moat event log
-- ============================================
CREATE TABLE public.v2_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_name text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL DEFAULT 'system',
  actor_id uuid NULL,
  city_slug text NULL,
  request_id uuid NULL,
  workshop_id uuid NULL,
  response_id uuid NULL,
  session_id text NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_scope text NOT NULL DEFAULT 'necessary',
  host text NOT NULL DEFAULT 'cykelhjalpen'
);

CREATE INDEX v2_events_name_time ON public.v2_events (event_name, occurred_at DESC);
CREATE INDEX v2_events_city_time ON public.v2_events (city_slug, occurred_at DESC);
CREATE INDEX v2_events_request ON public.v2_events (request_id);

ALTER TABLE public.v2_events ENABLE ROW LEVEL SECURITY;

-- Insert = service role only (edge functions). Select = admin. No update/delete.
CREATE POLICY "V2 admin reads events"
ON public.v2_events FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

COMMENT ON TABLE public.v2_events IS
  'Data-moat: domänhändelser enligt docs/v2/CONTRACTS.md §4. Ingen PII i payload.';
