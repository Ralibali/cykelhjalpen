/** Apex host for Cykelhjälpen auth callbacks. Never reflect window.location.origin. */
export const CYKELHJALPENS_SITE_ORIGIN = 'https://cykelhjalpen.se'

export function publicSiteOrigin(): string {
  return CYKELHJALPENS_SITE_ORIGIN
}
