-- V2 SECURITY HARDENING — additive RLS/grant hardening for the V2 migration pack
-- (20260830_v2_contracts_01–06), per docs/v2/CONTRACTS.md §6 conventions.
-- Owner: security/RLS swarm. No V1 table or policy is touched; the dropped
-- 20260610 broad workshops policy is NOT resurrected.
--
-- Gaps closed (audit 2026-08-31):
--   G1 (MEDIUM): "V2 workshop responds to own reviews" let an authenticated
--     workshop UPDATE *any* column of its own v2_reviews rows — including
--     state (self-publish) and rating (score manipulation). Column-level
--     grants now limit workshop updates to workshop_response /
--     workshop_responded_at; state transitions stay with service-role
--     functions (v2-moderate-review, completion promotion path).
--   G2 (LOW): anon could read active v2_pricing_experiments rows (experiment
--     design). Tightened to authenticated. Seeds are active=false, so nothing
--     is publicly readable until HQ activates an experiment anyway.
--   G3 (LOW): trigger function v2_refresh_workshop_review_stats kept the
--     default PUBLIC EXECUTE grant. It errors outside trigger context, but
--     least-privilege says revoke.
--   G4 (LOW): v2_emit_client_event accepted unlimited anon inserts (payload
--     <= 4 KB but unbounded row count). Added a soft per-session throttle
--     (120 events/min/session) — cheap abuse brake, not full rate limiting.
--     Signature and accepted event names unchanged.
--
-- Rollback:
--   GRANT UPDATE ON public.v2_reviews TO anon, authenticated;  -- restores Supabase default
--   DROP POLICY "V2 authenticated reads active pricing experiments" ON public.v2_pricing_experiments;
--   CREATE POLICY "V2 public reads active pricing experiments"
--     ON public.v2_pricing_experiments FOR SELECT TO anon, authenticated USING (active = true);
--   GRANT EXECUTE ON FUNCTION public.v2_refresh_workshop_review_stats() TO PUBLIC;
--   CREATE OR REPLACE FUNCTION public.v2_emit_client_event(...)  -- body from
--     20260830_v2_contracts_06_public_surface.sql (without the throttle block);
--   DROP INDEX public.v2_events_session_time;

-- ============================================
-- G1: v2_reviews — workshops may only update their response columns
-- ============================================
-- Table-level UPDATE came from Supabase default privileges; RLS still gates
-- WHICH rows (own reviews / admin), these grants gate WHICH columns.
REVOKE UPDATE ON public.v2_reviews FROM anon, authenticated;
GRANT UPDATE (workshop_response, workshop_responded_at)
  ON public.v2_reviews TO authenticated;

-- ============================================
-- G2: v2_pricing_experiments — authenticated-only read
-- ============================================
DROP POLICY "V2 public reads active pricing experiments" ON public.v2_pricing_experiments;

CREATE POLICY "V2 authenticated reads active pricing experiments"
ON public.v2_pricing_experiments FOR SELECT
TO authenticated
USING (active = true);

-- ============================================
-- G3: trigger function — no direct EXECUTE for non-owners
-- ============================================
REVOKE EXECUTE ON FUNCTION public.v2_refresh_workshop_review_stats() FROM PUBLIC, anon, authenticated;

-- ============================================
-- G4: client-event intake — soft per-session throttle + supporting index
-- ============================================
CREATE INDEX v2_events_session_time
  ON public.v2_events (session_id, occurred_at DESC);

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

  -- Soft throttle: 120 events/min/session (sessions are first-party '_sid').
  -- Not a substitute for edge/WAF rate limiting; raises the cost of trivial
  -- event-log flooding without affecting real users.
  IF p_session_id IS NOT NULL AND (
    SELECT count(*) FROM public.v2_events e
    WHERE e.session_id = left(p_session_id, 64)
      AND e.occurred_at > now() - interval '1 minute'
  ) >= 120 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'rate_limited');
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
