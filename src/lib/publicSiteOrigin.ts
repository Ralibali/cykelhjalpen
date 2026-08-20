export const CYKELHJALPENS_SITE_ORIGIN = 'https://cykelhjalpen.se'

const ALLOWED_ORIGINS = new Set([
  CYKELHJALPENS_SITE_ORIGIN,
  'https://www.cykelhjalpen.se',
])

const LOCAL_DEV_ORIGIN_RE = /^http:\/\/localhost(:\d+)?$/i

/** Origin for auth callbacks and other user-facing absolute URLs. Preview hosts pin to production. */
export function publicSiteOrigin(origin: string | null | undefined = typeof window === 'undefined' ? undefined : window.location.origin): string {
  if (origin && (ALLOWED_ORIGINS.has(origin) || LOCAL_DEV_ORIGIN_RE.test(origin))) return origin
  return CYKELHJALPENS_SITE_ORIGIN
}
