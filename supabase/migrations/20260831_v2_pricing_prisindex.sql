-- V2 S5 — pricing adoption + prisindex: guide-price seeding from the researched
-- Swedish price dataset (research/cykelhjalpen_dim08.md §3, 20+ published
-- prislistor 2023–2026) + sample-gated RPC refinement. ADDITIVE ONLY.
--
-- What this migration does:
--   1. Upserts v2_guide_prices: national rows get source notes citing the
--      dim08 dataset; city-anchored riktpris rows are added for Linköping,
--      Norrköping, Uppsala, Lund from the local prislistor in dim08 §3.1.
--      Everything stays label='riktpris' — this is EXTERNAL guide data, never
--      Cykelhjälpen statistics.
--   2. CREATE OR REPLACE public.v2_get_price_index (same signature/return):
--      - stats rows: tiebreak equal window_end by larger sample_count (prefers
--        the richer source when both 'quotes' and 'outcomes' rows exist)
--      - riktpris fallback: one row per category, city-specific guide price
--        preferred over the national row when both exist.
--      The sample gate itself (flag + price_index_public + confidence >= 'low')
--      is unchanged — public display stays sample-gated IN SQL.
--
-- SCHEDULING NOTE (invariant I7): the rollup function v2-compute-price-index
-- is intended to run DAILY via pg_cron, e.g.
--   select cron.schedule(
--     'v2-compute-price-index-daily', '20 5 * * *',
--     $$ select net.http_post(
--          url := '<project>/functions/v1/v2-compute-price-index',
--          headers := jsonb_build_object('Authorization', 'Bearer <service_role_key>'),
--          body := '{}'::jsonb ) $$ );
-- It is deliberately NOT scheduled here: schedule only when flag
-- v2.prisindex.engine flips (gate G-P1) and the schedule has been verified in
-- prod (registry R4 lesson: bike-choice-reminders was possibly unscheduled).
--
-- Rollback:
--   delete from public.v2_guide_prices where source_note like '%dim08%';
--   delete from public.v2_pricing_experiments where key = 'winner_fee_control';
--   restore public.v2_get_price_index from 20260830_v2_contracts_05_prisindex.sql.

-- ============================================
-- 1. Guide prices ("riktpriser") — dim08 dataset
-- ============================================
-- National aggregated ranges (dim08 §3.3).
INSERT INTO public.v2_guide_prices
  (repair_category, bike_type, city_slug, price_min_sek, price_max_sek, typical_sek, source_note)
VALUES
  ('Punktering / däckbyte', NULL, NULL, 150, 400, 250,
   'Aggregerat spann ur 20+ publicerade svenska prislistor 2023–2026 (dim08 §3.3): punktering 150–400 kr, däckbyte 125–500 kr/hjul.'),
  ('Punktering / däckbyte', 'Elcykel', NULL, 200, 550, 350,
   'Elcykel +50–150 kr enligt prislistor (dim08 §3.3).'),
  ('Bromsar', NULL, NULL, 100, 600, 300,
   'Bromsjustering 100–400 kr/broms, beläggbyte ~150–300 kr (dim08 §3.1–3.3).'),
  ('Växlar / kedja', NULL, NULL, 150, 700, 350,
   'Växeljustering 150–400 kr, kedjebyte 150–450 kr exkl. del (dim08 §3.3).'),
  ('Service / genomgång', NULL, NULL, 395, 1700, 800,
   'Liten/grundservice 395–800 kr, stor/komplett service 799–1 700 kr (dim08 §3.3).'),
  ('Elcykel-problem', 'Elcykel', NULL, 795, 1800, 1000,
   'Elcykelservice 795–1 800 kr enligt prislistor (dim08 §3.3).'),
  ('Hjul / ekrar', NULL, NULL, 250, 900, 500,
   'Hjulriktning 300–600 kr, ekarbyte; prislistor 2023–2026 (dim08 §3.3).'),
  ('Lyse / elektronik', NULL, NULL, 150, 600, 300,
   'Publicerade prislistor 2023–2026 (dim08 §3).'),
  ('Annat', NULL, NULL, 150, 1200, 500,
   'Generellt spann, publicerade prislistor 2023–2026 (dim08 §3).'),
  -- City-anchored riktpriser from local prislistor (dim08 §3.1).
  ('Punktering / däckbyte', NULL, 'linkoping', 250, 450, 250,
   'Miljö Cykel, Linköping (miljocykel.se): punktering inkl slang 250 kr, däck+slang 450 kr/hjul (dim08 §3.1).'),
  ('Service / genomgång', NULL, 'linkoping', 399, 799, 599,
   'Gabriels Cykel, Linköping: grundservice 399 kr, aktiv service 799 kr (dim08 §3.1).'),
  ('Växlar / kedja', NULL, 'linkoping', 150, 300, 250,
   'Miljö Cykel, Linköping: växeljustering nav 150 / utanpåliggande 250, kedjebyte 300 kr (dim08 §3.1).'),
  ('Elcykel-problem', 'Elcykel', 'linkoping', 799, 999, 799,
   'Gabriels Cykel, Linköping: grund elcykelservice från 799 kr (dim08 §3.1).'),
  ('Service / genomgång', NULL, 'norrkoping', 399, 499, 449,
   'Skarphagens Cykel, Norrköping: standardservice 399 kr, MTB 18–27 växlar 499 kr (dim08 §3.1).'),
  ('Elcykel-problem', 'Elcykel', 'norrkoping', 795, 999, 895,
   'Skarphagens Cykel, Norrköping: elcykelservice 795 kr, stor elcykelservice 999 kr (dim08 §3.1).'),
  ('Service / genomgång', NULL, 'uppsala', 450, 799, 500,
   'Uppsala Returcyklar 450 kr; Team Sportia Uppsala standard 499 / stor 799 kr (dim08 §3.1).'),
  ('Bromsar', NULL, 'uppsala', 100, 150, 125,
   'Uppsala Returcyklar: bromsjustering 100 kr/broms, bromsbelägg 150 kr/broms (dim08 §3.1).'),
  ('Hjul / ekrar', NULL, 'uppsala', 300, 300, 300,
   'Uppsala Returcyklar: hjulriktning inkl 5 ekrar 300 kr (dim08 §3.1).'),
  ('Service / genomgång', NULL, 'lund', 249, 499, 449,
   'Cykelexperten Lund 249 kr; standardservice 499 kr (Sydsvenskan-guide); Bikefix Lund från 450 kr (dim08 §3.1).'),
  ('Punktering / däckbyte', NULL, 'lund', 189, 259, 225,
   'Cykelexperten Lund: slangbyte 189 kr, däckbyte 259 kr inkl montering (dim08 §3.1).')
ON CONFLICT (repair_category, coalesce(bike_type, ''), coalesce(city_slug, ''))
DO UPDATE SET
  price_min_sek = EXCLUDED.price_min_sek,
  price_max_sek = EXCLUDED.price_max_sek,
  typical_sek = EXCLUDED.typical_sek,
  label = 'riktpris',
  source_note = EXCLUDED.source_note,
  updated_at = now();

-- ============================================
-- 1b. Pricing experiment registry seed — INERT (contract §2.8)
-- ============================================
-- Control-only experiment, active=false. Documents the intended shape and
-- stays inert until HQ approves a pricing change (I2). Experiments can never
-- touch commission_bps (I1) — enforced in _shared/v2/pricing-config.ts.
INSERT INTO public.v2_pricing_experiments (key, variants, active)
VALUES
  ('winner_fee_control', '[{"name":"control","winner_fee_ore":5000,"weight":1}]'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 2. Sample-gated public RPC (refined; gate unchanged)
-- ============================================
CREATE OR REPLACE FUNCTION public.v2_get_price_index(
  p_city_slug text,
  p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_enabled boolean;
  v_city_public boolean;
  v_rows jsonb;
BEGIN
  SELECT COALESCE((
    SELECT f.enabled FROM public.v2_feature_flags f
    WHERE f.key = 'v2.prisindex.public_display'
  ), false) INTO v_display_enabled;

  SELECT COALESCE((
    SELECT c.price_index_public FROM public.v2_city_configs c
    WHERE c.city_slug = p_city_slug
  ), false) INTO v_city_public;

  IF v_display_enabled AND v_city_public THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT DISTINCT ON (s.repair_category)
        s.repair_category,
        s.sample_count,
        s.median_sek,
        s.p25_sek,
        s.p75_sek,
        s.confidence::text AS confidence,
        s.window_end,
        'stats'::text AS kind
      FROM public.v2_price_index_stats s
      WHERE s.city_slug = p_city_slug
        AND (p_category IS NULL OR s.repair_category = p_category)
        AND s.confidence IN ('low', 'medium', 'high') -- n >= 3, insufficient never shown
      ORDER BY s.repair_category, s.window_end DESC, s.sample_count DESC
    ) t;

    IF v_rows IS NOT NULL AND jsonb_array_length(v_rows) > 0 THEN
      RETURN jsonb_build_object('rows', v_rows, 'sample_gated', false);
    END IF;
  END IF;

  -- Fallback: guide prices, always labelled riktpris. One row per category;
  -- a city-anchored riktpris beats the national row when both exist.
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT DISTINCT ON (g.repair_category)
      g.repair_category,
      NULL::integer AS sample_count,
      g.typical_sek AS median_sek,
      g.price_min_sek AS p25_sek,
      g.price_max_sek AS p75_sek,
      'riktpris'::text AS confidence,
      NULL::date AS window_end,
      'riktpris'::text AS kind
    FROM public.v2_guide_prices g
    WHERE (p_category IS NULL OR g.repair_category = p_category)
      AND (g.city_slug IS NULL OR g.city_slug = p_city_slug)
    ORDER BY g.repair_category, (g.city_slug = p_city_slug) DESC, g.city_slug NULLS LAST
  ) t;

  RETURN jsonb_build_object('rows', COALESCE(v_rows, '[]'::jsonb), 'sample_gated', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_get_price_index(text, text) TO anon, authenticated;
