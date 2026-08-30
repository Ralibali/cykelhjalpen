// Regression tests for the adversarial-QA fix pack (main @ 05952e8):
//   BLOCKER  — anon PII exposure on public.workshops via the opt-in policy
//   HIGH     — updro comparison pages 404 (missing from prerender set)
//   MEDIUM 5 — published v2_content_pages readable via PostgREST with flag off
//   MEDIUM 6 — v2_get_public_directory ignored the directory flag
// Static SQL/route assertions, same pattern as rls-policies.test.ts.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMPARISON_PAGES } from '../seoComparisons'
import { generateSitemapXml, getIndexableSeoRoutes } from '../seoStatic'

const MIGRATIONS_DIR = join(__dirname, '../../../supabase/migrations')
const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
const readMigration = (f: string) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8')

const FIX_PII = '20260902_v2_qa_fix_01_directory_pii.sql'
const FIX_CONTENT = '20260902_v2_qa_fix_02_content_surface_policy.sql'
const stripComments = (sql: string) => sql.replace(/--[^\n]*/g, '')
const fixPii = stripComments(readMigration(FIX_PII))
const fixContent = stripComments(readMigration(FIX_CONTENT))

/** Migrations applied after a given file (lexicographic = apply order). */
const laterThan = (file: string) =>
  migrationFiles.slice(migrationFiles.indexOf(file) + 1).map(readMigration).join('\n')

describe('QA fix 01 — workshops anon PII policy (BLOCKER)', () => {
  it('drops the table-level public SELECT policy on workshops', () => {
    expect(fixPii).toMatch(
      /drop\s+policy\s+if\s+exists\s+"V2 public reads opted-in approved workshops"\s+on\s+public\.workshops/i,
    )
  })

  it('no later migration resurrects a public SELECT policy on workshops', () => {
    const later = laterThan(FIX_PII)
    expect(later).not.toMatch(/create\s+policy\s+"V2 public reads opted-in approved workshops"/i)
    // Any future anon SELECT policy on workshops would re-open the column hole.
    expect(later).not.toMatch(
      /create\s+policy\s+"[^"]+"\s+on\s+public\.workshops\s+for\s+select\s+to\s+[^;]*\banon\b/i,
    )
  })

  it('recreates the scoped directory view WITHOUT security_invoker', () => {
    expect(fixPii).toMatch(/create\s+or\s+replace\s+view\s+public\.v2_public_workshop_directory\s+as/i)
    expect(fixPii).not.toMatch(/security_invoker\s*=\s*true/i)
    // The old reloption must be explicitly removed (CREATE OR REPLACE keeps it).
    expect(fixPii).toMatch(
      /alter\s+view\s+public\.v2_public_workshop_directory\s+set\s*\(\s*security_invoker\s*=\s*false\s*\)/i,
    )
  })

  it('view/RPC whitelist never includes PII or billing columns', () => {
    const viewBlock = fixPii.slice(
      fixPii.search(/create\s+or\s+replace\s+view\s+public\.v2_public_workshop_directory/i),
      fixPii.search(/alter\s+view\s+public\.v2_public_workshop_directory/i),
    )
    for (const column of ['email', 'phone', 'address', 'stripe_customer_id', 'free_leads_remaining', 'user_id']) {
      expect(viewBlock, `view must not expose ${column}`).not.toContain(column)
    }
    expect(fixPii).toMatch(/grant\s+select\s+on\s+public\.v2_public_workshop_directory\s+to\s+anon,\s*authenticated/i)
  })

  it('v2_set_public_profile keeps SECURITY DEFINER and flag-gates opt-in', () => {
    const fnBlock = fixPii.slice(
      fixPii.search(/create\s+or\s+replace\s+function\s+public\.v2_set_public_profile/i),
      fixPii.search(/create\s+or\s+replace\s+function\s+public\.v2_get_public_directory/i),
    )
    expect(fnBlock).toMatch(/security\s+definer/i)
    expect(fnBlock).toContain("'v2.directory.public_profiles'")
    expect(fnBlock).toContain('feature_disabled')
    // Opt-in (not opt-out) is what requires the flag.
    expect(fnBlock).toMatch(/if\s+p_opt_in\s*=\s*true\s+then/i)
  })

  it('v2_get_public_directory keeps SECURITY DEFINER and returns empty set with flag off', () => {
    const fnBlock = fixPii.slice(
      fixPii.search(/create\s+or\s+replace\s+function\s+public\.v2_get_public_directory/i),
    )
    expect(fnBlock).toMatch(/security\s+definer/i)
    expect(fnBlock).toContain("'v2.directory.public_profiles'")
    expect(fnBlock).toMatch(/if\s+not\s+v_flag_on\s+then/i)
    expect(fnBlock).toMatch(/'rows',\s*'\[\]'::jsonb/)
  })

  it('fix migration applies AFTER the migrations it overrides', () => {
    // CREATE OR REPLACE only wins if this file sorts after the originals.
    expect(migrationFiles.indexOf(FIX_PII)).toBeGreaterThan(
      migrationFiles.indexOf('20260901_v2_s4_directory_profiles.sql'),
    )
    expect(migrationFiles.indexOf(FIX_PII)).toBeGreaterThan(
      migrationFiles.indexOf('20260830_v2_contracts_06_public_surface.sql'),
    )
    const later = laterThan(FIX_PII)
    expect(later).not.toMatch(/create\s+or\s+replace\s+function\s+public\.v2_set_public_profile/i)
    expect(later).not.toMatch(/create\s+or\s+replace\s+function\s+public\.v2_get_public_directory/i)
    expect(later).not.toMatch(/create\s+or\s+replace\s+view\s+public\.v2_public_workshop_directory/i)
  })
})

describe('QA fix 02 — flag-aware content pages policy (MEDIUM 5)', () => {
  it('replaces the public policy in place (same name, drop + create)', () => {
    expect(fixContent).toMatch(
      /drop\s+policy\s+if\s+exists\s+"V2 public reads published content pages"\s+on\s+public\.v2_content_pages/i,
    )
    expect(fixContent).toMatch(
      /create\s+policy\s+"V2 public reads published content pages"\s+on\s+public\.v2_content_pages\s+for\s+select\s+to\s+anon,\s*authenticated/i,
    )
  })

  it('requires status=published AND the v2.seo.content_surface flag', () => {
    expect(fixContent).toMatch(/status\s*=\s*'published'/)
    expect(fixContent).toContain("'v2.seo.content_surface'")
    expect(fixContent).toMatch(/exists\s*\(\s*select\s+1\s+from\s+public\.v2_feature_flags/i)
  })

  it('keeps the admin content policy intact', () => {
    const later = laterThan('20260830_v2_contracts_04_growth.sql')
    expect(later).not.toMatch(/drop\s+policy\s+if\s+exists\s+"V2 admin manages content pages"/i)
    expect(later).not.toMatch(/drop\s+policy\s+"V2 admin manages content pages"/i)
  })
})

describe('QA fix — workshop settings opt-in is flag-gated (frontend)', () => {
  it('WorkshopSettings renders the public-profile section only with the flag on', () => {
    const source = readFileSync(
      join(__dirname, '../../pages/cykelhjalpen/workshop/WorkshopSettings.tsx'),
      'utf8',
    )
    expect(source).toContain("useV2Flag('v2.directory.public_profiles')")
    expect(source).toMatch(/publicProfilesOn\s*&&\s*\(/)
  })
})

describe('QA fix — updro comparison pages are prerendered (HIGH, updro regression)', () => {
  it('the comparison set is enumerable and non-trivial', () => {
    expect(COMPARISON_PAGES.length).toBe(16)
  })

  it('every comparison slug is an indexable updro prerender route with real metadata', () => {
    const routes = getIndexableSeoRoutes('updro')
    for (const page of COMPARISON_PAGES) {
      const route = routes.find((item) => item.path === `/${page.slug}`)
      expect(route, `saknar updro-route: /${page.slug}`).toBeDefined()
      expect(route?.title).toBe(page.metaTitle)
      expect(route?.description).toBe(page.metaDesc)
      expect(route?.h1).toBe(page.h1)
      expect(route?.noindex).toBeFalsy()
    }
  })

  it('every comparison slug appears in the updro sitemap', () => {
    const sitemap = generateSitemapXml('updro')
    for (const page of COMPARISON_PAGES) {
      expect(sitemap).toContain(`https://updro.se/${page.slug}`)
    }
  })

  it('comparison pages stay out of the cykelhjalpen prerender set (host separation)', () => {
    const paths = new Set(getIndexableSeoRoutes('cykelhjalpen').map((route) => route.path))
    for (const page of COMPARISON_PAGES) {
      expect(paths.has(`/${page.slug}`)).toBe(false)
    }
  })
})
