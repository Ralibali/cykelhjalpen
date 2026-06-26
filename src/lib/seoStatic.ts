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
  sections?: { h2: string; body: string }[]
  faq?: { q: string; a: string }[]
  ogImage?: string
}

const today = () => new Date().toISOString().split('T')[0]
const siteUrlFor = (host: SiteHost) => (host === 'updro' ? UPDRO_SITE_URL : SITE_URL)
const absFor = (host: SiteHost, routePath: string) => `${siteUrlFor(host)}${routePath === '/' ? '/' : routePath}`
const clean = (value = '') => value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const trunc = (value: string, max = 155) => clean(value).length <= max ? clean(value) : `${clean(value).slice(0, max - 1).trim()}…`
const esc = (value = '') => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const imageFor = (host: SiteHost, image = '/og/default.jpg') => image.startsWith('http') ? image : `${siteUrlFor(host)}${image}`

const KEY_CYKEL_LINKS = [
  { label: 'Cykelverkstad i Linköping', href: '/cykelverkstad-linkoping' },
  { label: 'Cykelreparation i Linköping', href: '/cykelreparation-linkoping' },
  { label: 'Cykelservice i Linköping', href: '/cykelservice-linkoping' },
  { label: 'Punktering i Linköping', href: '/punktering-linkoping' },
  { label: 'Reparation av elcykel i Linköping', href: '/elcykel-reparation-linkoping' },
  { label: 'Vad kostar cykelreparation?', href: '/vad-kostar-cykelreparation-linkoping' },
]

const cykelIndexableRoutes = (): StaticSeoRoute[] => [
  {
    path: '/',
    title: 'Cykelhjälpen Linköping – jämför lokala cykelverkstäder',
    description: 'Beskriv felet på din cykel och jämför pris och tid från anslutna cykelverkstäder i Linköping. Gratis, utan konto och utan köpkrav.',
    h1: 'Jämför cykelverkstäder i Linköping',
    priority: 1,
    changefreq: 'weekly',
    lastmod: today(),
    ogImage: '/og/hem.jpg',
    sections: [
      { h2: 'Så fungerar Cykelhjälpen', body: 'Beskriv cykeln och problemet i ett kort formulär. Godkända verkstäder i Linköping kan därefter lämna pris, tid och kontaktuppgifter. Du väljer själv om du vill gå vidare.' },
      { h2: 'Gratis för dig som cyklist', body: 'Det kostar inget att skicka ett ärende och du behöver inte skapa konto. Det finns ingen skyldighet att välja någon av verkstäderna som svarar.' },
    ],
    links: [
      { label: 'Skicka cykelärende gratis', href: '/skicka-arende?stad=Link%C3%B6ping' },
      ...KEY_CYKEL_LINKS,
      { label: 'För cykelverkstäder', href: '/for-cykelverkstader' },
    ],
  },
  {
    path: '/for-cykelverkstader',
    title: 'Få fler kunder till din cykelverkstad i Linköping | Cykelhjälpen',
    description: 'Anslut din cykelverkstad i Linköping. Ingen månadsavgift, välj själv vilka lokala ärenden ni vill svara på och betala endast per skickad offert.',
    h1: 'Få fler lokala kunder till din cykelverkstad',
    priority: 0.8,
    changefreq: 'monthly',
    lastmod: today(),
    ogImage: '/og/for-cykelverkstader.jpg',
    sections: [
      { h2: 'Lokala och granskade förfrågningar', body: 'Cykelhjälpen förmedlar cykelärenden från personer i Linköpingsområdet. Ni väljer själva vilka jobb som passar verkstadens kompetens och kapacitet.' },
      { h2: 'Ingen månadsavgift', body: 'Registreringen är kostnadsfri. En leadavgift tas ut först när ni aktivt väljer att betala och skicka ett prisförslag till kunden.' },
      { h2: 'Ni behåller kundrelationen', body: 'När offerten skickats får kunden verkstadens kontaktuppgifter. Bokning, betalning för reparationen och fortsatt kontakt sker direkt mellan kunden och verkstaden.' },
    ],
    links: [
      { label: 'Registrera verkstaden gratis', href: '/registrera/verkstad' },
      { label: 'Se kundsidan', href: '/' },
      { label: 'Läs allmänna villkor', href: '/villkor' },
    ],
    faq: [
      { q: 'Kostar det att registrera verkstaden?', a: 'Nej. Registreringen har ingen månadsavgift. Kostnaden uppstår först när ni själva väljer att skicka en offert.' },
      { q: 'Måste vi svara på alla ärenden?', a: 'Nej. Ni väljer själva vilka förfrågningar som passar er kapacitet, kompetens och geografiska område.' },
      { q: 'Hur blir verkstaden godkänd?', a: 'Varje verkstad granskas manuellt innan den får tillgång till lokala kundärenden.' },
    ],
  },
  ...CYKEL_SEO_PAGES.map<StaticSeoRoute>((page) => ({
    path: `/${page.slug}`,
    title: page.title,
    description: trunc(page.description),
    h1: page.h1,
    priority: page.variant === 'price-stats' || page.slug === 'cykelverkstad-linkoping' ? 0.95 : 0.82,
    changefreq: page.variant === 'price-stats' ? 'weekly' : 'monthly',
    lastmod: today(),
    sections: page.sections,
    faq: page.faq,
    ogImage: page.ogImage,
    links: [
      { label: 'Skicka cykelärende gratis', href: '/skicka-arende?stad=Link%C3%B6ping' },
      ...KEY_CYKEL_LINKS.filter((link) => link.href !== `/${page.slug}`).slice(0, 5),
    ],
  })),
]

const CYKEL_NOINDEX_PATHS = [
  '/skicka-arende', '/registrera/verkstad', '/mitt-arende',
  '/integritetspolicy', '/villkor', '/cookies',
  '/publicera', '/byraer', '/priser', '/om-oss', '/artiklar', '/verktyg', '/stader',
  '/jamfor', '/hitta-webbyra', '/hitta-seo-byra', '/hitta-digital-byra',
  '/redaktionell-policy', '/metod', '/landing', '/landing/byra', '/sitemap',
  '/logga-in', '/registrera', '/registrera/byra', '/aterstall-losenord',
  '/updro', '/partna-alternativ',
  '/webbutveckling', '/ehandel', '/digital-marknadsforing', '/grafisk-design',
  '/seo', '/app-utveckling', '/mjukvaruutveckling', '/google-ads', '/ux-ui-design', '/ai-utveckling',
]

const UPDRO_INDEXABLE_PATHS = [
  '/', '/publicera', '/byraer', '/priser', '/om-oss', '/artiklar', '/verktyg',
  '/stader', '/jamfor', '/hitta-webbyra', '/hitta-seo-byra', '/hitta-digital-byra',
  '/redaktionell-policy', '/metod', '/partna-alternativ',
  '/webbutveckling', '/ehandel', '/digital-marknadsforing', '/grafisk-design',
  '/seo', '/app-utveckling', '/mjukvaruutveckling', '/google-ads', '/ux-ui-design', '/ai-utveckling',
  '/integritetspolicy', '/villkor', '/cookies',
]

const updroIndexableRoutes = (): StaticSeoRoute[] => UPDRO_INDEXABLE_PATHS.map((routePath) => ({
  path: routePath,
  title: 'Updro',
  description: '',
  h1: '',
  priority: routePath === '/' ? 1 : 0.6,
  changefreq: 'weekly' as const,
  lastmod: today(),
}))

const UPDRO_NOINDEX_PATHS = [
  '/skicka-arende', '/registrera/verkstad', '/for-cykelverkstader', '/mitt-arende',
  ...CYKEL_SEO_PAGES.map((page) => `/${page.slug}`),
  '/dashboard', '/admin', '/logga-in', '/registrera', '/aterstall-losenord',
]

const noindexRoutesFor = (paths: string[]): StaticSeoRoute[] => paths.map((routePath) => ({
  path: routePath,
  title: '',
  description: '',
  h1: '',
  priority: 0.1,
  changefreq: 'yearly' as const,
  noindex: true,
}))

const indexableFor = (host: SiteHost): StaticSeoRoute[] => host === 'updro' ? updroIndexableRoutes() : cykelIndexableRoutes()
const noindexFor = (host: SiteHost): StaticSeoRoute[] => noindexRoutesFor(host === 'updro' ? UPDRO_NOINDEX_PATHS : CYKEL_NOINDEX_PATHS)

export const getAllStaticSeoRoutes = (host: SiteHost = 'cykelhjalpen') => {
  const map = new Map<string, StaticSeoRoute>()
  for (const route of [...indexableFor(host), ...noindexFor(host)]) map.set(route.path, route)
  return [...map.values()]
}

export const getIndexableSeoRoutes = (host: SiteHost = 'cykelhjalpen') => getAllStaticSeoRoutes(host).filter((route) => !route.noindex)
export const getNoindexSeoRoutes = (host: SiteHost = 'cykelhjalpen') => getAllStaticSeoRoutes(host).filter((route) => route.noindex)

const urlset = (host: SiteHost, routes: StaticSeoRoute[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
    .map((route) => `  <url><loc>${absFor(host, route.path)}</loc><lastmod>${route.lastmod || today()}</lastmod><changefreq>${route.changefreq}</changefreq><priority>${route.priority.toFixed(1)}</priority></url>`)
    .join('\n')}\n</urlset>`

export const generateSitemapXml = (host: SiteHost = 'cykelhjalpen') => urlset(host, getIndexableSeoRoutes(host))
export const generateSectionSitemapXml = (_section: SitemapSection, host: SiteHost = 'cykelhjalpen') => generateSitemapXml(host)
export const generateSitemapIndexXml = (host: SiteHost = 'cykelhjalpen') =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${siteUrlFor(host)}/sitemap.xml</loc><lastmod>${today()}</lastmod></sitemap>\n</sitemapindex>`

const jsonLd = (host: SiteHost, route: StaticSeoRoute) => {
  const siteUrl = siteUrlFor(host)
  const url = absFor(host, route.path)
  const brandName = host === 'updro' ? 'Updro' : 'Cykelhjälpen'
  const graph: Record<string, unknown>[] = [
    { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: brandName, legalName: 'Aurora Media AB', url: siteUrl },
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, url: siteUrl, name: brandName, publisher: { '@id': `${siteUrl}/#organization` }, inLanguage: 'sv-SE' },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: route.title, headline: route.h1, description: route.description, isPartOf: { '@id': `${siteUrl}/#website` }, about: { '@id': `${siteUrl}/#organization` }, inLanguage: 'sv-SE' },
  ]

  if (host === 'cykelhjalpen') {
    graph.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name: route.path === '/for-cykelverkstader' ? 'Förmedling av kundförfrågningar till cykelverkstäder' : 'Jämför prisförslag på cykelreparation',
      provider: { '@id': `${siteUrl}/#organization` },
      areaServed: { '@type': 'City', name: 'Linköping' },
      serviceType: route.path === '/for-cykelverkstader' ? 'Leadförmedling för cykelverkstäder' : 'Förmedling av cykelreparation och cykelservice',
    })
  }

  if (route.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Cykelhjälpen', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: route.h1, item: url },
      ],
    })
  }

  if (route.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: route.faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
    })
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
}

const head = (host: SiteHost, route: StaticSeoRoute) => {
  const image = imageFor(host, route.ogImage)
  const url = absFor(host, route.path)
  return [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="sv_SE" />',
    `<meta property="og:site_name" content="${host === 'updro' ? 'Updro' : 'Cykelhjälpen'}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(route.title)}" />`,
    `<meta property="og:description" content="${esc(route.description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:alt" content="${esc(route.h1)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(route.title)}" />`,
    `<meta name="twitter:description" content="${esc(route.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<script type="application/ld+json" id="static-seo-jsonld">${jsonLd(host, route)}</script>`,
  ].join('\n    ')
}

const body = (route: StaticSeoRoute) => {
  const primaryHref = route.path === '/for-cykelverkstader' ? '/registrera/verkstad' : '/skicka-arende?stad=Link%C3%B6ping'
  const primaryLabel = route.path === '/for-cykelverkstader' ? 'Registrera verkstaden gratis' : 'Få prisförslag gratis'
  return `<main id="static-seo-content" data-static-route="${esc(route.path)}" class="container mx-auto max-w-3xl px-4 py-12"><nav aria-label="Brödsmulor"><a href="/">Cykelhjälpen</a></nav><article><header class="my-8"><h1>${esc(route.h1)}</h1><p>${esc(route.description)}</p><p><a href="${primaryHref}">${primaryLabel}</a></p></header>${
    route.sections?.map((section) => `<section><h2>${esc(section.h2)}</h2><p>${esc(section.body)}</p></section>`).join('') || ''
  }${
    route.links?.length ? `<section><h2>Relaterade sidor</h2><ul>${route.links.map((link) => `<li><a href="${esc(link.href)}">${esc(link.label)}</a></li>`).join('')}</ul></section>` : ''
  }${
    route.faq?.length ? `<section><h2>Vanliga frågor</h2>${route.faq.map((item) => `<article><h3>${esc(item.q)}</h3><p>${esc(item.a)}</p></article>`).join('')}</section>` : ''
  }</article></main>`
}

export const renderStaticHtml = (template: string, route: StaticSeoRoute, host: SiteHost = 'cykelhjalpen') => {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(route.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${absFor(host, route.path)}" />`)

  html = html
    .replace(/<meta property="og:[^>]+>\s*/g, '')
    .replace(/<meta name="twitter:[^>]+>\s*/g, '')
    .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/g, '')
    .replace('</head>', `    ${head(host, route)}\n  </head>`)

  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${body(route)}</div>`)
}
