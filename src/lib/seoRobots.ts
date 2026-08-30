export const INDEX_ROBOTS_DIRECTIVE = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
export const NOINDEX_ROBOTS_DIRECTIVE = 'noindex, nofollow'

const PRIVATE_ROUTE_PREFIXES = [
  '/admin',
  '/dashboard',
  '/mitt-arende',
  '/mina-svar',
  '/avregistrera',
  '/annons/verkstad',
]

/**
 * V2 S4 gated public surfaces (/verkstad/:slug profiler, /verkstader katalog).
 * Default noindex everywhere (flag v2.directory.public_profiles is OFF by
 * default and the G-D1 threshold is resolved at runtime). When the gate passes
 * the page's own Helmet robots tag flips to index — see
 * src/lib/v2/directory.ts and docs/v2/CONTRACTS.md §7.4.
 */
const V2_GATED_ROUTE_PREFIXES = [
  '/verkstad',
  '/verkstader',
]

const PRIVATE_EXACT_ROUTES = [
  '/logga-in',
  '/registrera',
  '/registrera/byra',
  '/aterstall-losenord',
  '/nytt-losenord',
  '/landing',
  '/landing/byra',
]

/** City hubs stay indexed. District + service farms in these cities do not. */
const INDEXABLE_CITY_HUB_PATHS = new Set([
  '/cykelverkstad-lund',
  '/cykelverkstad-uppsala',
  '/en/bike-repair-lund',
  '/en/bike-repair-uppsala',
  '/bike-repair-lund',
  '/bike-repair-uppsala',
])

const THIN_SEO_FARM_CITY_SUFFIXES = ['-lund', '-uppsala'] as const

export const normalizeSeoPath = (pathname: string) => {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '')
  return path || '/'
}

const matchesPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

/** Full site path for an in-router English path (basename `/en` is stripped by React Router). */
const withEnPrefix = (path: string) => {
  if (path === '/en' || path.startsWith('/en/')) return path
  return path === '/' ? '/en' : `/en${path}`
}

const slugFromSeoPath = (path: string) =>
  (path.startsWith('/en/') ? path.slice(4) : path.replace(/^\//, ''))

/** Lund/Uppsala district + service farms (SV + EN). City hubs are excluded. */
export const isThinSeoFarmPath = (pathname: string) => {
  const path = normalizeSeoPath(pathname)
  if (INDEXABLE_CITY_HUB_PATHS.has(path)) return false
  const slug = slugFromSeoPath(path)
  return THIN_SEO_FARM_CITY_SUFFIXES.some((suffix) => slug.endsWith(suffix))
}

export const shouldNoindexPath = (pathname: string, configuredNoindexPaths: string[] = []) => {
  const path = normalizeSeoPath(pathname)
  const configured = new Set(configuredNoindexPaths.map(normalizeSeoPath))

  return configured.has(path)
    || configured.has(withEnPrefix(path))
    || isThinSeoFarmPath(path)
    || PRIVATE_EXACT_ROUTES.includes(path)
    || PRIVATE_ROUTE_PREFIXES.some((prefix) => matchesPrefix(path, prefix))
    || V2_GATED_ROUTE_PREFIXES.some((prefix) => matchesPrefix(path, prefix))
}

export const getRobotsDirectiveForPath = (pathname: string, configuredNoindexPaths: string[] = []) =>
  shouldNoindexPath(pathname, configuredNoindexPaths)
    ? NOINDEX_ROBOTS_DIRECTIVE
    : INDEX_ROBOTS_DIRECTIVE
