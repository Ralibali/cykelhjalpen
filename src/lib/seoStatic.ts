import { CYKEL_SEO_PAGES } from './cykelSeoPages'

export const SITE_URL = 'https://cykelhjalpen.se'
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
const abs = (path: string) => `${SITE_URL}${path === '/' ? '/' : path}`
const clean = (value = '') => value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const trunc = (value: string, max = 155) => clean(value).length <= max ? clean(value) : `${clean(value).slice(0, max - 1).trim()}…`
const esc = (value = '') => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Cykelhjälpen — indexable routes
const indexableRoutes = (): StaticSeoRoute[] => [
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
  {
    path: '/skicka-arende',
    title: 'Skicka cykelärende – få upp till fem offerter | Cykelhjälpen',
    description: 'Beskriv felet på cykeln på två minuter och få upp till fem offerter från lokala cykelverkstäder i Linköping. Gratis och utan konto.',
    h1: 'Skicka ditt cykelärende',
    priority: 0.95,
    changefreq: 'weekly',
    lastmod: today(),
  },
  {
    path: '/registrera/verkstad',
    title: 'Registrera din cykelverkstad | Cykelhjälpen',
    description: 'Anslut din cykelverkstad till Cykelhjälpen och få relevanta lokala leads i Linköping. Betala endast per skickad offert.',
    h1: 'Registrera din cykelverkstad',
    priority: 0.7,
    changefreq: 'monthly',
    lastmod: today(),
  },
  {
    path: '/for-cykelverkstader',
    title: 'För cykelverkstäder – så fungerar Cykelhjälpen',
    description: 'Få lokala leads från cyklister i Linköping. Betala 50 kr exkl. moms per skickad offert. Inga abonnemang.',
    h1: 'För cykelverkstäder',
    priority: 0.8,
    changefreq: 'monthly',
    lastmod: today(),
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
  { path: '/integritetspolicy', title: 'Integritetspolicy | Cykelhjälpen', description: 'Så hanterar Cykelhjälpen personuppgifter, cookies och dataskydd.', h1: 'Integritetspolicy', priority: 0.3, changefreq: 'yearly', lastmod: today() },
  { path: '/villkor', title: 'Allmänna villkor | Cykelhjälpen', description: 'Villkor för att använda Cykelhjälpen som cyklist och som ansluten cykelverkstad.', h1: 'Allmänna villkor', priority: 0.3, changefreq: 'yearly', lastmod: today() },
  { path: '/cookies', title: 'Cookiepolicy | Cykelhjälpen', description: 'Information om hur Cykelhjälpen använder cookies och liknande tekniker.', h1: 'Cookiepolicy', priority: 0.3, changefreq: 'yearly', lastmod: today() },
]

// Legacy Updro routes that should be noindexed if they happen to render
const NOINDEX_PATHS = [
  '/publicera', '/byraer', '/priser', '/om-oss', '/artiklar', '/verktyg', '/stader',
  '/jamfor', '/hitta-webbyra', '/hitta-seo-byra', '/hitta-digital-byra',
  '/redaktionell-policy', '/metod', '/landing', '/landing/byra', '/sitemap',
  '/logga-in', '/registrera', '/registrera/byra', '/aterstall-losenord',
  '/updro', '/partna-alternativ',
  // Updro pillars
  '/webbutveckling', '/ehandel', '/digital-marknadsforing', '/grafisk-design',
  '/seo', '/app-utveckling', '/mjukvaruutveckling', '/google-ads', '/ux-ui-design', '/ai-utveckling',
]

const noindexRoutes = (): StaticSeoRoute[] => NOINDEX_PATHS.map((path) => ({
  path,
  title: 'Cykelhjälpen',
  description: '',
  h1: '',
  priority: 0.1,
  changefreq: 'yearly' as const,
  noindex: true,
}))

export const getAllStaticSeoRoutes = () => {
  const map = new Map<string, StaticSeoRoute>()
  for (const route of [...indexableRoutes(), ...noindexRoutes()]) map.set(route.path, route)
  return [...map.values()]
}

export const getIndexableSeoRoutes = () => getAllStaticSeoRoutes().filter((r) => !r.noindex)
export const getNoindexSeoRoutes = () => getAllStaticSeoRoutes().filter((r) => r.noindex)

const urlset = (routes: StaticSeoRoute[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map((r) => `  <url><loc>${abs(r.path)}</loc><lastmod>${r.lastmod || today()}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority.toFixed(1)}</priority></url>`)
    .join('\n')}\n</urlset>`

export const generateSitemapXml = () => urlset(getIndexableSeoRoutes())
export const generateSectionSitemapXml = (_s: SitemapSection) => generateSitemapXml()
export const generateSitemapIndexXml = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE_URL}/sitemap.xml</loc><lastmod>${today()}</lastmod></sitemap>\n</sitemapindex>`

const jsonLd = (route: StaticSeoRoute) =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'Cykelhjälpen', legalName: 'Aurora Media AB', url: SITE_URL },
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: 'Cykelhjälpen', publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: 'sv-SE' },
      { '@type': 'WebPage', '@id': `${abs(route.path)}#webpage`, url: abs(route.path), name: route.title, headline: route.h1, description: route.description, inLanguage: 'sv-SE' },
      ...(route.faq?.length
        ? [{ '@type': 'FAQPage', mainEntity: route.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }]
        : []),
    ],
  }).replace(/</g, '\\u003c')

const head = (route: StaticSeoRoute) =>
  [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`,
    `<link rel="canonical" href="${abs(route.path)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${abs(route.path)}" />`,
    `<meta property="og:title" content="${esc(route.title)}" />`,
    `<meta property="og:description" content="${esc(route.description)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(route.title)}" />`,
    `<meta name="twitter:description" content="${esc(route.description)}" />`,
    `<script type="application/ld+json">${jsonLd(route)}</script>`,
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

export const renderStaticHtml = (template: string, route: StaticSeoRoute) => {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(route.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${abs(route.path)}" />`)
  html = html
    .replace(/<meta property="og:[^>]+>\n?/g, '')
    .replace(/<meta name="twitter:[^>]+>\n?/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
  html = html.replace('</head>', `    ${head(route)}\n  </head>`)
  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${body(route)}</div>`)
}
