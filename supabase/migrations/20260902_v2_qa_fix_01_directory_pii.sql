-- V2 QA FIX 01 — close the anon PII exposure on public.workshops (adversarial
-- QA BLOCKER, item 4) and make the directory data layer respect the feature
-- flag (QA MEDIUM, item 6). One policy intentionally DROPPED; view and two
-- RPCs replaced with same signatures (CREATE OR REPLACE).
--
-- Background: policy "V2 public reads opted-in approved workshops"
-- (20260830_v2_contracts_06_public_surface.sql:17-20) granted anon +
-- authenticated full-column SELECT on every approved AND public_profile_opt_in
-- workshop row. RLS gates rows, not columns — so email, phone,
-- stripe_customer_id, free_leads_remaining and user_id leaked via PostgREST
-- select=. The whitelisted view was security_invoker and therefore relied on
-- that very table policy; it never protected direct table access.
--
-- After this migration the ONLY public read paths are the scoped surfaces:
--   1. VIEW public.v2_public_workshop_directory — recreated as a
--      security-definer view (Postgres default; the security_invoker option
--      is explicitly removed). The view owner (postgres, table owner) is not
--      subject to RLS on workshops, so anon/authenticated can read the view
--      with NO table-level policy while only ever seeing whitelisted columns.
--   2. RPC public.v2_get_public_directory — SECURITY DEFINER, same whitelist,
--      now gated on flag v2.directory.public_profiles (flag OFF → empty set).
-- Direct table reads by anon/authenticated are gone. Verified before writing
-- this file: the only remaining SELECT policies on public.workshops are the
-- V1 owner/admin policy "Workshop owner reads own" (20260513…:246-249); the
-- V1 "Public reads approved workshops" was dropped 20260610 and no other
-- anon SELECT policy on workshops exists in any migration.
--
-- Rollback:
--   create policy "V2 public reads opted-in approved workshops"
--     on public.workshops for select to anon, authenticated
--     using (approved = true and public_profile_opt_in = true);
--   create or replace view public.v2_public_workshop_directory
--     with (security_invoker = true) as
--     <original query in 20260830_v2_contracts_06_public_surface.sql §2>;
--   create or replace function public.v2_set_public_profile(text, boolean)
--     as defined in 20260901_v2_s4_directory_profiles.sql §2b (no flag check);
--   create or replace function public.v2_get_public_directory(text, text, text)
--     as defined in 20260901_v2_s4_directory_profiles.sql §3 (no flag check);

-- ============================================
-- 1. Drop the table-level public policy (the PII hole)
-- ============================================
DROP POLICY IF EXISTS "V2 public reads opted-in approved workshops" ON public.workshops;

-- ============================================
-- 2. Scoped public directory view — SAME column whitelist, but as a
--    security-definer view so it keeps working for anon without any
--    table-level SELECT policy. Columns must stay in this exact order
--    (CREATE OR REPLACE VIEW cannot rename/reorder existing columns).
-- ============================================
CREATE OR REPLACE VIEW public.v2_public_workshop_directory AS
SELECT
  w.id AS workshop_id,
  w.slug,
  w.company_name,
  w.city,
  c.city_slug,
  c.cluster_slug,
  w.services,
  w.areas_served,
  w.logo_url,
  w.website,
  w.bio_short,
  extract(year from w.created_at)::integer AS created_year,
  COALESCE(s.published_count, 0) AS published_review_count,
  s.avg_rating,
  s.last_published_at AS last_review_at
FROM public.workshops w
LEFT JOIN public.v2_city_configs c ON c.city_name = w.city
LEFT JOIN public.v2_workshop_review_stats s ON s.workshop_id = w.id
WHERE w.approved = true
  AND w.public_profile_opt_in = true;

-- CREATE OR REPLACE does not reset reloptions: explicitly turn OFF the
-- security_invoker flag set by 20260830_v2_contracts_06_public_surface.sql so
-- the view runs with the owner's (RLS-exempt) privileges.
ALTER VIEW public.v2_public_workshop_directory SET (security_invoker = false);

GRANT SELECT ON public.v2_public_workshop_directory TO anon, authenticated;

-- ============================================
-- 3. Workshop consent/visibility RPC — flag-gated opt-in.
--    Identical to 20260901_v2_s4_directory_profiles.sql §2b except: enabling
--    the public profile (p_opt_in = true) requires flag
--    v2.directory.public_profiles to be ON. Opting OUT stays possible with
--    the flag off so a workshop can always retract its profile.
-- ============================================
CREATE OR REPLACE FUNCTION public.v2_set_public_profile(
  p_bio_short text DEFAULT NULL,
  p_opt_in boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workshop_id uuid := public.get_workshop_id(auth.uid());
  v_bio text;
  v_slug text;
  v_flag_on boolean;
BEGIN
  IF v_workshop_id IS NULL OR NOT public.is_approved_workshop(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Endast godkända verkstäder kan publicera en profil.', 'code', 'not_approved');
  END IF;

  -- QA fix: the public directory surface is flag-gated (contract §5). Opt-in
  -- cannot be enabled while v2.directory.public_profiles is OFF.
  IF p_opt_in = true THEN
    SELECT COALESCE((
      SELECT f.enabled FROM public.v2_feature_flags f
      WHERE f.key = 'v2.directory.public_profiles'
    ), false) INTO v_flag_on;
    IF NOT v_flag_on THEN
      RETURN jsonb_build_object('error', 'Den publika verkstadskatalogen är inte aktiverad ännu.', 'code', 'feature_disabled');
    END IF;
  END IF;

  -- Plain text only, max 280 chars (§2.4).
  v_bio := NULLIF(btrim(regexp_replace(coalesce(p_bio_short, ''), '<[^>]*>', '', 'g')), '');
  IF v_bio IS NOT NULL AND char_length(v_bio) > 280 THEN
    RETURN jsonb_build_object('error', 'Kort beskrivning får vara max 280 tecken.', 'code', 'bio_too_long');
  END IF;

  UPDATE public.workshops w
  SET
    bio_short = v_bio,
    public_profile_opt_in = p_opt_in,
    updated_at = now()
  WHERE w.id = v_workshop_id
  RETURNING w.slug INTO v_slug;

  RETURN jsonb_build_object(
    'workshop_id', v_workshop_id,
    'slug', v_slug,
    'bio_short', v_bio,
    'public_profile_opt_in', p_opt_in
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_set_public_profile(text, boolean) TO authenticated;

-- ============================================
-- 4. Scoped public directory RPC — flag-gated reads (QA MEDIUM #6).
--    Identical to 20260901_v2_s4_directory_profiles.sql §3 except: when flag
--    v2.directory.public_profiles is OFF the RPC returns an EMPTY SET
--    (rows=[], total=0, indexable=false) instead of data. Deliberate choice
--    over raising feature_disabled: the frontend's empty state already
--    renders this shape, so a dormant surface fails soft and no client
--    error-handling changes are needed.
-- ============================================
CREATE OR REPLACE FUNCTION public.v2_get_public_directory(
  p_city_slug text DEFAULT NULL,
  p_service text DEFAULT NULL,
  p_area text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min constant integer := 3; -- gate G-D1: minst 3 opt-in verkstäder i staden
  v_rows jsonb;
  v_total integer;
  v_city_count integer;
  v_indexable boolean := false;
  v_flag_on boolean;
BEGIN
  -- QA fix: data layer honors the directory flag (contract §5).
  SELECT COALESCE((
    SELECT f.enabled FROM public.v2_feature_flags f
    WHERE f.key = 'v2.directory.public_profiles'
  ), false) INTO v_flag_on;

  IF NOT v_flag_on THEN
    RETURN jsonb_build_object(
      'rows', '[]'::jsonb,
      'total', 0,
      'indexable', false,
      'min_workshops', v_min,
      'city_slug', p_city_slug
    );
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb), count(*)
  INTO v_rows, v_total
  FROM (
    SELECT
      v.workshop_id, v.slug, v.company_name, v.city, v.city_slug, v.cluster_slug,
      v.services, v.areas_served, v.logo_url, v.website, v.bio_short,
      v.created_year, v.published_review_count, v.avg_rating, v.last_review_at
    FROM public.v2_public_workshop_directory v
    WHERE (p_city_slug IS NULL OR v.city_slug = p_city_slug)
      AND (p_service IS NULL OR EXISTS (
        SELECT 1 FROM unnest(coalesce(v.services, '{}')) s
        WHERE lower(s) = lower(p_service)
      ))
      AND (p_area IS NULL OR EXISTS (
        SELECT 1 FROM unnest(coalesce(v.areas_served, '{}')) a
        WHERE lower(a) = lower(p_area)
      ))
    ORDER BY v.published_review_count DESC, v.avg_rating DESC NULLS LAST, v.company_name ASC
    LIMIT 100
  ) d;

  -- G-D1: staden är ACTIVE eller LIMITED, admin har satt directory_indexable
  -- och minst v_min opt-in-verkstäder finns i staden. Utan city_slug gäller
  -- regeln om minst en stad passerar.
  IF p_city_slug IS NOT NULL THEN
    SELECT count(*) INTO v_city_count
    FROM public.v2_public_workshop_directory v
    WHERE v.city_slug = p_city_slug;

    SELECT (c.state IN ('ACTIVE', 'LIMITED'))
        AND c.directory_indexable = true
        AND v_city_count >= v_min
    INTO v_indexable
    FROM public.v2_city_configs c
    WHERE c.city_slug = p_city_slug;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.v2_city_configs c
      WHERE c.state IN ('ACTIVE', 'LIMITED')
        AND c.directory_indexable = true
        AND (SELECT count(*) FROM public.v2_public_workshop_directory v
             WHERE v.city_slug = c.city_slug) >= v_min
    ) INTO v_indexable;
  END IF;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total', v_total,
    'indexable', coalesce(v_indexable, false),
    'min_workshops', v_min,
    'city_slug', p_city_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_get_public_directory(text, text, text) TO anon, authenticated;
