-- V2 CONTRACTS 06 — public directory surface (scoped, opt-in) + client event
-- intake RPC + cron scheduling register.
-- Contract: docs/v2/CONTRACTS.md §2.4, §3.6, §6, §7. ADDITIVE ONLY.
--
-- The 20260610 migration dropped the BROAD anon SELECT on workshops. This file
-- deliberately does NOT recreate it. Instead it adds a strictly narrower policy:
-- approved AND public_profile_opt_in = true, and exposes only whitelisted
-- columns through a security_invoker view.
--
-- Rollback: drop function public.v2_emit_client_event(text, jsonb, text, text);
--   drop view public.v2_public_workshop_directory;
--   drop policy "V2 public reads opted-in approved workshops" on public.workshops.

-- ============================================
-- 1. Narrow opt-in policy on workshops (the ONLY new public read)
-- ============================================
CREATE POLICY "V2 public reads opted-in approved workshops"
ON public.workshops FOR SELECT
TO anon, authenticated
USING (approved = true AND public_profile_opt_in = true);

-- ============================================
-- 2. Scoped public directory view (whitelisted columns only — never
--    email/phone/address/stripe/user_id/free_leads_remaining)
-- ============================================
CREATE OR REPLACE VIEW public.v2_public_workshop_directory
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.v2_public_workshop_directory TO anon, authenticated;

COMMENT ON VIEW public.v2_public_workshop_directory IS
  'V2 publik verkstadskatalog: endast opt-in + godkända verkstäder, whitelistade kolumner. docs/v2/CONTRACTS.md §2.4.';

-- ============================================
-- 3. Client event intake (S6). Hardened:
--    - only event names in the client.* namespace (catalog §4)
--    - payload <= 4 KB, PII keys stripped
--    - never throws (returns ok:false on rejection)
-- ============================================
CREATE OR REPLACE FUNCTION public.v2_emit_client_event(
  p_event_name text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_session_id text DEFAULT NULL,
  p_consent_scope text DEFAULT 'necessary'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'client.wizard_started',
    'client.wizard_step_completed',
    'client.wizard_submitted',
    'client.quote_card_viewed',
    'client.winner_selected_click',
    'client.directory_viewed',
    'client.profile_viewed',
    'client.estimator_used'
  ];
  v_clean jsonb;
BEGIN
  IF NOT (p_event_name = ANY (v_allowed)) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unknown_event');
  END IF;

  IF octet_length(COALESCE(p_payload, '{}'::jsonb)::text) > 4096 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'payload_too_large');
  END IF;

  -- Strip keys that could carry PII or secrets.
  v_clean := COALESCE(p_payload, '{}'::jsonb)
    - 'email' - 'phone' - 'name' - 'customer_name' - 'customer_email'
    - 'customer_phone' - 'token' - 'view_token' - 'password';

  INSERT INTO public.v2_events
    (event_name, actor_type, session_id, payload, consent_scope, city_slug, host)
  VALUES (
    p_event_name,
    'anon',
    left(COALESCE(p_session_id, ''), 64),
    v_clean,
    CASE WHEN p_consent_scope IN ('necessary','statistics','marketing')
         THEN p_consent_scope ELSE 'necessary' END,
    NULLIF(left(COALESCE(v_clean->>'city_slug', ''), 40), ''),
    'cykelhjalpen'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.v2_emit_client_event(text, jsonb, text, text) TO anon, authenticated;

-- ============================================
-- 4. Cron scheduling register (registry R4 / B7 lesson: crons must be
--    verifiable). S13 schedules these at deploy time and verifies with
--    `select * from cron.job`. Scheduling is intentionally NOT auto-applied
--    here so HQ controls when each loop starts (flags are all OFF anyway).
--
--    Planned jobs (apply when the owning swarm ships + flag flips):
--      v2-zero-quote-rescue-hourly      '0 * * * *'     S2  flag v2.liquidity.zero_quote_rescue
--      v2-winner-reminders-hourly       '10 * * * *'    S2  flag v2.liquidity.winner_reminders
--      v2-stalled-winner-recovery-daily '20 6 * * *'    S2  flag v2.liquidity.winner_reminders
--      v2-outcome-invites-daily         '30 8 * * *'    S3  flag v2.reviews.outcome_lifecycle
--      v2-compute-price-index-daily     '40 3 * * *'    S5  flag v2.prisindex.engine
--      v2-retention-cron-daily          '50 7 * * *'    S8  flag v2.retention.lifecycle
--      v2-supply-snapshot-daily         '0 5 * * *'     S10 (writes v2_supply_snapshots)
-- ============================================
