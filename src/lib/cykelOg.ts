/**
 * Per-route Open Graph + Twitter image URLs for Cykelhjälpen.
 *
 * Each route gets its own pre-rendered 1200×630 JPG in /public/og/.
 * Returns absolute URLs (required by Facebook, LinkedIn, Slack, Twitter).
 *
 * Used by the build-time prerender (seoStaticBase.ts) and by the client-side
 * Helmet tags (CykelSeoPageV5.tsx) so served HTML and hydrated DOM agree.
 */

import { getCykelCity } from './cykelCities'

const SITE_URL = 'https://cykelhjalpen.se'

/** Routes with a dedicated image in /public/og/ (verified to exist on disk). */
const ROUTE_TO_SLUG: Record<string, string> = {
  '/': 'hem',
  '/skicka-arende': 'skicka-arende',
  '/for-cykelverkstader': 'for-cykelverkstader',
  '/registrera/verkstad': 'registrera-verkstad',
  '/integritetspolicy': 'integritetspolicy',
  '/villkor': 'villkor',
  '/cookies': 'cookies',
  '/cykelverkstad-linkoping': 'cykelverkstad-linkoping',
  '/cykelverkstad-norrkoping': 'stad-norrkoping',
  '/cykelverkstad-uppsala': 'stad-uppsala',
  '/cykelverkstad-lund': 'stad-lund',
  '/cykelreparation-linkoping': 'cykelreparation-linkoping',
  '/punktering-linkoping': 'punktering-linkoping',
  '/cykelservice-linkoping': 'cykelservice-linkoping',
  '/elcykel-reparation-linkoping': 'elcykel-reparation-linkoping',
  '/elsparkcykel-reparation-linkoping': 'elsparkcykel-reparation',
  '/cykelverkstad-innerstaden-linkoping': 'cykelverkstad-innerstaden-linkoping',
  '/cykelverkstad-ryd-linkoping': 'cykelverkstad-ryd-linkoping',
  '/cykelverkstad-vallastaden-linkoping': 'cykelverkstad-vallastaden-linkoping',
  '/mobil-cykelreparation-linkoping': 'mobil-cykelreparation-linkoping',
}

/** Relative /og/<slug>.jpg path for a known route, or null when none is dedicated. */
export const cykelOgImagePath = (path: string): string | null => {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/'
  const slug = ROUTE_TO_SLUG[clean]
  return slug ? `/og/${slug}.jpg` : null
}

/**
 * Resolves the OG image for a programmatic SEO page (service/district per city).
 * Order: explicit page override → dedicated per-route image → per-city image.
 * Shared by prerender and client so the two never diverge.
 */
export const cykelPageOgImage = (page: { slug: string; city: string; ogImage?: string }): string =>
  page.ogImage
  ?? cykelOgImagePath(`/${page.slug}`)
  ?? `/og/stad-${getCykelCity(page.city).slug}.jpg`

export const cykelOgImage = (path: string): string =>
  `${SITE_URL}${cykelOgImagePath(path) ?? '/og/default.jpg'}`

export const cykelCanonical = (path: string): string => {
  const clean = path.split('?')[0]
  return `${SITE_URL}${clean === '' ? '/' : clean}`
}
