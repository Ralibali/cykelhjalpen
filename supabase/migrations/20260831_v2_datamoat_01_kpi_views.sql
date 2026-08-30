-- V2 DATA-MOAT 01 — KPI aggregation views (S6 analytics/datamoat lane).
-- Contract: docs/v2/CONTRACTS.md §4, §8 (glossary). Answers the DB-answerable
-- parts of the gated registry R1 (fill rate, choice rate, cash-vs-free-lead
-- mix, time-to-first-quote, revenue, won-unpaid abandonment) with per-city /
-- per-cluster breakdowns and weekly cohorts.
--
-- ADDITIVE ONLY. All views are security_invoker and additionally gated by
-- is_admin(auth.uid()) in the view body, so non-admin roles get zero rows even
-- if they hold the SELECT grant. Every ratio uses NULLIF — the views work on
-- empty/small data without division-by-zero.
--
-- Rollback:
--   drop view if exists public.v2_kpi_events_daily;
--   drop view if exists public.v2_kpi_settlement_monthly;
--   drop view if exists public.v2_kpi_workshop_activation;
--   drop view if exists public.v2_kpi_city_summary;
--   drop view if exists public.v2_kpi_weekly_cohorts;
--   drop policy if exists "V2 admins read lead charges" on public.lead_charges;

-- ============================================
-- 0. Admin read on lead_charges (today NO select policy exists, so the
--    settlement/revenue view could not see it under security_invoker).
-- ============================================
CREATE POLICY "V2 admins read lead charges"
ON public.lead_charges FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- ============================================
-- 1. Weekly cohorts per city (fill rate, quotes/request, time-to-first-quote,
--    choice rate). Cohort = week of request submission.
-- ============================================
CREATE OR REPLACE VIEW public.v2_kpi_weekly_cohorts
WITH (security_invoker = true) AS
WITH req AS (
  SELECT
    r.id,
    date_trunc('week', r.created_at)::date AS week,
    c.city_slug,
    c.cluster_slug,
    r.admin_status,
    COALESCE(r.approved_at, r.created_at) AS open_at
  FROM public.bike_repair_requests r
  LEFT JOIN public.v2_city_configs c ON c.city_name = r.city
),
quotes AS (
  SELECT
    wr.request_id,
    count(*) FILTER (WHERE wr.status IN ('sent', 'won', 'lost')) AS quotes_sent,
    min(wr.created_at) FILTER (WHERE wr.status IN ('sent', 'won', 'lost')) AS first_quote_at,
    count(*) FILTER (WHERE wr.status = 'won') AS won,
    count(*) FILTER (WHERE wr.status = 'won' AND wr.paid) AS settled
  FROM public.workshop_responses wr
  GROUP BY wr.request_id
)
SELECT
  req.week,
  req.city_slug,
  req.cluster_slug,
  count(*) AS requests,
  count(*) FILTER (WHERE req.admin_status = 'approved') AS approved,
  count(*) FILTER (WHERE req.admin_status = 'rejected') AS rejected,
  COALESCE(sum(q.quotes_sent), 0) AS quotes_sent,
  count(*) FILTER (WHERE req.admin_status = 'approved' AND COALESCE(q.quotes_sent, 0) > 0) AS requests_with_quotes,
  round(
    count(*) FILTER (WHERE req.admin_status = 'approved' AND COALESCE(q.quotes_sent, 0) > 0)::numeric
    / NULLIF(count(*) FILTER (WHERE req.admin_status = 'approved'), 0),
    4
  ) AS fill_rate,
  round(
    COALESCE(sum(q.quotes_sent) FILTER (WHERE req.admin_status = 'approved'), 0)::numeric
    / NULLIF(count(*) FILTER (WHERE req.admin_status = 'approved'), 0),
    2
  ) AS quotes_per_approved_request,
  round(percentile_cont(0.5) WITHIN GROUP (
    ORDER BY extract(epoch FROM (q.first_quote_at - req.open_at)) / 3600.0
  )::numeric, 2) AS median_hours_to_first_quote,
  COALESCE(sum(q.won), 0) AS won,
  COALESCE(sum(q.settled), 0) AS settled,
  round(
    COALESCE(sum(q.won), 0)::numeric
    / NULLIF(count(*) FILTER (WHERE req.admin_status = 'approved' AND COALESCE(q.quotes_sent, 0) > 0), 0),
    4
  ) AS choice_rate
FROM req
LEFT JOIN quotes q ON q.request_id = req.id
WHERE is_admin(auth.uid())
GROUP BY req.week, req.city_slug, req.cluster_slug
ORDER BY req.week DESC, req.city_slug;

GRANT SELECT ON public.v2_kpi_weekly_cohorts TO authenticated;

COMMENT ON VIEW public.v2_kpi_weekly_cohorts IS
  'V2 KPI: veckokohorter per stad – fill rate, offerter/ärende, tid till första offert, choice rate. Admin-only. docs/v2/CONTRACTS.md §8.';

-- ============================================
-- 2. Per-city / cluster summary (all-time) — supply + demand KPIs.
-- ============================================
CREATE OR REPLACE VIEW public.v2_kpi_city_summary
WITH (security_invoker = true) AS
WITH req AS (
  SELECT
    r.id,
    c.city_slug,
    c.cluster_slug,
    r.admin_status,
    r.created_at,
    COALESCE(r.approved_at, r.created_at) AS open_at
  FROM public.bike_repair_requests r
  LEFT JOIN public.v2_city_configs c ON c.city_name = r.city
),
quotes AS (
  SELECT
    wr.request_id,
    count(*) FILTER (WHERE wr.status IN ('sent', 'won', 'lost')) AS quotes_sent,
    min(wr.created_at) FILTER (WHERE wr.status IN ('sent', 'won', 'lost')) AS first_quote_at,
    count(*) FILTER (WHERE wr.status = 'won') AS won
  FROM public.workshop_responses wr
  GROUP BY wr.request_id
),
supply AS (
  SELECT
    c.city_slug,
    count(*) FILTER (WHERE w.approved) AS approved_workshops,
    count(*) FILTER (
      WHERE w.approved AND EXISTS (
        SELECT 1 FROM public.workshop_responses wr
        WHERE wr.workshop_id = w.id
          AND wr.created_at >= now() - interval '30 days'
      )
    ) AS active_workshops_30d
  FROM public.workshops w
  LEFT JOIN public.v2_city_configs c ON c.city_name = w.city
  GROUP BY c.city_slug
)
SELECT
  req.city_slug,
  req.cluster_slug,
  count(*) AS requests,
  count(*) FILTER (WHERE req.admin_status = 'approved') AS approved,
  count(*) FILTER (WHERE req.created_at >= now() - interval '30 days') AS requests_30d,
  COALESCE(sum(q.quotes_sent), 0) AS quotes_sent,
  count(*) FILTER (WHERE req.admin_status = 'approved' AND COALESCE(q.quotes_sent, 0) > 0) AS requests_with_quotes,
  round(
    count(*) FILTER (WHERE req.admin_status = 'approved' AND COALESCE(q.quotes_sent, 0) > 0)::numeric
    / NULLIF(count(*) FILTER (WHERE req.admin_status = 'approved'), 0),
    4
  ) AS fill_rate,
  round(
    COALESCE(sum(q.quotes_sent) FILTER (WHERE req.admin_status = 'approved'), 0)::numeric
    / NULLIF(count(*) FILTER (WHERE req.admin_status = 'approved'), 0),
    2
  ) AS quotes_per_approved_request,
  round(percentile_cont(0.5) WITHIN GROUP (
    ORDER BY extract(epoch FROM (q.first_quote_at - req.open_at)) / 3600.0
  )::numeric, 2) AS median_hours_to_first_quote,
  COALESCE(sum(q.won), 0) AS won,
  round(
    COALESCE(sum(q.won), 0)::numeric
    / NULLIF(count(*) FILTER (WHERE req.admin_status = 'approved' AND COALESCE(q.quotes_sent, 0) > 0), 0),
    4
  ) AS choice_rate,
  COALESCE(s.approved_workshops, 0) AS approved_workshops,
  COALESCE(s.active_workshops_30d, 0) AS active_workshops_30d
FROM req
LEFT JOIN quotes q ON q.request_id = req.id
LEFT JOIN supply s ON s.city_slug = req.city_slug
WHERE is_admin(auth.uid())
GROUP BY req.city_slug, req.cluster_slug, s.approved_workshops, s.active_workshops_30d
ORDER BY req.city_slug;

GRANT SELECT ON public.v2_kpi_city_summary TO authenticated;

COMMENT ON VIEW public.v2_kpi_city_summary IS
  'V2 KPI: per-stad/kluster summering – efterfrågan, fill rate, choice rate, utbud. Admin-only.';

-- ============================================
-- 3. Workshop activation funnel per city (activation rate:
--    approved → first quote → first win → active 30d).
-- ============================================
CREATE OR REPLACE VIEW public.v2_kpi_workshop_activation
WITH (security_invoker = true) AS
SELECT
  c.city_slug,
  c.cluster_slug,
  count(*) AS registered_workshops,
  count(*) FILTER (WHERE w.approved) AS approved_workshops,
  count(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM public.workshop_responses wr
      WHERE wr.workshop_id = w.id AND wr.status IN ('sent', 'won', 'lost')
    )
  ) AS workshops_with_first_quote,
  count(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM public.workshop_responses wr
      WHERE wr.workshop_id = w.id AND wr.status = 'won'
    )
  ) AS workshops_with_first_win,
  count(*) FILTER (
    WHERE w.approved AND EXISTS (
      SELECT 1 FROM public.workshop_responses wr
      WHERE wr.workshop_id = w.id AND wr.created_at >= now() - interval '30 days'
    )
  ) AS active_workshops_30d,
  round(
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM public.workshop_responses wr
        WHERE wr.workshop_id = w.id AND wr.status IN ('sent', 'won', 'lost')
      )
    )::numeric
    / NULLIF(count(*) FILTER (WHERE w.approved), 0),
    4
  ) AS activation_rate,
  round(
    count(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM public.workshop_responses wr
        WHERE wr.workshop_id = w.id AND wr.status = 'won'
      )
    )::numeric
    / NULLIF(count(*) FILTER (WHERE w.approved), 0),
    4
  ) AS win_rate
FROM public.workshops w
LEFT JOIN public.v2_city_configs c ON c.city_name = w.city
WHERE is_admin(auth.uid())
GROUP BY c.city_slug, c.cluster_slug
ORDER BY c.city_slug;

GRANT SELECT ON public.v2_kpi_workshop_activation TO authenticated;

COMMENT ON VIEW public.v2_kpi_workshop_activation IS
  'V2 KPI: verkstadsaktivering per stad – godkänd → första offert → första vinst → aktiv 30d. Admin-only.';

-- ============================================
-- 4. Settlement mix + revenue per month (R1: cash-vs-free-lead mix,
--    revenue to date, won-unpaid abandonment).
-- ============================================
CREATE OR REPLACE VIEW public.v2_kpi_settlement_monthly
WITH (security_invoker = true) AS
WITH wins AS (
  SELECT
    -- choose_bike_winner stamps bike_repair_requests.updated_at at win time;
    -- workshop_responses has no updated_at column.
    date_trunc('month', COALESCE(r.updated_at, wr.created_at))::date AS month,
    count(*) AS won,
    count(*) FILTER (WHERE wr.paid AND wr.used_free_lead) AS settled_free_lead,
    count(*) FILTER (WHERE wr.paid AND NOT wr.used_free_lead) AS settled_card,
    count(*) FILTER (WHERE NOT wr.paid) AS won_unpaid
  FROM public.workshop_responses wr
  LEFT JOIN public.bike_repair_requests r ON r.id = wr.request_id
  WHERE wr.status = 'won'
  GROUP BY 1
),
charges AS (
  SELECT
    date_trunc('month', lc.created_at)::date AS month,
    count(*) FILTER (WHERE lc.status = 'paid') AS charges_paid,
    COALESCE(sum(lc.amount) FILTER (WHERE lc.status = 'paid'), 0) AS revenue_ore,
    count(*) FILTER (WHERE lc.status IN ('expired', 'failed')) AS charges_abandoned,
    count(*) FILTER (WHERE lc.status = 'refunded') AS charges_refunded
  FROM public.lead_charges lc
  GROUP BY 1
)
SELECT
  COALESCE(wins.month, charges.month) AS month,
  COALESCE(wins.won, 0) AS won,
  COALESCE(wins.settled_free_lead, 0) AS settled_free_lead,
  COALESCE(wins.settled_card, 0) AS settled_card,
  COALESCE(wins.won_unpaid, 0) AS won_unpaid,
  round(
    COALESCE(wins.settled_card, 0)::numeric
    / NULLIF(COALESCE(wins.settled_card, 0) + COALESCE(wins.settled_free_lead, 0), 0),
    4
  ) AS cash_share_of_settled,
  COALESCE(charges.charges_paid, 0) AS charges_paid,
  COALESCE(charges.revenue_ore, 0) AS revenue_ore,
  round(COALESCE(charges.revenue_ore, 0)::numeric / 100.0, 2) AS revenue_sek,
  COALESCE(charges.charges_abandoned, 0) AS charges_abandoned,
  COALESCE(charges.charges_refunded, 0) AS charges_refunded
FROM wins
FULL OUTER JOIN charges ON charges.month = wins.month
WHERE is_admin(auth.uid())
ORDER BY month DESC;

GRANT SELECT ON public.v2_kpi_settlement_monthly TO authenticated;

COMMENT ON VIEW public.v2_kpi_settlement_monthly IS
  'V2 KPI: regleringsmix (kort vs gratis-lead), intäkter och obetalda vinster per månad. Admin-only.';

-- ============================================
-- 5. Data-moat event volume per day (sanity surface for the event catalog;
--    also the cheapest way to see which flows are instrumented live).
-- ============================================
CREATE OR REPLACE VIEW public.v2_kpi_events_daily
WITH (security_invoker = true) AS
SELECT
  e.occurred_at::date AS day,
  e.event_name,
  e.city_slug,
  count(*) AS events
FROM public.v2_events e
WHERE is_admin(auth.uid())
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2;

GRANT SELECT ON public.v2_kpi_events_daily TO authenticated;

COMMENT ON VIEW public.v2_kpi_events_daily IS
  'V2 KPI: händelsevolymer per dag/namn/stad ur v2_events. Admin-only.';
