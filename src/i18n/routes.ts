/**
 * Mapping between Swedish (canonical) routes and their English counterparts.
 *
 * English pages live on real, separately indexable URLs under /en/<english-slug>.
 * The router runs with basename "/en" on English URLs, so the values below are the
 * *in-router* paths for the English version.
 */
import { CYKEL_SEO_PAGES } from '@/lib/cykelSeoPages'

export const EN_PREFIX = '/en'

const CORE_ROUTES: Record<string, string> = {
  '/': '/',
  '/skicka-arende': '/submit-request',
  '/for-cykelverkstader': '/for-bike-shops',
}

export const SV_TO_EN_ROUTES: Record<string, string> = {
  ...CORE_ROUTES,
  // Every local SEO page (city hubs, services and districts) has an English twin.
  ...Object.fromEntries(CYKEL_SEO_PAGES.map((p) => [`/${p.slug}`, `/${p.enSlug}`])),

}

export const EN_TO_SV_ROUTES: Record<string, string> = Object.fromEntries(
  Object.entries(SV_TO_EN_ROUTES).map(([sv, en]) => [en, sv]),
)

const normalize = (path: string) => {
  const clean = path.startsWith('/') ? path : `/${path}`
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean
}

/** Swedish in-router path -> English in-router path (null when no translated page exists). */
export const toEnglishPath = (svPath: string): string | null =>
  SV_TO_EN_ROUTES[normalize(svPath)] ?? null

/** English in-router path -> Swedish in-router path (null when unknown). */
export const toSwedishPath = (enPath: string): string | null =>
  EN_TO_SV_ROUTES[normalize(enPath)] ?? null

/** Absolute-from-origin URL path for the English version of a Swedish route. */
export const englishHref = (svPath: string): string => {
  const en = toEnglishPath(svPath)
  if (!en) return EN_PREFIX
  return en === '/' ? EN_PREFIX : `${EN_PREFIX}${en}`
}

/** All translated route pairs, as full site paths. */
export const TRANSLATED_ROUTE_PAIRS = Object.entries(SV_TO_EN_ROUTES).map(([sv, en]) => ({
  sv,
  en: en === '/' ? EN_PREFIX : `${EN_PREFIX}${en}`,
}))
