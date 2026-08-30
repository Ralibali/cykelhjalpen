// RLS policy-presence tests for the V2 migration pack.
// Parses supabase/migrations/*v2*.sql and asserts the contract §6 conventions:
// every v2_* table has RLS enabled and at least one policy, no FORCE RLS,
// no anon policies on PII-bearing base tables, SECURITY DEFINER functions pin
// search_path, and the dropped 20260610 broad workshops policy stays dead.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATIONS_DIR = join(__dirname, '../../../supabase/migrations')

function v2MigrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /v2/i.test(f) && f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n')
}

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '')
}

const sql = stripComments(v2MigrationSql())

const v2Tables = [...sql.matchAll(/create\s+table\s+public\.(v2_\w+)\s*\(/gi)].map(
  (m) => m[1],
)

describe('V2 RLS conventions (contract §6)', () => {
  it('the pack defines v2_* tables', () => {
    expect(v2Tables.length).toBeGreaterThanOrEqual(20)
  })

  it('every v2_* table has RLS enabled', () => {
    for (const table of v2Tables) {
      const re = new RegExp(
        `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
        'i',
      )
      expect(re.test(sql), `${table} missing ENABLE ROW LEVEL SECURITY`).toBe(true)
    }
  })

  it('no v2_* table uses FORCE ROW LEVEL SECURITY (service role must keep working)', () => {
    expect(/force\s+row\s+level\s+security/i.test(sql)).toBe(false)
  })

  it('every v2_* table has at least one policy', () => {
    for (const table of v2Tables) {
      const re = new RegExp(`create\\s+policy\\s+"[^"]+"\\s+on\\s+public\\.${table}\\b`, 'i')
      expect(re.test(sql), `${table} has no CREATE POLICY`).toBe(true)
    }
  })

  it('no anon/insertable policies on PII-bearing base tables (events, reviews, retention)', () => {
    const guarded = ['v2_events', 'v2_reviews', 'v2_retention_contacts', 'v2_lifecycle_messages']
    for (const table of guarded) {
      const policies = [
        ...sql.matchAll(
          new RegExp(
            `create\\s+policy\\s+"([^"]+)"\\s+on\\s+public\\.${table}\\s+for\\s+(\\w+)[\\s\\S]*?;`,
            'gi',
          ),
        ),
      ]
      for (const p of policies) {
        expect(p[0], `${table} policy "${p[1]}" must not include anon`).not.toMatch(
          /\bto\s+[^;]*\banon\b/i,
        )
      }
    }
  })

  it('v2_events is insert-service-only: no anon/authenticated INSERT policy', () => {
    expect(
      /create\s+policy\s+"[^"]+"\s+on\s+public\.v2_events\s+for\s+insert/i.test(sql),
    ).toBe(false)
  })

  it('every SECURITY DEFINER function in the pack pins search_path', () => {
    const fns = [
      ...sql.matchAll(
        /create\s+or\s+replace\s+function\s+public\.(\w+)\s*\(([\s\S]*?)\)\s*returns[\s\S]*?\$\$/gi,
      ),
    ]
    const securityDefiner = fns.filter((f) => /security\s+definer/i.test(f[0]))
    expect(securityDefiner.length).toBeGreaterThan(0)
    for (const f of securityDefiner) {
      expect(
        /set\s+search_path\s*=\s*public/i.test(f[0]),
        `${f[1]} is SECURITY DEFINER without SET search_path = public`,
      ).toBe(true)
    }
  })

  it('never resurrects the dropped 20260610 broad public workshops policy', () => {
    expect(/"Public reads approved workshops"/.test(sql)).toBe(false)
    // The only public SELECT policy on workshops must be the narrow opt-in one.
    const workshopPolicies = [
      ...sql.matchAll(
        /create\s+policy\s+"([^"]+)"\s+on\s+public\.workshops\s+for\s+select\s+to\s+anon([\s\S]*?);/gi,
      ),
    ]
    for (const p of workshopPolicies) {
      expect(p[2]).toMatch(/public_profile_opt_in\s*=\s*true/)
      expect(p[2]).toMatch(/approved\s*=\s*true/)
    }
  })

  it('workshops cannot self-publish reviews (no broad UPDATE grant remains)', () => {
    expect(/revoke\s+update\s+on\s+public\.v2_reviews\s+from\s+anon,\s*authenticated/i.test(sql)).toBe(
      true,
    )
    expect(
      /grant\s+update\s*\(\s*workshop_response\s*,\s*workshop_responded_at\s*\)\s+on\s+public\.v2_reviews\s+to\s+authenticated/i.test(
        sql,
      ),
    ).toBe(true)
  })

  it('every migration file carries a rollback note', () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => /v2/i.test(f) && f.endsWith('.sql'))
      .sort()
    for (const f of files) {
      const raw = readFileSync(join(MIGRATIONS_DIR, f), 'utf8')
      expect(/rollback:/i.test(raw), `${f} missing Rollback note`).toBe(true)
    }
  })
})
