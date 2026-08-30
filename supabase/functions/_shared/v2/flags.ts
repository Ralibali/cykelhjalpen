// V2 feature-flag reader (edge side). Contract: docs/v2/CONTRACTS.md §5.
// Missing flags are OFF; read errors fail CLOSED (empty map = everything off).
// 60 s in-memory cache per isolate to keep hot paths cheap.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  isFlagOn,
  isFlagOnFor,
  type V2FlagKey,
  type V2FlagMap,
  type V2FeatureFlagRow,
} from './config-schema.ts'

const CACHE_TTL_MS = 60_000

let cache: { at: number; flags: V2FlagMap } | null = null

export async function getV2Flags(
  supabase: SupabaseClient,
  opts: { bypassCache?: boolean } = {},
): Promise<V2FlagMap> {
  if (!opts.bypassCache && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.flags
  }

  const { data, error } = await supabase
    .from('v2_feature_flags')
    .select('key, enabled, rollout')

  if (error || !data) {
    // Fail closed: an unreadable flag table means every V2 feature stays off.
    return cache?.flags ?? {}
  }

  const flags: V2FlagMap = {}
  for (const row of data as V2FeatureFlagRow[]) {
    flags[row.key as V2FlagKey] = row
  }
  cache = { at: Date.now(), flags }
  return flags
}

export async function v2FlagEnabled(
  supabase: SupabaseClient,
  key: V2FlagKey,
): Promise<boolean> {
  return isFlagOn(await getV2Flags(supabase), key)
}

export async function v2FlagEnabledFor(
  supabase: SupabaseClient,
  key: V2FlagKey,
  opts: { citySlug?: string | null; subjectId?: string | null } = {},
): Promise<boolean> {
  return isFlagOnFor(await getV2Flags(supabase), key, opts)
}

/** Test hook: drop the isolate-level cache. */
export function __resetV2FlagCache(): void {
  cache = null
}
