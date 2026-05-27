import { CYKEL_SEO_PAGES } from './cykelSeoPages'
import type { SiteHost } from './hostConfig'

export const SITE_URL = 'https://cykelhjalpen.se'
export const UPDRO_SITE_URL = 'https://updro.se'
export type SitemapSection = 'main'
export const SITEMAP_SECTIONS: SitemapSection[] = ['main']

export interface StaticSeoRoute {
  path: string
  title: string
  description: string
  h1: string
  priority: number
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  lastmod?: string
  noindex?: boolean
  links?: { label: string; href: string }[]
  faq?: { q: string; a: string }[]
}

const today = () => new Date().toISOString().split('T')[0]
const siteUrlFor = (host: SiteHost) => (host === 'updro' ? UPDRO_SITE_URL : SITE_URL)
const absFor = (host: SiteHost, path: string) => `${siteUrlFor(host)}${path === '/' ? '/' : path}`
const clean = (value = '') => value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const trunc = (value: string, max = 155) => clean(value).length <= max ? clean(value) : `${clean(value).slice(0, max - 1).trim()}…`
const esc = (value = '') => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// =====================================================
// Cykelhjälpen — indexable routes
// Per spec: ONLY "/" + the nine /cykelverkstad-*-linkoping variants.
// =====================================================
const cykelIndexableRoutes = (): StaticSeoRoute[] => [
  {
    path: '/',
    title: 'Cykelhjälpen Linköping – jämför priser från cykelverkstäder',
    description: 'Beskriv felet på din cykel och få upp till fem prisförslag från lokala cykelverkstäder i Linköping. Helt gratis och utan konto.',
    h1: 'Hitta rätt cykelverkstad i Linköping',
    priority: 1.0,
    changefreq: 'daily',
    lastmod: today(),
    links: [
      { label: 'Skicka cykelärende', href: '/skicka-arende' },
      { label: 'För cykelverkstäder', href: '/for-cykelverkstader' },
    ],
  },
  ...CYKEL_SEO_PAGES.map<StaticSeoRoute>((p) => ({
    path: `/${p.slug}`,
    title: p.title,
    description: trunc(p.description),
    h1: p.h1,
    priority: 0.85,
    changefreq: 'weekly',
    lastmod: today(),
    faq: p.faq,
  })),
]

// Paths that should be noindexed on the Cykelhjälpen host (legacy Updro paths
// plus Cykelhjälpen-specific private/legal pages we don't want in search).
const CYKEL_NOINDEX_PATHS = [
  // Cykelhjälpen private/legal
  '/skicka-arende', '/registrera/verkstad', '/for-cykelverkstader',
  '/mitt-arende', '/integritetspolicy', '/villkor', '/cookies',
  // Legacy Updro paths
  '/publicera', '/byraer', '/priser', '/om-oss', '/artiklar', '/verktyg', '/stader',
  '/jamfor', '/hitta-webbyra', '/hitta-seo-byra', '/hitta-digital-byra',
  '/redaktionell-policy', '/metod', '/landing', '/landing/byra', '/sitemap',
  '/logga-in', '/registrera', '/registrera/byra', '/aterstall-losenord',
  '/updro', '/partna-alternativ',
  '/webbutveckling', '/ehandel', '/digital-marknadsforing', '/grafisk-design',
  '/seo', '/app-utveckling', '/mjukvaruutveckling', '/google-ads', '/ux-ui-design', '/ai-utveckling',
]

// =====================================================
// Updro — indexable routes (legacy Updro surface kept intact)
// =====================================================
const UPDRO_INDEXABLE_PATHS = [
  '/', '/publicera', '/byraer', '/priser', '/om-oss', '/artiklar', '/verktyg',
  '/stader', '/jamfor', '/hitta-webbyra', '/hitta-seo-byra', '/hitta-digital-byra',
  '/redaktionell-policy', '/metod', '/partna-alternativ',
  '/webbutveckling', '/ehandel', '/digital-marknadsforing', '/grafisk-design',
  '/seo', '/app-utveckling', '/mjukvaruutveckling', '/google-ads', '/ux-ui-design', '/ai-utveckling',
  '/integritetspolicy', '/villkor', '/cookies',
]

const updroIndexableRoutes = (): StaticSeoRoute[] => UPDRO_INDEXABLE_PATHS.map((path) => ({
  path,
  title: 'Updro',
  description: '',
  h1: '',
  priority: path === '/' ? 1.0 : 0.6,
  changefreq: 'weekly' as const,
  lastmod: today(),
}))

// Paths noindexed on Updro host (Cykelhjälpen-only surface)
const UPDRO_NOINDEX_PATHS = [
  '/skicka-arende', '/registrera/verkstad', '/for-cykelverkstader', '/mitt-arende',
  ...CYKEL_SEO_PAGES.map((p) => `/${p.slug}`),
  '/dashboard', '/admin', '/logga-in', '/registrera', '/aterstall-losenord',
]

const noindexRoutesFor = (paths: string[]): StaticSeoRoute[] => paths.map((path) => ({
  path,
  title: '',
  description: '',
  h1: '',
  priority: 0.1,
  changefreq: 'yearly' as const,
  noindex: true,
}))

// =====================================================
// Public API (host-aware, defaults to cykelhjalpen)
// =====================================================
const indexableFor = (host: SiteHost): StaticSeoRoute[] =>
  host === 'updro' ? updroIndexableRoutes() : cykelIndexableRoutes()

const noindexFor = (host: SiteHost): StaticSeoRoute[] =>
  noindexRoutesFor(host === 'updro' ? UPDRO_NOINDEX_PATHS : CYKEL_NOINDEX_PATHS)

export const getAllStaticSeoRoutes = (host: SiteHost = 'cykelhjalpen') => {
  const map = new Map<string, StaticSeoRoute>()
  for (const route of [...indexableFor(host), ...noindexFor(host)]) map.set(route.path, route)
  return [...map.values()]
}

export const getIndexableSeoRoutes = (host: SiteHost = 'cykelhjalpen') =>
  getAllStaticSeoRoutes(host).filter((r) => !r.noindex)
export const getNoindexSeoRoutes = (host: SiteHost = 'cykelhjalpen') =>
  getAllStaticSeoRoutes(host).filter((r) => r.noindex)

const urlset = (host: SiteHost, routes: StaticSeoRoute[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map((r) => `  <url><loc>${absFor(host, r.path)}</loc><lastmod>${r.lastmod || today()}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority.toFixed(1)}</priority></url>`)
    .join('\n')}\n</urlset>`

export const generateSitemapXml = (host: SiteHost = 'cykelhjalpen') =>
  urlset(host, getIndexableSeoRoutes(host))
export const generateSectionSitemapXml = (_s: SitemapSection, host: SiteHost = 'cykelhjalpen') =>
  generateSitemapXml(host)
export const generateSitemapIndexXml = (host: SiteHost = 'cykelhjalpen') =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${siteUrlFor(host)}/sitemap.xml</loc><lastmod>${today()}</lastmod></sitemap>\n</sitemapindex>`

const jsonLd = (host: SiteHost, route: StaticSeoRoute) =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${siteUrlFor(host)}/#organization`, name: host === 'updro' ? 'Updro' : 'Cykelhjälpen', legalName: 'Aurora Media AB', url: siteUrlFor(host) },
      { '@type': 'WebSite', '@id': `${siteUrlFor(host)}/#website`, url: siteUrlFor(host), name: host === 'updro' ? 'Updro' : 'Cykelhjälpen', publisher: { '@id': `${siteUrlFor(host)}/#organization` }, inLanguage: 'sv-SE' },
      { '@type': 'WebPage', '@id': `${absFor(host, route.path)}#webpage`, url: absFor(host, route.path), name: route.title, headline: route.h1, description: route.description, inLanguage: 'sv-SE' },
      ...(route.faq?.length
        ? [{ '@type': 'FAQPage', mainEntity: route.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }]
        : []),
    ],
  }).replace(/</g, '\\u003c')

const head = (host: SiteHost, route: StaticSeoRoute) =>
  [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`,
    `<link rel="canonical" href="${absFor(host, route.path)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${absFor(host, route.path)}" />`,
    `<meta property="og:title" content="${esc(route.title)}" />`,
    `<meta property="og:description" content="${esc(route.description)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(route.title)}" />`,
    `<meta name="twitter:description" content="${esc(route.description)}" />`,
    `<script type="application/ld+json">${jsonLd(host, route)}</script>`,
  ].join('\n    ')

const body = (route: StaticSeoRoute) =>
  `<main id="static-seo-content" data-static-route="${esc(route.path)}"><nav><a href="/">Hem</a></nav><h1>${esc(route.h1)}</h1><p>${esc(route.description)}</p>${
    route.links?.length
      ? `<section><h2>Relaterade sidor</h2><ul>${route.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul></section>`
      : ''
  }${
    route.faq?.length
      ? `<section><h2>Vanliga frågor</h2>${route.faq.map((f) => `<article><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></article>`).join('')}</section>`
      : ''
  }</main>`

export const renderStaticHtml = (template: string, route: StaticSeoRoute, host: SiteHost = 'cykelhjalpen') => {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(route.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${absFor(host, route.path)}" />`)
  html = html
    .replace(/<meta property="og:[^>]+>\n?/g, '')
    .replace(/<meta name="twitter:[^>]+>\n?/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
  html = html.replace('</head>', `    ${head(host, route)}\n  </head>`)
  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${body(route)}</div>`)
}
