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
  redirects?: { source: string; destination: string; permanent?: boolean }[]
  rewrites?: { source: string; destination: string }[]
  headers?: HeaderRule[]
}

const vercel = JSON.parse(
  readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as VercelConfig

const rewriteSource = vercel.rewrites?.[0]?.source ?? ''
const spaFallback = new RegExp(`^${rewriteSource}$`)

function shouldSpaRewrite(path: string): boolean {
  return spaFallback.test(path)
}

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

  it('301-redirects leftover workshop aliases to the live pages', () => {
    const redirects = vercel.redirects ?? []
    const bySource = new Map(redirects.map((rule) => [rule.source, rule]))

    expect(bySource.get('/for-verkstader')).toMatchObject({
      destination: '/for-cykelverkstader',
      permanent: true,
    })
    expect(bySource.get('/en/for-verkstader')).toMatchObject({
      destination: '/en/for-bike-shops',
      permanent: true,
    })
    expect(bySource.get('/en/for-cykelverkstader')).toMatchObject({
      destination: '/en/for-bike-shops',
      permanent: true,
    })
  })

  it('rewrites client routes to /index.html', () => {
    expect(vercel.rewrites).toHaveLength(1)
    expect(vercel.rewrites?.[0]?.destination).toBe('/index.html')
    expect(shouldSpaRewrite('/')).toBe(true)
    expect(shouldSpaRewrite('/logga-in')).toBe(true)
    expect(shouldSpaRewrite('/dashboard')).toBe(true)
    expect(shouldSpaRewrite('/dashboard/leads')).toBe(true)
    expect(shouldSpaRewrite('/mitt-arende/abc')).toBe(true)
    expect(shouldSpaRewrite('/registrera/verkstad')).toBe(true)
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
      expect(shouldSpaRewrite(path), path).toBe(false)
    }
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
    for (const path of ['/admin', '/admin/users', '/dashboard', '/dashboard/leads', '/logga-in', '/registrera', '/aterstall-losenord']) {
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

  it('leaves Lovable Netlify files in place for rollback', () => {
    const headers = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf8')
    const redirects = readFileSync(resolve(process.cwd(), 'public/_redirects'), 'utf8')
    expect(headers).toContain('X-Frame-Options: DENY')
    expect(headers).toContain('/sitemap.xml')
    expect(redirects).toContain('/sitemap.xml')
    expect(redirects).toContain('/robots.txt')
    expect(redirects).toMatch(/\/for-verkstader\s+\/for-cykelverkstader\s+301/)
    expect(redirects).toMatch(/\/en\/for-verkstader\s+\/en\/for-bike-shops\s+301/)
    expect(redirects.indexOf('/for-verkstader')).toBeLessThan(redirects.indexOf('/*'))
    expect(redirects.indexOf('/sitemap.xml')).toBeLessThan(redirects.indexOf('/*'))
    expect(redirects).toMatch(/\/\*\s+\/index\.html\s+200/)
  })
})
