-- V2 CONTRACTS 03 — verified outcome lifecycle + reviews + aggregates (S3).
-- Contract: docs/v2/CONTRACTS.md §2.3. ADDITIVE ONLY.
--
-- Rule: en recension blir 'verified' först när kopplat outcome har
-- completion evidence (state 'completed'). Aggregat räknar bara 'published'.
--
-- Rollback: drop trigger v2_reviews_stats_refresh on public.v2_reviews;
--   drop function public.v2_refresh_workshop_review_stats();
--   drop table public.v2_workshop_review_stats, public.v2_reviews,
--   public.v2_job_outcomes; drop type public.v2_review_state,
--   public.v2_outcome_state.

-- ============================================
-- 1. Outcome lifecycle
-- ============================================
CREATE TYPE public.v2_outcome_state AS ENUM (
  'pending',
  'reported_by_workshop',
  'confirmed_by_customer',
  'completed',
  'no_show',
  'cancelled',
  'disputed',
  'expired'
);

CREATE TABLE public.v2_job_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.bike_repair_requests(id) ON DELETE CASCADE,
  response_id uuid NOT NULL UNIQUE REFERENCES public.workshop_responses(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  state public.v2_outcome_state NOT NULL DEFAULT 'pending',
  workshop_reported_at timestamptz NULL,
  customer_confirmed_at timestamptz NULL,
  final_price_sek integer NULL CHECK (final_price_sek IS NULL OR final_price_sek >= 0),
  completion_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_invited_at timestamptz NULL,
  invite_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX v2_job_outcomes_workshop ON public.v2_job_outcomes (workshop_id, created_at DESC);
CREATE INDEX v2_job_outcomes_state ON public.v2_job_outcomes (state) WHERE state = 'pending';

ALTER TABLE public.v2_job_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "V2 workshop reads own outcomes"
ON public.v2_job_outcomes FOR SELECT
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "V2 admin manages outcomes"
ON public.v2_job_outcomes FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Customer access is token-gated via edge functions (v2-confirm-outcome),
-- never via RLS — customers are account-less (contract §6.4).

-- ============================================
-- 2. Reviews
-- ============================================
CREATE TYPE public.v2_review_state AS ENUM (
  'submitted',
  'verified',
  'published',
  'flagged',
  'rejected',
  'removed'
);

CREATE TABLE public.v2_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id uuid NOT NULL UNIQUE REFERENCES public.v2_job_outcomes(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.bike_repair_requests(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NULL CHECK (body IS NULL OR char_length(body) <= 2000),
  state public.v2_review_state NOT NULL DEFAULT 'submitted',
  author_token_hash text NOT NULL,
  customer_email_hash text NOT NULL,
  workshop_response text NULL CHECK (workshop_response IS NULL OR char_length(workshop_response) <= 2000),
  workshop_responded_at timestamptz NULL,
  moderated_by uuid NULL REFERENCES auth.users(id),
  moderated_at timestamptz NULL,
  moderation_note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX v2_reviews_workshop ON public.v2_reviews (workshop_id, created_at DESC);
CREATE INDEX v2_reviews_published ON public.v2_reviews (workshop_id, created_at DESC)
  WHERE state = 'published';

-- Abuse-cap lookup index. The 180-day one-review-per-(workshop, customer)
-- window is enforced in v2-submit-review (function-level check using this
-- index) — a rolling time window cannot be expressed as a unique index.
CREATE INDEX v2_reviews_email_window
  ON public.v2_reviews (workshop_id, customer_email_hash, created_at DESC)
  WHERE state NOT IN ('rejected', 'removed');

ALTER TABLE public.v2_reviews ENABLE ROW LEVEL SECURITY;

-- No anon SELECT on the base table: public review reads go through
-- v2-get-public-workshop (published rows only, no hashes).
CREATE POLICY "V2 workshop reads own reviews"
ON public.v2_reviews FOR SELECT
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "V2 workshop responds to own reviews"
ON public.v2_reviews FOR UPDATE
TO authenticated
USING (workshop_id = get_workshop_id(auth.uid()))
WITH CHECK (workshop_id = get_workshop_id(auth.uid()));

CREATE POLICY "V2 admin manages reviews"
ON public.v2_reviews FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- 3. Denormalized aggregates (published reviews only)
-- ============================================
CREATE TABLE public.v2_workshop_review_stats (
  workshop_id uuid PRIMARY KEY REFERENCES public.workshops(id) ON DELETE CASCADE,
  published_count integer NOT NULL DEFAULT 0,
  avg_rating numeric(3,2) NULL,
  last_published_at timestamptz NULL,
  recent_avg_90d numeric(3,2) NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_workshop_review_stats ENABLE ROW LEVEL SECURITY;

-- Stats are safe to expose (aggregates, no PII) — used by directory/quote cards.
CREATE POLICY "V2 public reads review stats"
ON public.v2_workshop_review_stats FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "V2 admin manages review stats"
ON public.v2_workshop_review_stats FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.v2_refresh_workshop_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_workshop uuid;
BEGIN
  target_workshop := COALESCE(NEW.workshop_id, OLD.workshop_id);

  INSERT INTO public.v2_workshop_review_stats AS s
    (workshop_id, published_count, avg_rating, last_published_at, updated_at)
  SELECT
    target_workshop,
    count(*),
    round(avg(r.rating)::numeric, 2),
    max(r.created_at),
    now()
  FROM public.v2_reviews r
  WHERE r.workshop_id = target_workshop AND r.state = 'published'
  ON CONFLICT (workshop_id) DO UPDATE SET
    published_count = EXCLUDED.published_count,
    avg_rating = EXCLUDED.avg_rating,
    last_published_at = EXCLUDED.last_published_at,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER v2_reviews_stats_refresh
AFTER INSERT OR UPDATE OF state, rating OR DELETE ON public.v2_reviews
FOR EACH ROW
EXECUTE FUNCTION public.v2_refresh_workshop_review_stats();
