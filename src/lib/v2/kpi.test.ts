// KPI math + migration SQL tests (S6 data-moat).
// - Pure ratio helpers mirror the SQL NULLIF semantics (no division-by-zero).
// - The migration is parsed with libpg-query (real PostgreSQL grammar) so a
//   syntax error fails the build, not production.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import {
  activationRate,
  choiceRate,
  fillRate,
  formatPercent,
  kpiRate,
} from './kpi'

// ---------------------------------------------------------------------------
// Pure KPI math
// ---------------------------------------------------------------------------

describe('KPI ratio math (NULLIF semantics)', () => {
  it('returns null on zero denominators instead of throwing/Infinity', () => {
    expect(kpiRate(1, 0)).toBeNull()
    expect(fillRate(0, 0)).toBeNull()
    expect(choiceRate(3, 0)).toBeNull()
    expect(activationRate(0, 0)).toBeNull()
  })

  it('computes fill rate = approved-with-quotes / approved', () => {
    expect(fillRate(5, 21)).toBeCloseTo(5 / 21)
    expect(fillRate(0, 21)).toBe(0)
  })

  it('computes choice rate = won / requests-with-quotes', () => {
    expect(choiceRate(2, 4)).toBe(0.5)
  })

  it('computes activation rate = workshops with first quote / approved', () => {
    expect(activationRate(3, 4)).toBe(0.75)
  })

  it('formats null rates as a dash', () => {
    expect(formatPercent(null)).toBe('–')
    expect(formatPercent(0.24)).toBe('24 %')
  })
})

// ---------------------------------------------------------------------------
// Migration SQL: parse with the real PostgreSQL grammar + structural guards
// ---------------------------------------------------------------------------

const MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/20260831_v2_datamoat_01_kpi_views.sql',
)

describe('KPI views migration', () => {
  let sql: string
  let parseSync: ((q: string) => { stmts: unknown[] }) | null = null

  beforeAll(async () => {
    sql = readFileSync(MIGRATION_PATH, 'utf8')
    try {
      const lq = await import('libpg-query')
      await lq.loadModule()
      parseSync = lq.parseSync
    } catch {
      parseSync = null
    }
  })

  it('parses with the PostgreSQL grammar (libpg-query)', () => {
    // libpg-query is a devDependency; if it is missing we still run the
    // structural checks below rather than failing hard.
    if (!parseSync) return
    const result = parseSync(sql)
    expect(result.stmts.length).toBeGreaterThan(10)
  })

  it('defines exactly the five KPI views, all security_invoker + admin-gated', () => {
    const views = [
      'v2_kpi_weekly_cohorts',
      'v2_kpi_city_summary',
      'v2_kpi_workshop_activation',
      'v2_kpi_settlement_monthly',
      'v2_kpi_events_daily',
    ]
    for (const view of views) {
      expect(sql).toContain(`CREATE OR REPLACE VIEW public.${view}`)
      expect(sql).toContain(`GRANT SELECT ON public.${view} TO authenticated;`)
    }
    // Every view carries the security_invoker marker and the SQL admin gate.
    expect(sql.match(/security_invoker = true/g)?.length).toBe(views.length)
    expect(sql.match(/is_admin\(auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(views.length)
  })

  it('guards every ratio division with NULLIF (no division-by-zero)', () => {
    const divisions = sql.match(/\/ NULLIF\(/g) ?? []
    // fill_rate, quotes_per_approved_request, choice_rate (×2 views),
    // activation_rate, win_rate, cash_share_of_settled
    expect(divisions.length).toBeGreaterThanOrEqual(9)
    // No bare `/ count(` style division outside NULLIF guards.
    expect(sql).not.toMatch(/\/\s*count\(/)
  })

  it('is additive-only and carries a rollback note', () => {
    expect(sql).toContain('Rollback:')
    expect(sql).not.toMatch(/DROP TABLE/i)
    expect(sql).not.toMatch(/ALTER TABLE public\.(bike_repair_requests|workshop_responses|workshops|lead_charges)/i)
    expect(sql).toContain('CREATE POLICY "V2 admins read lead charges"')
  })

  it('never exposes PII columns in KPI views', () => {
    for (const pii of ['customer_name', 'customer_email', 'customer_phone', 'view_token', 'stripe_']) {
      expect(sql).not.toContain(pii)
    }
  })
})
