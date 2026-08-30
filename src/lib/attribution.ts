// First-touch attribution capture (V2 extension, S6 data-moat).
//
// V1 kept attribution in sessionStorage only → email-driven return visits in a
// new tab/session were unattributed (dim02 §8). V2 additionally persists the
// FIRST-touch attribution in localStorage so UTM survives across the whole
// funnel (submit → lifecycle email → return visit days later → winner pick).
//
// Consent: this module is only called from consent-gated tracking code
// (usePageTracking runs captureAttribution only when hasAnalyticsConsent()).
// Storage here is first-party and holds no PII — UTM params, landing path,
// referrer origin only.
//
// Pure logic with injected storage so it is unit-testable (attribution.test.ts).

export const ATTRIBUTION_SESSION_KEY = '_cykel_attribution'
export const ATTRIBUTION_PERSISTENT_KEY = '_cykel_attribution_first'

export const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
] as const

export type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number]

export type Attribution = Partial<Record<AttributionParam, string>> & {
  landing_path?: string
  first_referrer?: string
  captured_at?: string
}

export interface AttributionStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Redact token URLs — view_token must never land in attribution (I3). */
export function sanitizeTrackingPath(pathname: string): string {
  if (/^\/mitt-arende\/[^/]+/i.test(pathname)) return '/mitt-arende/[redacted]'
  return (pathname || '/').slice(0, 1000)
}

export function sanitizeReferrer(value: string, origin?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (origin && url.origin === origin) {
      return `${url.origin}${sanitizeTrackingPath(url.pathname)}`
    }
    return url.origin
  } catch {
    return undefined
  }
}

function readKey(storage: AttributionStorage, key: string): Attribution {
  try {
    return JSON.parse(storage.getItem(key) || '{}') as Attribution
  } catch {
    storage.removeItem(key)
    return {}
  }
}

/**
 * Read the effective attribution: this session's capture wins; otherwise fall
 * back to the persisted first-touch from an earlier session.
 */
export function readAttribution(
  session: AttributionStorage,
  persistent?: AttributionStorage,
): Attribution {
  const fromSession = readKey(session, ATTRIBUTION_SESSION_KEY)
  if (Object.keys(fromSession).length > 0) return fromSession
  if (!persistent) return {}
  return readKey(persistent, ATTRIBUTION_PERSISTENT_KEY)
}

export interface CaptureAttributionInput {
  search: string
  pathname: string
  referrer?: string
  origin?: string
  now?: Date
}

/**
 * First-touch capture. If this session already has attribution it is kept.
 * The first capture ever seen (session OR persisted) is also written to the
 * persistent store so later sessions keep the original source.
 */
export function captureAttribution(
  input: CaptureAttributionInput,
  session: AttributionStorage,
  persistent?: AttributionStorage,
): Attribution {
  const existing = readAttribution(session, persistent)
  if (Object.keys(existing).length > 0) {
    // Backfill the session copy so trackClick attaches attribution immediately.
    if (Object.keys(readKey(session, ATTRIBUTION_SESSION_KEY)).length === 0) {
      try {
        session.setItem(ATTRIBUTION_SESSION_KEY, JSON.stringify(existing))
      } catch { /* storage full/blocked — attribution is best-effort */ }
    }
    return existing
  }

  const params = new URLSearchParams(input.search)
  const attribution: Attribution = {
    landing_path: sanitizeTrackingPath(input.pathname),
    first_referrer: sanitizeReferrer(input.referrer ?? '', input.origin),
    captured_at: (input.now ?? new Date()).toISOString(),
  }

  for (const key of ATTRIBUTION_PARAMS) {
    const value = params.get(key)?.trim()
    if (value) attribution[key] = value.slice(0, 300)
  }

  try {
    session.setItem(ATTRIBUTION_SESSION_KEY, JSON.stringify(attribution))
  } catch { /* best-effort */ }
  if (persistent) {
    try {
      persistent.setItem(ATTRIBUTION_PERSISTENT_KEY, JSON.stringify(attribution))
    } catch { /* best-effort */ }
  }
  return attribution
}
