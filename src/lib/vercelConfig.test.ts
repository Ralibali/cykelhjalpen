import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type HeaderRule = { source: string; headers: { key: string; value: string }[] }
type VercelConfig = {
  framework?: string
  installCommand?: string
  buildCommand?: string
  outputDirectory?: string
  bunVersion?: string
  trailingSlash?: boolean
  redirects?: { source: string; destination: string; statusCode?: number }[]
  rewrites?: { source: string; destination: string }[]
  headers?: HeaderRule[]
}

const vercel = JSON.parse(
  readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as VercelConfig

/**
 * Converts a vercel.json rewrite source to a JS RegExp with Vercel semantics
 * (named params with inline regex `:name(a|b)` are segment-anchored,
 * `:path*` matches zero or more trailing segments).
 */
const sourceToRegExp = (source: string) => {
  const converted = source
    .replace(/\/:path\*$/, '(?:/.*)?')
    .replace(/:(?:prefix|page)\(([^)]+)\)/g, '(?:$1)')
  return new RegExp(`^${converted}$`)
}

const rewriteMatchers = (vercel.rewrites ?? []).map((rule) => ({
  ...rule,
  test: (path: string) => sourceToRegExp(rule.source).test(path),
}))

/** Rewrites that target the SPA shell (dist/app.html). */
const appShellRewrite = (path: string) =>
  rewriteMatchers.some((rule) => rule.destination === '/app.html' && rule.test(path))

/** Any rewrite at all — a path with no matching rewrite and no dist file 404s. */
const anyRewrite = (path: string) => rewriteMatchers.some((rule) => rule.test(path))

function headerValues(path: string, key: string): string[] {
  return (vercel.headers ?? [])
    .filter((rule) => headerSourceMatches(rule.source, path))
    .flatMap((rule) => rule.headers.filter((h) => h.key === key).map((h) => h.value))
}

function headerSourceMatches(source: string, path: string): boolean {
  if (source === '/(.*)') return true
  if (source === path) return true
  if (source.endsWith('/:path*')) {
    const prefix = source.slice(0, -'/:path*'.length)
    return path === prefix || path.startsWith(`${prefix}/`)
  }
  if (source.endsWith('/(.*)')) {
    const prefix = source.slice(0, -'/(.*)'.length)
    return path === prefix || path.startsWith(`${prefix}/`)
  }
  const named = source.match(/^\/sitemap-:name\.xml$/)
  if (named) return /^\/sitemap-[^/]+\.xml$/.test(path)
  return false
}

describe('vercel.json (Vite SPA)', () => {
  it('uses Vite, Bun install/build, and dist output', () => {
    expect(vercel.framework).toBe('vite')
    expect(vercel.installCommand).toBe('bun install --frozen-lockfile')
    expect(vercel.buildCommand).toBe('bun run build')
    expect(vercel.outputDirectory).toBe('dist')
    expect(vercel.bunVersion).toBeUndefined()
  })

  it('normalizes trailing slashes with 308 at the edge', () => {
    expect(vercel.trailingSlash).toBe(false)
  })

  it('rewrites dynamic/gated client routes to the /app.html shell (not the homepage)', () => {
    expect(vercel.rewrites?.length).toBeGreaterThan(0)
    expect(vercel.rewrites?.every((rule) => rule.destination === '/app.html')).toBe(true)

    const appPaths = [
      '/logga-in', '/registrera', '/aterstall-losenord', '/nytt-losenord',
      '/dashboard', '/dashboard/leads', '/admin', '/admin/verkstader',
      '/mitt-arende/abc', '/mina-svar/abc', '/avregistrera/tok',
      '/annons/verkstad/linkoping', '/registrera/verkstad', '/registrera/byra',
      '/landing', '/landing/byra', '/sitemap',
      // Updro dynamic surfaces (shared vercel.json — must never 404)
      '/byraer/nisse-webb', '/byraer/linkoping/seo', '/artiklar/guide',
      '/verktyg/kalkyl', '/stader/linkoping', '/leveranser/webbutveckling',
      '/guider', '/guider/slug', '/kunskapsbank', '/support', '/updro-vs-partna',
      // V2 gated surfaces — client-rendered, must never hard-404 in prod
      '/verkstad/nagon-slug', '/avsluta-paminnelser/some-token',
      // English-basename variants
      '/en/mitt-arende/abc', '/en/logga-in', '/en/dashboard', '/en/admin/verkstader',
      '/en/integritetspolicy', '/en/villkor', '/en/cookies', '/en/registrera/verkstad',
      '/en/verkstad/nagon-slug', '/en/avsluta-paminnelser/some-token',
    ]
    for (const path of appPaths) {
      expect(appShellRewrite(path), path).toBe(true)
    }
  })

  it('gives unknown dotless URLs a real 404 (no SPA rewrite → dist/404.html)', () => {
    const junkPaths = [
      '/detta-finns-inte', '/nonexistent-page-xyz', '/guider-x',
      '/Cykelverkstad-Linkoping', '/PUNKTERING-LUND', '/adminxyz',
      '/registreraX', '/en/nonexistent', '/en/cykelverkstad-lund',
      '/cykelreparation-linkoping-extra',
    ]
    for (const path of junkPaths) {
      expect(anyRewrite(path), path).toBe(false)
    }
  })

  it('does not SPA-rewrite sitemaps, robots, assets, or files with extensions', () => {
    const staticPaths = [
      '/sitemap.xml',
      '/sitemap-index.xml',
      '/sitemap-main.xml',
      '/robots.txt',
      '/assets/index-abc.js',
      '/assets/style-def.css',
      '/placeholder.svg',
      '/llms.txt',
      '/ai.txt',
      '/index.html',
    ]
    for (const path of staticPaths) {
      expect(anyRewrite(path), path).toBe(false)
    }
  })

  it('redirects dead/duplicate entry points instead of serving them', () => {
    const redirects = vercel.redirects ?? []
    const bySource = new Map(redirects.map((rule) => [rule.source, rule]))
    expect(bySource.get('/index.html')?.destination).toBe('/')
    expect(bySource.get('/app.html')?.destination).toBe('/')
    expect(bySource.get('/404.html')?.destination).toBe('/')
    // Dead email-CTA link → request form (was a soft-404, would now hard-404)
    expect(bySource.get('/cykelreparation')?.destination).toBe('/skicka-arende')
    // Legacy EN-footer URLs (Swedish slugs under /en) → correct English twins
    expect(bySource.get('/en/cykelverkstad-lund')?.destination).toBe('/en/bike-repair-lund')
    expect(bySource.get('/en/vad-kostar-cykelreparation-linkoping')?.destination).toBe('/en/bike-repair-cost-linkoping')
    for (const rule of redirects) {
      expect(rule.statusCode).toBe(308)
    }
  })

  it('serves fingerprinted assets with immutable long-lived caching', () => {
    expect(headerValues('/assets/index-abc123.js', 'Cache-Control'))
      .toContain('public, max-age=31536000, immutable')
    expect(headerValues('/assets/style-def456.css', 'Cache-Control'))
      .toContain('public, max-age=31536000, immutable')
  })

  it('ports security, noindex, and sitemap headers from public/_headers', () => {
    const security = [
      ['X-Frame-Options', 'DENY'],
      ['X-Content-Type-Options', 'nosniff'],
      ['Referrer-Policy', 'strict-origin-when-cross-origin'],
      ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
    ] as const
    for (const [key, value] of security) {
      expect(headerValues('/', key)).toContain(value)
    }

    const noindex = 'noindex, nofollow, noarchive'
    for (const path of [
      '/admin', '/admin/users', '/dashboard', '/dashboard/leads',
      '/logga-in', '/registrera', '/aterstall-losenord', '/nytt-losenord',
      '/mitt-arende/abc', '/mina-svar/abc', '/avregistrera/tok', '/annons/verkstad/linkoping',
      '/avsluta-paminnelser/some-token',
    ]) {
      expect(headerValues(path, 'X-Robots-Tag')).toContain(noindex)
    }
    expect(headerValues('/registrera/verkstad', 'X-Robots-Tag')).not.toContain(noindex)

    for (const path of ['/sitemap.xml', '/sitemap-index.xml', '/sitemap-main.xml']) {
      expect(headerValues(path, 'Content-Type')).toContain('application/xml; charset=utf-8')
      expect(headerValues(path, 'Cache-Control')).toContain('public, max-age=3600')
    }
    expect(headerValues('/robots.txt', 'Content-Type')).toContain('text/plain; charset=utf-8')
    expect(headerValues('/robots.txt', 'Cache-Control')).toContain('public, max-age=3600')
  })

  it('ships a report-only CSP covering the app third-parties', () => {
    const csp = headerValues('/', 'Content-Security-Policy-Report-Only')[0] ?? ''
    for (const token of [
      'https://fonts.googleapis.com', 'https://fonts.gstatic.com',
      'https://plausible.io', 'https://www.googletagmanager.com',
      'https://*.supabase.co', 'https://challenges.cloudflare.com', 'https://js.stripe.com',
    ]) {
      expect(csp).toContain(token)
    }
  })

  it('disallows token URL spaces in robots.txt (crawl-budget guard)', () => {
    const robots = readFileSync(resolve(process.cwd(), 'public/robots.txt'), 'utf8')
    for (const prefix of ['/mitt-arende/', '/mina-svar/', '/avregistrera/', '/avsluta-paminnelser/', '/annons/']) {
      expect(robots, `robots.txt saknar Disallow: ${prefix}`).toContain(`Disallow: ${prefix}`)
    }
  })

  it('leaves Lovable Netlify files in place for rollback', () => {
    const headers = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf8')
    const redirects = readFileSync(resolve(process.cwd(), 'public/_redirects'), 'utf8')
    expect(headers).toContain('X-Frame-Options: DENY')
    expect(headers).toContain('/sitemap.xml')
    expect(redirects).toContain('/sitemap.xml')
    expect(redirects).toContain('/robots.txt')
    expect(redirects.indexOf('/sitemap.xml')).toBeLessThan(redirects.indexOf('/*'))
    expect(redirects).toMatch(/\/\*\s+\/index\.html\s+200/)
  })
})
