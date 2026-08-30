// V2 feature-flag client (frontend). Contract: docs/v2/CONTRACTS.md §5.
// Reads v2_feature_flags via the public SELECT policy. Fails CLOSED:
// any read error = every flag off. 60 s in-memory cache.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import type { V2FeatureFlagRow, V2FlagKey } from './contracts'

// Typed client: the regenerated Database types (scripts/generate-v2-types.mjs)
// include every v2_* table. Tests may still inject a minimal mock client via
// `as unknown as V2Client` — runtime behavior is unchanged.
export type V2Client = SupabaseClient<Database>

// Lazy default client: importing the shared client module instantiates
// Supabase at import time (needs env), which must not happen in tests that
// only exercise pure logic.
let defaultClient: V2Client | null = null
async function db(client?: V2Client): Promise<V2Client> {
  if (client) return client
  if (!defaultClient) {
    const mod = await import('@/integrations/supabase/client')
    defaultClient = mod.supabase
  }
  return defaultClient
}

export type V2FlagMap = Map<string, V2FeatureFlagRow>

const CACHE_TTL_MS = 60_000
let cache: { at: number; flags: V2FlagMap } | null = null

export async function fetchV2Flags(
  opts: { bypassCache?: boolean; client?: V2Client } = {},
): Promise<V2FlagMap> {
  if (!opts.bypassCache && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.flags
  }
  try {
    const { data, error } = await (await db(opts.client))
      .from('v2_feature_flags')
      .select('key, enabled, rollout, description, updated_at')
    if (error || !data) return cache?.flags ?? new Map()

    const flags: V2FlagMap = new Map()
    for (const row of data) {
      flags.set(row.key, {
        ...row,
        rollout: (row.rollout ?? {}) as V2FeatureFlagRow['rollout'],
      })
    }
    cache = { at: Date.now(), flags }
    return flags
  } catch {
    return cache?.flags ?? new Map()
  }
}

export async function isV2FlagOn(key: V2FlagKey): Promise<boolean> {
  const flags = await fetchV2Flags()
  return flags.get(key)?.enabled === true
}

/** City/percent-scoped check; mirrors _shared/v2/config-schema.ts isFlagOnFor. */
export async function isV2FlagOnFor(
  key: V2FlagKey,
  opts: { citySlug?: string | null; subjectId?: string | null } = {},
): Promise<boolean> {
  const flag = (await fetchV2Flags()).get(key)
  if (!flag || flag.enabled !== true) return false

  const rollout = flag.rollout ?? {}
  if (Array.isArray(rollout.cities) && rollout.cities.length > 0) {
    if (!opts.citySlug || !rollout.cities.includes(opts.citySlug)) return false
  }
  if (typeof rollout.percent === 'number' && rollout.percent < 100) {
    if (!opts.subjectId) return false
    if (v2RolloutBucket(opts.subjectId) >= rollout.percent) return false
  }
  return true
}

/** Deterministic 0-99 bucket; MUST match rolloutBucket in _shared/v2/config-schema.ts. */
export function v2RolloutBucket(subjectId: string): number {
  let hash = 0
  for (let i = 0; i < subjectId.length; i++) {
    hash = (hash * 31 + subjectId.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 100
}

/** Test hook. */
export function __resetV2FlagClientCache(): void {
  cache = null
}
