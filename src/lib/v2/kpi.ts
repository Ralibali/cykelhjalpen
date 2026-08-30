// V2 KPI surface (S6 data-moat). Reads the additive SQL views from migration
// 20260831_v2_datamoat_01_kpi_views.sql. The views are admin-gated in SQL
// (is_admin + security_invoker) and zero-division-safe; this module mirrors
// the ratio math in pure functions so the semantics are unit-testable.

import type { SupabaseClient } from '@supabase/supabase-js'

type UntypedClient = SupabaseClient<any, 'public', any>

// ---------------------------------------------------------------------------
// Pure KPI math (mirror of the SQL — NULLIF → null when denominator is 0)
// ---------------------------------------------------------------------------

/** Ratio with SQL NULLIF semantics: null when the denominator is 0. */
export function kpiRate(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
  return numerator / denominator
}

/** Fill rate = approved requests with ≥1 quote / approved requests (§8 glossary). */
export function fillRate(approvedWithQuotes: number, approved: number): number | null {
  return kpiRate(approvedWithQuotes, approved)
}

/** Choice rate = won / requests-with-quotes (§8 glossary). */
export function choiceRate(won: number, requestsWithQuotes: number): number | null {
  return kpiRate(won, requestsWithQuotes)
}

/** Activation rate = approved workshops that ever sent a quote / approved. */
export function activationRate(workshopsWithFirstQuote: number, approvedWorkshops: number): number | null {
  return kpiRate(workshopsWithFirstQuote, approvedWorkshops)
}

export function formatPercent(rate: number | null): string {
  if (rate == null) return '–'
  return `${Math.round(rate * 100)} %`
}

// ---------------------------------------------------------------------------
// View row types
// ---------------------------------------------------------------------------

export interface V2KpiWeeklyCohortRow {
  week: string
  city_slug: string | null
  cluster_slug: string | null
  requests: number
  approved: number
  rejected: number
  quotes_sent: number
  requests_with_quotes: number
  fill_rate: number | null
  quotes_per_approved_request: number | null
  median_hours_to_first_quote: number | null
  won: number
  settled: number
  choice_rate: number | null
}

export interface V2KpiCitySummaryRow {
  city_slug: string | null
  cluster_slug: string | null
  requests: number
  approved: number
  requests_30d: number
  quotes_sent: number
  requests_with_quotes: number
  fill_rate: number | null
  quotes_per_approved_request: number | null
  median_hours_to_first_quote: number | null
  won: number
  choice_rate: number | null
  approved_workshops: number
  active_workshops_30d: number
}

export interface V2KpiWorkshopActivationRow {
  city_slug: string | null
  cluster_slug: string | null
  registered_workshops: number
  approved_workshops: number
  workshops_with_first_quote: number
  workshops_with_first_win: number
  active_workshops_30d: number
  activation_rate: number | null
  win_rate: number | null
}

export interface V2KpiSettlementMonthlyRow {
  month: string
  won: number
  settled_free_lead: number
  settled_card: number
  won_unpaid: number
  cash_share_of_settled: number | null
  charges_paid: number
  revenue_ore: number
  revenue_sek: number
  charges_abandoned: number
  charges_refunded: number
}

export interface V2KpiData {
  weekly: V2KpiWeeklyCohortRow[]
  cities: V2KpiCitySummaryRow[]
  activation: V2KpiWorkshopActivationRow[]
  settlement: V2KpiSettlementMonthlyRow[]
}

const V2_KPI_VIEWS = [
  'v2_kpi_weekly_cohorts',
  'v2_kpi_city_summary',
  'v2_kpi_workshop_activation',
  'v2_kpi_settlement_monthly',
] as const

/**
 * Load all KPI views. Returns null when the migration is not deployed yet
 * (undefined table / permission error) so the admin page can hide the section
 * gracefully instead of erroring.
 */
export async function loadV2KpiData(client: UntypedClient): Promise<V2KpiData | null> {
  const [weekly, cities, activation, settlement] = await Promise.all([
    client.from(V2_KPI_VIEWS[0]).select('*').limit(52),
    client.from(V2_KPI_VIEWS[1]).select('*'),
    client.from(V2_KPI_VIEWS[2]).select('*'),
    client.from(V2_KPI_VIEWS[3]).select('*').limit(24),
  ])
  for (const result of [weekly, cities, activation, settlement]) {
    if (result.error) return null
  }
  return {
    weekly: (weekly.data ?? []) as V2KpiWeeklyCohortRow[],
    cities: (cities.data ?? []) as V2KpiCitySummaryRow[],
    activation: (activation.data ?? []) as V2KpiWorkshopActivationRow[],
    settlement: (settlement.data ?? []) as V2KpiSettlementMonthlyRow[],
  }
}
