// V2 S4 — public workshop directory & profiles (frontend).
// Contract: docs/v2/CONTRACTS.md §2.4 (scoped view), §5 (flag
// v2.directory.public_profiles), §7 gate G-D1 (indexability threshold).
//
// Security model: the public surface reads ONLY the whitelisted columns of
// v2_public_workshop_directory (via the v2-get-public-workshop edge function
// and the v2_get_public_directory RPC). The allowlist below is the single
// frontend source of truth and is enforced by directory.test.ts.

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { V2CityConfigRow, V2PublicReview, V2PublicWorkshop } from './contracts'
import { isV2FlagOn } from './flags'

type UntypedClient = SupabaseClient<any, 'public', any>

// ---------------------------------------------------------------------------
// Contract §2.4 — the ONLY fields a public surface may expose.
// NEVER add: email, phone, address, stripe ids, free_leads_remaining, user_id.
// ---------------------------------------------------------------------------
export const V2_PUBLIC_DIRECTORY_FIELDS = [
  'workshop_id',
  'slug',
  'company_name',
  'city',
  'city_slug',
  'services',
  'areas_served',
  'logo_url',
  'website',
  'bio_short',
  'created_year',
  'published_review_count',
  'avg_rating',
  'cluster_slug',
  'last_review_at',
] as const
export type V2PublicDirectoryField = (typeof V2_PUBLIC_DIRECTORY_FIELDS)[number]

/** Fields that must never reach a public surface (tested). */
export const V2_FORBIDDEN_PUBLIC_FIELDS = [
  'email',
  'phone',
  'address',
  'stripe_customer_id',
  'user_id',
  'free_leads_remaining',
  'org_number',
  'sms_notifications',
  'onboarding_state',
  'public_profile_opt_in',
] as const

/** Gate G-D1: a city directory is indexable only with this many opted-in workshops. */
export const V2_DIRECTORY_MIN_WORKSHOPS = 3

// ---------------------------------------------------------------------------
// URL helpers (contract IA: /verkstad/{slug} + /verkstader/{city_slug})
// ---------------------------------------------------------------------------
export const V2_DIRECTORY_ROOT = '/verkstader'
export const workshopProfilePath = (slug: string) => `/verkstad/${slug}`
export const cityDirectoryPath = (citySlug: string) => `${V2_DIRECTORY_ROOT}/${citySlug}`

// ---------------------------------------------------------------------------
// Slug helpers — MUST mirror v2_slugify / v2_generate_workshop_slug in
// supabase/migrations/20260901_v2_s4_directory_profiles.sql (parity tested).
// ---------------------------------------------------------------------------
const SLUG_TRANSLATE: Record<string, string> = {
  å: 'a', ä: 'a', ö: 'o', é: 'e', è: 'e', ê: 'e', ë: 'e', ü: 'u',
}

export function workshopSlugify(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .split('')
    .map((char) => SLUG_TRANSLATE[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Mirrors the SQL suffix loop: base, base-2, base-3, … until unique. */
export function uniqueWorkshopSlug(companyName: string, taken: ReadonlySet<string>): string {
  const base = workshopSlugify(companyName) || 'verkstad'
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

// ---------------------------------------------------------------------------
// Indexability (gate G-D1): per-city config + sample threshold.
// ---------------------------------------------------------------------------
export function v2DirectoryIndexable(
  config: Pick<V2CityConfigRow, 'state' | 'directory_indexable'> | null | undefined,
  optedInWorkshops: number,
): boolean {
  if (!config) return false
  if (config.state !== 'ACTIVE' && config.state !== 'LIMITED') return false
  if (config.directory_indexable !== true) return false
  return optedInWorkshops >= V2_DIRECTORY_MIN_WORKSHOPS
}

/** A profile page follows its city's directory gate (§2.4: noindex until the gate passes). */
export function v2ProfileIndexable(
  config: Pick<V2CityConfigRow, 'state' | 'directory_indexable'> | null | undefined,
  optedInWorkshops: number,
): boolean {
  return v2DirectoryIndexable(config, optedInWorkshops)
}

// ---------------------------------------------------------------------------
// Fetchers (lazy default client — the shared client needs env at import time)
// ---------------------------------------------------------------------------
let defaultClient: UntypedClient | null = null
async function db(client?: UntypedClient): Promise<UntypedClient> {
  if (client) return client
  if (!defaultClient) {
    const mod = await import('@/integrations/supabase/client')
    defaultClient = mod.supabase as unknown as UntypedClient
  }
  return defaultClient
}

export interface V2DirectoryResult {
  rows: V2PublicWorkshop[]
  total: number
  indexable: boolean
  minWorkshops: number
  citySlug: string | null
}

/** Directory listing via the scoped RPC (filters applied in SQL, view-only reads). */
export async function fetchPublicDirectory(
  opts: { citySlug?: string | null; service?: string | null; area?: string | null; client?: UntypedClient } = {},
): Promise<V2DirectoryResult> {
  try {
    const { data, error } = await (await db(opts.client)).rpc('v2_get_public_directory', {
      p_city_slug: opts.citySlug ?? null,
      p_service: opts.service ?? null,
      p_area: opts.area ?? null,
    })
    if (error || !data) return { rows: [], total: 0, indexable: false, minWorkshops: V2_DIRECTORY_MIN_WORKSHOPS, citySlug: opts.citySlug ?? null }
    const payload = data as {
      rows?: V2PublicWorkshop[]
      total?: number
      indexable?: boolean
      min_workshops?: number
      city_slug?: string | null
    }
    return {
      rows: Array.isArray(payload.rows) ? payload.rows : [],
      total: typeof payload.total === 'number' ? payload.total : 0,
      indexable: payload.indexable === true,
      minWorkshops: payload.min_workshops ?? V2_DIRECTORY_MIN_WORKSHOPS,
      citySlug: payload.city_slug ?? opts.citySlug ?? null,
    }
  } catch {
    return { rows: [], total: 0, indexable: false, minWorkshops: V2_DIRECTORY_MIN_WORKSHOPS, citySlug: opts.citySlug ?? null }
  }
}

export interface V2PublicProfileResult {
  workshop: V2PublicWorkshop
  reviews: V2PublicReview[]
  indexable: boolean
}

/** Single profile via the public edge function. Null = flag off or not opted in. */
export async function fetchPublicWorkshopProfile(
  slug: string,
  opts: { client?: UntypedClient } = {},
): Promise<V2PublicProfileResult | null> {
  try {
    const { data, error } = await (await db(opts.client)).functions.invoke('v2-get-public-workshop', {
      body: { slug },
    })
    if (error || !data?.workshop) return null
    return {
      workshop: data.workshop as V2PublicWorkshop,
      reviews: Array.isArray(data.reviews) ? (data.reviews as V2PublicReview[]) : [],
      indexable: data.indexable === true,
    }
  } catch {
    return null
  }
}

/** Workshop-side consent/visibility save (§2.4). RPC enforces plain-text ≤ 280 chars. */
export async function savePublicProfileConsent(
  input: { bioShort: string | null; optIn: boolean },
  opts: { client?: UntypedClient } = {},
): Promise<{ slug: string | null; public_profile_opt_in: boolean; bio_short: string | null } | { error: string }> {
  try {
    const { data, error } = await (await db(opts.client)).rpc('v2_set_public_profile', {
      p_bio_short: input.bioShort,
      p_opt_in: input.optIn,
    })
    if (error) return { error: error.message }
    if (data?.error) return { error: data.error as string }
    return data
  } catch {
    return { error: 'network' }
  }
}

// ---------------------------------------------------------------------------
// React gate hook: is the public directory surface usable for a city right
// now? Both conditions must hold: the feature flag is ON and the G-D1
// threshold passes (returned by the RPC). Used by city pages for internal
// linking and by the directory/profile pages themselves.
// ---------------------------------------------------------------------------
export interface V2DirectoryGate {
  loading: boolean
  /** Feature flag v2.directory.public_profiles is ON. */
  flagOn: boolean
  /** Flag ON + gate G-D1 passes for this city (or any city when citySlug is null). */
  available: boolean
  /** indexable per G-D1 (same condition as available — kept explicit for SEO code). */
  indexable: boolean
  /** Number of opted-in workshops matching the city (unfiltered count). */
  total: number
}

export function useDirectoryGate(citySlug: string | null): V2DirectoryGate {
  const [state, setState] = useState<V2DirectoryGate>({
    loading: true,
    flagOn: false,
    available: false,
    indexable: false,
    total: 0,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const flagOn = await isV2FlagOn('v2.directory.public_profiles')
      if (!flagOn) {
        if (!cancelled) setState({ loading: false, flagOn: false, available: false, indexable: false, total: 0 })
        return
      }
      const result = await fetchPublicDirectory({ citySlug })
      if (cancelled) return
      setState({
        loading: false,
        flagOn: true,
        available: result.rows.length > 0,
        indexable: result.indexable,
        total: result.total,
      })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [citySlug])

  return state
}
