// V2 pricing invariant tests (S-lane). Contract §2.1, invariants I1–I2.
//
// HARD INVARIANT: the effective live price resolves to 5000 öre excl. VAT
// (50 kr, 25 % VAT → 62,50 kr), commission is 0 forever, and every source of
// the rule (compile-time constants, edge resolver, frontend resolver, DB seed
// in the migration) agrees. A drift in ANY of them fails this test.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  V2_LIVE_PRICING,
  grossOre,
  resolveExperimentVariant,
  resolvePricingConfig,
  type V2PricingConfigRow,
  type V2PricingExperimentRow,
} from '../../../supabase/functions/_shared/v2/config-schema'

import { LEAD_FEE_ORE, LEAD_FEE_KR } from '@/lib/pricing'
import {
  formatKrFromOre,
  pricingFromRows,
  useV2Pricing,
  V2_LIVE_PRICING_FALLBACK,
  v2GrossOre,
} from './pricing'

const SEED_ROW: V2PricingConfigRow = {
  key: 'winner_fee',
  amount_ore: 5000,
  currency: 'SEK',
  vat_rate: 0.25,
  commission_bps: 0,
  credit_pack_min: 1,
  credit_pack_max: 100,
  credit_unit_ore: 5000,
  free_wins_on_signup: 2,
  effective_from: '2026-08-30T00:00:00.000Z',
  active: true,
}

describe('live pricing invariant (I1–I2)', () => {
  it('compile-time constant is 5000 öre excl. VAT', () => {
    expect(LEAD_FEE_ORE).toBe(5000)
    expect(LEAD_FEE_KR).toBe(50)
  })

  it('edge fallback constant is 5000 öre, 25% VAT, 0 commission', () => {
    expect(V2_LIVE_PRICING.amountOre).toBe(5000)
    expect(V2_LIVE_PRICING.vatRate).toBe(0.25)
    expect(V2_LIVE_PRICING.commissionBps).toBe(0)
    expect(V2_LIVE_PRICING.creditUnitOre).toBe(5000)
    expect(V2_LIVE_PRICING.freeWinsOnSignup).toBe(2)
  })

  it('edge resolver: seed row resolves to exactly the live rule', () => {
    const resolved = resolvePricingConfig([SEED_ROW])
    expect(resolved.amountOre).toBe(5000)
    expect(resolved.vatRate).toBe(0.25)
    expect(resolved.commissionBps).toBe(0)
    expect(grossOre(resolved.amountOre, resolved.vatRate)).toBe(6250)
  })

  it('edge resolver forces commissionBps to 0 even if a row says otherwise (I1)', () => {
    const resolved = resolvePricingConfig([{ ...SEED_ROW, commission_bps: 1500 }])
    expect(resolved.commissionBps).toBe(0)
    expect(resolved.amountOre).toBe(5000)
  })

  it('edge resolver falls back to the live rule on empty/missing rows', () => {
    expect(resolvePricingConfig(null).amountOre).toBe(5000)
    expect(resolvePricingConfig([]).amountOre).toBe(5000)
    expect(resolvePricingConfig([{ ...SEED_ROW, active: false }]).amountOre).toBe(5000)
  })

  it('frontend resolver: seed row resolves to exactly the live rule', () => {
    const resolved = pricingFromRows([SEED_ROW])
    expect(resolved.amountOre).toBe(5000)
    expect(resolved.vatRate).toBe(0.25)
    expect(resolved.commissionBps).toBe(0)
    expect(resolved.creditUnitOre).toBe(5000)
    expect(resolved.source).toBe('config_table')
    expect(v2GrossOre(resolved.amountOre, resolved.vatRate)).toBe(6250)
  })

  it('frontend fallback equals the live constants (display == charge)', () => {
    expect(V2_LIVE_PRICING_FALLBACK.amountOre).toBe(LEAD_FEE_ORE)
    expect(V2_LIVE_PRICING_FALLBACK.creditUnitOre).toBe(LEAD_FEE_ORE)
    expect(pricingFromRows(null).amountOre).toBe(5000)
  })

  it('formats öre as sv-SE kronor strings', () => {
    expect(formatKrFromOre(5000)).toBe('50')
    expect(formatKrFromOre(6250)).toBe('62,50')
  })

  it('DB seed in migration 01 pins the same rule', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../../supabase/migrations/20260830_v2_contracts_01_foundation.sql'),
      'utf8',
    )
    // winner_fee seed row: 5000 öre, SEK, 25% VAT, 0 commission, packs 1–100 @ 5000, 2 free wins
    expect(sql).toContain("('winner_fee', 5000, 'SEK', 0.25, 0, 1, 100, 5000, 2")
    // 0% commission FOREVER is a database CHECK, not a convention (I1)
    expect(sql).toContain('CHECK (commission_bps = 0)')
  })
})

describe('useV2Pricing hook', () => {
  it('is exported and callable shape (placeholder = live fallback)', () => {
    expect(typeof useV2Pricing).toBe('function')
    expect(V2_LIVE_PRICING_FALLBACK.amountOre).toBe(5000)
  })
})

describe('pricing experiments — INERT + invariants (contract §2.8)', () => {
  const experiment = (over: Partial<V2PricingExperimentRow> = {}): V2PricingExperimentRow => ({
    key: 'winner_fee_ab',
    variants: [
      { name: 'control', winner_fee_ore: 5000, weight: 1 },
      { name: 'treatment', winner_fee_ore: 6000, weight: 1 },
    ],
    active: false,
    started_at: null,
    ended_at: null,
    ...over,
  })

  it('inactive experiment resolves nothing (live rule keeps applying)', () => {
    expect(resolveExperimentVariant(experiment(), 'workshop-1')).toBeNull()
  })

  it('ended experiment resolves nothing (never retroactive)', () => {
    expect(resolveExperimentVariant(
      experiment({ active: true, ended_at: '2026-01-01T00:00:00.000Z' }),
      'workshop-1',
      '2026-08-31T00:00:00.000Z',
    )).toBeNull()
  })

  it('no subjectId → no assignment', () => {
    expect(resolveExperimentVariant(experiment({ active: true }), null)).toBeNull()
  })

  it('active experiment resolves a deterministic variant carrying only winner_fee_ore', () => {
    const first = resolveExperimentVariant(experiment({ active: true }), 'workshop-42')
    expect(first).not.toBeNull()
    expect([5000, 6000]).toContain(first!.winner_fee_ore)
    // variants have no commission field at all — commission_bps stays 0 (I1)
    expect('commission_bps' in first!).toBe(false)
    // deterministic for the same subject
    expect(resolveExperimentVariant(experiment({ active: true }), 'workshop-42')).toEqual(first)
  })

  it('malformed variants resolve nothing', () => {
    expect(resolveExperimentVariant(
      experiment({ active: true, variants: [{ name: 'broken' }] }),
      'workshop-1',
    )).toBeNull()
    expect(resolveExperimentVariant(
      experiment({ active: true, variants: [{ name: 'x', winner_fee_ore: 5000, weight: 0 }] }),
      'workshop-1',
    )).toBeNull()
  })
})
