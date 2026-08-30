// V2 S4 directory/profiles tests. Contract: docs/v2/CONTRACTS.md §2.4, §7 G-D1.
import { describe, expect, it } from 'vitest'
import {
  cityDirectoryPath,
  uniqueWorkshopSlug,
  v2DirectoryIndexable,
  v2ProfileIndexable,
  workshopProfilePath,
  workshopSlugify,
  V2_DIRECTORY_MIN_WORKSHOPS,
  V2_FORBIDDEN_PUBLIC_FIELDS,
  V2_PUBLIC_DIRECTORY_FIELDS,
} from './directory'
import type { V2CityConfigRow } from './contracts'

// ---------------------------------------------------------------------------
// Scoped-field allowlist (contract §2.4) — the exact columns the public
// surface may expose, in the exact contract set. If this test fails after an
// edit, the public surface changed and needs an architect review.
// ---------------------------------------------------------------------------
describe('V2_PUBLIC_DIRECTORY_FIELDS allowlist', () => {
  it('contains exactly the contract-approved columns', () => {
    expect([...V2_PUBLIC_DIRECTORY_FIELDS].sort()).toEqual([
      'areas_served',
      'avg_rating',
      'bio_short',
      'city',
      'city_slug',
      'cluster_slug',
      'company_name',
      'created_year',
      'last_review_at',
      'logo_url',
      'published_review_count',
      'services',
      'slug',
      'website',
      'workshop_id',
    ])
  })

  it('never exposes private account/customer fields', () => {
    const allowlist = new Set<string>(V2_PUBLIC_DIRECTORY_FIELDS)
    for (const forbidden of V2_FORBIDDEN_PUBLIC_FIELDS) {
      expect(allowlist.has(forbidden)).toBe(false)
    }
  })

  it('forbidden list covers the contract-named private fields', () => {
    const forbidden = new Set<string>(V2_FORBIDDEN_PUBLIC_FIELDS)
    for (const field of ['email', 'phone', 'address', 'stripe_customer_id', 'user_id', 'free_leads_remaining']) {
      expect(forbidden.has(field)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Indexability threshold (gate G-D1): ACTIVE/LIMITED city + admin
// directory_indexable + >= 3 opted-in approved workshops.
// ---------------------------------------------------------------------------
const config = (overrides: Partial<V2CityConfigRow>): Pick<V2CityConfigRow, 'state' | 'directory_indexable'> => ({
  state: 'ACTIVE',
  directory_indexable: true,
  ...overrides,
})

describe('v2DirectoryIndexable (G-D1)', () => {
  it('passes only when state, admin flag and threshold all pass', () => {
    expect(v2DirectoryIndexable(config({}), V2_DIRECTORY_MIN_WORKSHOPS)).toBe(true)
    expect(v2DirectoryIndexable(config({ state: 'LIMITED' }), V2_DIRECTORY_MIN_WORKSHOPS)).toBe(true)
    expect(v2DirectoryIndexable(config({}), V2_DIRECTORY_MIN_WORKSHOPS + 5)).toBe(true)
  })

  it('fails below the workshop threshold', () => {
    expect(v2DirectoryIndexable(config({}), V2_DIRECTORY_MIN_WORKSHOPS - 1)).toBe(false)
    expect(v2DirectoryIndexable(config({}), 0)).toBe(false)
  })

  it('fails without the admin directory_indexable flag', () => {
    expect(v2DirectoryIndexable(config({ directory_indexable: false }), 10)).toBe(false)
  })

  it('fails in non-public city states', () => {
    for (const state of ['RESEARCH', 'SUPPLY_BUILDING', 'PAUSED'] as const) {
      expect(v2DirectoryIndexable(config({ state }), 10)).toBe(false)
    }
  })

  it('fails closed without a city config row', () => {
    expect(v2DirectoryIndexable(null, 10)).toBe(false)
    expect(v2DirectoryIndexable(undefined, 10)).toBe(false)
  })
})

describe('v2ProfileIndexable', () => {
  it('follows the same gate as the directory', () => {
    expect(v2ProfileIndexable(config({}), V2_DIRECTORY_MIN_WORKSHOPS)).toBe(true)
    expect(v2ProfileIndexable(config({}), V2_DIRECTORY_MIN_WORKSHOPS - 1)).toBe(false)
    expect(v2ProfileIndexable(config({ state: 'SUPPLY_BUILDING' }), 10)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Slug helpers — parity with v2_slugify / v2_generate_workshop_slug in
// supabase/migrations/20260901_v2_s4_directory_profiles.sql. If the SQL
// changes, update these expectations and the TS mirror together.
// ---------------------------------------------------------------------------
describe('workshopSlugify (SQL parity)', () => {
  it.each([
    ['Cykel & Co AB', 'cykel-co-ab'],
    ['Cykelverkstan Östra Ån', 'cykelverkstan-ostra-an'],
    ['  Björks Cykel!!  ', 'bjorks-cykel'],
    ['Café Vélo', 'cafe-velo'],
    ['Müllers Hjuldoktor', 'mullers-hjuldoktor'],
    ['Lund', 'lund'],
    ['---', ''],
    ['', ''],
    ['ÅÄÖ', 'aao'],
    ['Räksmörgås & Cykelservice 24/7', 'raksmorgas-cykelservice-24-7'],
  ])('slugifies %s to %s', (input, expected) => {
    expect(workshopSlugify(input)).toBe(expected)
  })
})

describe('uniqueWorkshopSlug', () => {
  it('uses the base slug when free', () => {
    expect(uniqueWorkshopSlug('Björks Cykel', new Set())).toBe('bjorks-cykel')
  })

  it('appends numeric suffixes on collision', () => {
    const taken = new Set(['bjorks-cykel', 'bjorks-cykel-2'])
    expect(uniqueWorkshopSlug('Björks Cykel', taken)).toBe('bjorks-cykel-3')
  })

  it('falls back to a neutral base for empty names', () => {
    expect(uniqueWorkshopSlug('!!!', new Set())).toBe('verkstad')
    expect(uniqueWorkshopSlug('!!!', new Set(['verkstad']))).toBe('verkstad-2')
  })

  it('always returns a slug outside the taken set', () => {
    const taken = new Set<string>()
    const assigned = new Set<string>()
    for (const name of ['Cykel City', 'Cykel City', 'Cykel City', 'Cykel City']) {
      const slug = uniqueWorkshopSlug(name, taken)
      expect(taken.has(slug)).toBe(false)
      taken.add(slug)
      assigned.add(slug)
    }
    expect(assigned).toEqual(new Set(['cykel-city', 'cykel-city-2', 'cykel-city-3', 'cykel-city-4']))
  })
})

// ---------------------------------------------------------------------------
// URL helpers (contract IA: /verkstad/{slug}, /verkstader/{city_slug})
// ---------------------------------------------------------------------------
describe('directory paths', () => {
  it('builds profile and directory paths', () => {
    expect(workshopProfilePath('bjorks-cykel')).toBe('/verkstad/bjorks-cykel')
    expect(cityDirectoryPath('linkoping')).toBe('/verkstader/linkoping')
  })
})
