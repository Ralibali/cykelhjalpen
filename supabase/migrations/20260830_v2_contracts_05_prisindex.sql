-- V2 CONTRACTS 05 — Cykelprisindex engine: stats table + sample-gated public RPC (S5).
-- Contract: docs/v2/CONTRACTS.md §2.5. ADDITIVE ONLY.
--
-- PUBLIC DISPLAY IS SAMPLE-GATED IN SQL: the RPC returns real stats only when
-- the global flag v2.prisindex.public_display is on, the city has
-- price_index_public = true, and the row clears the confidence threshold
-- (n >= 3). Otherwise it falls back to v2_guide_prices labelled 'riktpris'.
--
-- Rollback: drop function public.v2_get_price_index(text, text);
--   drop table public.v2_price_index_stats; drop type public.v2_price_confidence.

CREATE TYPE public.v2_price_confidence AS ENUM (
  'insufficient',
  'low',
  'medium',
  'high'
);

CREATE TABLE public.v2_price_index_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  repair_category text NOT NULL,
  window_start date NOT NULL,
  window_end date NOT NULL,
  sample_count integer NOT NULL DEFAULT 0,
  median_sek integer NULL,
  p25_sek integer NULL,
  p75_sek integer NULL,
  min_sek integer NULL,
  max_sek integer NULL,
  outliers_removed integer NOT NULL DEFAULT 0,
  confidence public.v2_price_confidence NOT NULL DEFAULT 'insufficient',
  source text NOT NULL DEFAULT 'quotes',
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_slug, repair_category, window_start, window_end, source),
  CHECK (source IN ('quotes','outcomes','mixed'))
);

CREATE INDEX v2_price_index_latest
  ON public.v2_price_index_stats (city_slug, repair_category, window_end DESC);

ALTER TABLE public.v2_price_index_stats ENABLE ROW LEVEL SECURITY;

-- Direct table read: admin/service only. Public reads go through the RPC.
CREATE POLICY "V2 admin manages price index stats"
ON public.v2_price_index_stats FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Sample-gated public read. Returns JSONB:
-- { "rows": [...], "sample_gated": boolean }
-- rows[].kind = 'stats' (real data) | 'riktpris' (guide-price fallback).
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
      ORDER BY s.repair_category, s.window_end DESC
    ) t;

    IF v_rows IS NOT NULL AND jsonb_array_length(v_rows) > 0 THEN
      RETURN jsonb_build_object('rows', v_rows, 'sample_gated', false);
    END IF;
  END IF;

  -- Fallback: guide prices, always labelled riktpris.
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
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
    ORDER BY g.repair_category, g.city_slug NULLS LAST
  ) t;

  RETURN jsonb_build_object('rows', COALESCE(v_rows, '[]'::jsonb), 'sample_gated', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_get_price_index(text, text) TO anon, authenticated;
