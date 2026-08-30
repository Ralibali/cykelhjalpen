// Types-vs-migration consistency test.
// scripts/generate-v2-types.mjs is the single generator: it parses the V2
// migration SQL and rewrites the marked regions of
// src/integrations/supabase/types.ts. This test fails the build if types.ts
// drifts from the migrations (e.g. a migration lands without regeneration).

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '../../..')

describe('generated supabase types vs V2 migrations', () => {
  it('types.ts is in sync with the migration DDL', () => {
    expect(() =>
      execFileSync('node', ['scripts/generate-v2-types.mjs', '--check'], {
        cwd: ROOT,
        stdio: 'pipe',
      }),
    ).not.toThrow()
  })

  it('typed client surface includes the v2 tables, view, RPCs and enums', () => {
    const types = readFileSync(join(ROOT, 'src/integrations/supabase/types.ts'), 'utf8')
    for (const table of [
      'v2_feature_flags',
      'v2_city_configs',
      'v2_pricing_config',
      'v2_events',
      'v2_job_outcomes',
      'v2_reviews',
      'v2_retention_contacts',
      'v2_workshop_subscriptions',
    ]) {
      expect(types).toContain(`${table}: {`)
    }
    expect(types).toContain('v2_public_workshop_directory: {')
    expect(types).toContain('v2_get_price_index: {')
    expect(types).toContain('v2_emit_client_event: {')
    expect(types).toContain('v2_city_state: "RESEARCH"')
  })

  it('V2 columns landed on the V1 table types', () => {
    const types = readFileSync(join(ROOT, 'src/integrations/supabase/types.ts'), 'utf8')
    for (const col of [
      'service_area_mode',
      'public_profile_opt_in',
      'bio_short',
      'winner_reminded_at',
      'stalled_at',
      'ghosted_claim_status',
      'reselection_count',
    ]) {
      expect(types).toContain(col)
    }
  })
})
