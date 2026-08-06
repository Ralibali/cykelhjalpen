export const INDEX_ROBOTS_DIRECTIVE = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
export const NOINDEX_ROBOTS_DIRECTIVE = 'noindex, nofollow'

const PRIVATE_ROUTE_PREFIXES = [
  '/admin',
  '/dashboard',
  '/mitt-arende',
  '/avregistrera',
  '/annons/verkstad',
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

export const normalizeSeoPath = (pathname: string) => {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '')
  return path || '/'
}

const matchesPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

export const shouldNoindexPath = (pathname: string, configuredNoindexPaths: string[] = []) => {
  const path = normalizeSeoPath(pathname)
  const configured = new Set(configuredNoindexPaths.map(normalizeSeoPath))

  return configured.has(path)
    || PRIVATE_EXACT_ROUTES.includes(path)
    || PRIVATE_ROUTE_PREFIXES.some((prefix) => matchesPrefix(path, prefix))
}

export const getRobotsDirectiveForPath = (pathname: string, configuredNoindexPaths: string[] = []) =>
  shouldNoindexPath(pathname, configuredNoindexPaths)
    ? NOINDEX_ROBOTS_DIRECTIVE
    : INDEX_ROBOTS_DIRECTIVE
