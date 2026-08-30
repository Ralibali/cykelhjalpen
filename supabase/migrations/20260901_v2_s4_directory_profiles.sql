-- V2 S4 — directory & profiles: slug assignment, workshop consent RPC and the
-- scoped public directory RPC. Contract: docs/v2/CONTRACTS.md §2.4, §3.4, §6,
-- §7 (gate G-D1). ADDITIVE ONLY.
--
-- The scoped view (v2_public_workshop_directory) and the narrow opt-in policy
-- were shipped in 20260830_v2_contracts_06_public_surface.sql. This migration
-- adds only FUNCTIONS + one TRIGGER — no new policies, no data rewrites, no
-- changes to existing columns. Slugs are assigned lazily (at opt-in) by the
-- v2_workshop_slug_on_opt_in trigger, never by rewriting existing rows.
--
-- Rollback:
--   drop trigger v2_workshop_slug_on_opt_in on public.workshops;
--   drop function public.v2_assign_public_slug();
--   drop function public.v2_get_public_directory(text, text, text);
--   drop function public.v2_set_public_profile(text, boolean);
--   drop function public.v2_generate_workshop_slug(uuid, text);
--   drop function public.v2_slugify(text);

-- ============================================
-- 1. Slug helpers (pure SQL mirror of workshopSlugify in src/lib/v2/directory.ts)
-- ============================================
CREATE OR REPLACE FUNCTION public.v2_slugify(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  -- lower() körs först, så bara gemener behöver översättas (från/till måste
  -- ha samma längd, annars kastar PostgreSQL bort överflödiga tecken).
  SELECT trim(both '-' from
    regexp_replace(
      translate(
        lower(coalesce(p_value, '')),
        'åäöéèêëü',
        'aaoeeeeu'
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

COMMENT ON FUNCTION public.v2_slugify(text) IS
  'V2: URL-säker slug (a-z0-9, bindestreck). Spegla workshopSlugify i src/lib/v2/directory.ts.';

-- Generates a unique slug for a workshop: company-name base, numeric suffix on
-- collision (-2, -3, …). Reads workshops.slug only; writes nothing.
CREATE OR REPLACE FUNCTION public.v2_generate_workshop_slug(p_workshop_id uuid, p_company_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_base text := public.v2_slugify(p_company_name);
  v_candidate text;
  v_suffix integer := 1;
BEGIN
  IF v_base = '' THEN
    v_base := 'verkstad';
  END IF;

  v_candidate := v_base;
  WHILE EXISTS (
    SELECT 1 FROM public.workshops
    WHERE slug = v_candidate AND id IS DISTINCT FROM p_workshop_id
  ) LOOP
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix;
    IF v_suffix > 100 THEN
      -- Defensive fallback: deterministic uuid fragment guarantees uniqueness.
      v_candidate := v_base || '-' || substr(replace(p_workshop_id::text, '-', ''), 1, 6);
      EXIT;
    END IF;
  END LOOP;

  RETURN v_candidate;
END;
$$;

COMMENT ON FUNCTION public.v2_generate_workshop_slug(uuid, text) IS
  'V2: unik slug för offentlig verkstadsprofil (§2.4). Tilldelas vid opt-in.';

-- ============================================
-- 2a. Slug assignment trigger. The existing guards
--     (protect_workshop_sensitive_fields_trigger, trg_guard_workshop_write)
--     freeze NEW.slug for non-privileged writers. BEFORE-row triggers fire in
--     alphabetical order, so this trigger (v2_…) runs AFTER both guards and
--     assigns a slug exactly when a profile is opted in without one. This is
--     the single, auditable slug-assignment path — no existing behavior
--     changes (trigger is a no-op unless public_profile_opt_in just turned on).
-- ============================================
CREATE OR REPLACE FUNCTION public.v2_assign_public_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_profile_opt_in = true
     AND NEW.slug IS NULL
     AND (TG_OP = 'INSERT' OR OLD.slug IS NULL) THEN
    NEW.slug := public.v2_generate_workshop_slug(NEW.id, NEW.company_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS v2_workshop_slug_on_opt_in ON public.workshops;
CREATE TRIGGER v2_workshop_slug_on_opt_in
BEFORE INSERT OR UPDATE ON public.workshops
FOR EACH ROW EXECUTE FUNCTION public.v2_assign_public_slug();

-- ============================================
-- 2b. Workshop consent/visibility RPC (S4 owns visibility controls).
--     The workshop's own JWT updates ONLY bio_short + public_profile_opt_in.
--     Slug assignment happens in the trigger above. All other columns
--     untouched; the existing guards keep their protections.
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
BEGIN
  IF v_workshop_id IS NULL OR NOT public.is_approved_workshop(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Endast godkända verkstäder kan publicera en profil.', 'code', 'not_approved');
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

COMMENT ON FUNCTION public.v2_set_public_profile(text, boolean) IS
  'V2 §2.4: verkstadens samtycke/synlighet för den publika katalogen. Sätter bio_short, public_profile_opt_in och (första gången) slug.';

GRANT EXECUTE ON FUNCTION public.v2_set_public_profile(text, boolean) TO authenticated;

-- ============================================
-- 3. Scoped public directory RPC with filters + G-D1 indexability gate.
--    Reads ONLY the whitelisted security_invoker view — column scoping is
--    enforced by the view definition, the gate is enforced here in SQL.
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
BEGIN
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

COMMENT ON FUNCTION public.v2_get_public_directory(text, text, text) IS
  'V2 §2.4/§7.4: publik verkstadskatalog (endast scopade kolumner via vyn) med G-D1-indexeringsgrind i SQL.';

GRANT EXECUTE ON FUNCTION public.v2_get_public_directory(text, text, text) TO anon, authenticated;
