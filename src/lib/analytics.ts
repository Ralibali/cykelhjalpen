/**
 * Typesafe wrapper around Plausible Analytics.
 *
 * Plausible is loaded via a small gate in `index.html` that only injects the
 * script on the production domain (cykelhjalpen.se / www.cykelhjalpen.se).
 * On localhost, preview environments and any other host, `window.plausible` is
 * undefined and every call here becomes a silent no-op.
 *
 * IMPORTANT (privacy):
 * - Never pass PII, free text, e-mail, phone, IDs or city+ärende-kombinationer.
 * - Only low-cardinality properties are allowed (see `AllowedProp`).
 */

export type PlausibleEventName =
  | 'Repair Request Started'
  | 'Repair Request Submitted'
  | 'Workshop Signup Completed'
  | 'Offer Submitted'
  | 'Offer Accepted'

/** Whitelist of low-cardinality property keys we allow through to Plausible. */
type AllowedProp = 'city' | 'bike_type' | 'source' | 'user_type'

export type PlausibleProps = Partial<Record<AllowedProp, string>>

type PlausibleFn = (
  event: PlausibleEventName | 'pageview',
  options?: { props?: Record<string, string | number | boolean> }
) => void

declare global {
  interface Window {
    plausible?: PlausibleFn & { q?: unknown[] }
  }
}

function sanitize(props?: PlausibleProps): Record<string, string> | undefined {
  if (!props) return undefined
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    const str = String(value).trim()
    if (!str) continue
    // Hard length cap to avoid accidentally leaking long free-text values.
    out[key] = str.slice(0, 60)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function trackEvent(event: PlausibleEventName, props?: PlausibleProps): void {
  if (typeof window === 'undefined') return
  const plausible = window.plausible
  if (typeof plausible !== 'function') return
  try {
    const cleaned = sanitize(props)
    plausible(event, cleaned ? { props: cleaned } : undefined)
  } catch {
    // Analytics must never break the app.
  }
}
