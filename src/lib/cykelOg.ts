/**
 * Per-route Open Graph + Twitter image URLs for Cykelhjälpen.
 *
 * Each route gets its own pre-rendered 1200×630 JPG in /public/og/.
 * Returns absolute URLs (required by Facebook, LinkedIn, Slack, Twitter).
 */

const SITE_URL = 'https://cykelhjalpen.se'

const ROUTE_TO_SLUG: Record<string, string> = {
  '/': 'hem',
  '/skicka-arende': 'skicka-arende',
  '/for-cykelverkstader': 'for-cykelverkstader',
  '/registrera/verkstad': 'registrera-verkstad',
  '/integritetspolicy': 'integritetspolicy',
  '/villkor': 'villkor',
  '/cookies': 'cookies',
  '/cykelverkstad-linkoping': 'cykelverkstad-linkoping',
  '/cykelreparation-linkoping': 'cykelreparation-linkoping',
  '/punktering-linkoping': 'punktering-linkoping',
  '/cykelservice-linkoping': 'cykelservice-linkoping',
  '/elcykel-reparation-linkoping': 'elcykel-reparation-linkoping',
  '/cykelverkstad-innerstaden-linkoping': 'cykelverkstad-innerstaden-linkoping',
  '/cykelverkstad-ryd-linkoping': 'cykelverkstad-ryd-linkoping',
  '/cykelverkstad-vallastaden-linkoping': 'cykelverkstad-vallastaden-linkoping',
  '/mobil-cykelreparation-linkoping': 'mobil-cykelreparation-linkoping',
}

export const cykelOgImage = (path: string): string => {
  const clean = path.split('?')[0].replace(/\/$/, '') || '/'
  const slug = ROUTE_TO_SLUG[clean] ?? 'default'
  return `${SITE_URL}/og/${slug}.jpg`
}

export const cykelCanonical = (path: string): string => {
  const clean = path.split('?')[0]
  return `${SITE_URL}${clean === '' ? '/' : clean}`
}
