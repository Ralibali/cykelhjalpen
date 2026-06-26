import { CYKEL_SEO_PAGES } from './cykelSeoPages'
import { CYKEL_CITIES, cityLandingPath } from './cykelCities'
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
  city?: string
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

const cityLinks = CYKEL_CITIES.map((city) => ({
  label: `Cykelverkstad i ${city.name}`,
  href: cityLandingPath(city.name),
}))

const cityRoutes = (): StaticSeoRoute[] => CYKEL_CITIES.map((city) => ({
  path: cityLandingPath(city.name),
  title: `Cykelverkstad ${city.name} – jämför lokala prisförslag`,
  description: `Hitta cykelverkstad i ${city.name}. Beskriv problemet gratis och jämför pris och tid från anslutna verkstäder utan konto.`,
  h1: `Cykelverkstad i ${city.name}`,
  city: city.name,
  priority: 0.95,
  changefreq: 'weekly',
  lastmod: today(),
  ogImage: '/og/hem.jpg',
  sections: [
    {
      h2: `Lokal cykelhjälp i ${city.name}`,
      body: `Cykelhjälpen täcker bland annat ${city.areas}. Ange område eller postnummer så att verkstäderna kan bedöma avstånd och eventuell hämtning.`,
    },
    {
      h2: 'Vanliga cykeljobb',
      body: 'Anslutna verkstäder kan hjälpa till med punktering, däck, bromsar, växlar, kedja, hjul, service och elcykelproblem.',
    },
    {
      h2: 'Gratis och utan konto',
      body: 'Det kostar inget att skicka en förfrågan och du väljer själv om du vill gå vidare med något av svaren.',
    },
  ],
  links: [
    { label: `Skicka cykelärende i ${city.name}`, href: `/skicka-arende?stad=${encodeURIComponent(city.name)}` },
    ...cityLinks.filter((link) => link.href !== cityLandingPath(city.name)),
    { label: 'För cykelverkstäder', href: '/for-cykelverkstader' },
  ],
  faq: [
    { q: `Vad kostar det att skicka ett cykelärende i ${city.name}?`, a: 'Det är kostnadsfritt för cyklisten och det finns ingen köpplikt.' },
    { q: 'Behöver jag skapa konto?', a: 'Nej. Du skickar ärendet och får en personlig länk via e-post.' },
  ],
}))

const detailedCykelPages = CYKEL_SEO_PAGES.filter((page) => page.slug !== 'cykelverkstad-linkoping')

const cykelIndexableRoutes = (): StaticSeoRoute[] => [
  {
    path: '/',
    title: 'Cykelhjälpen – jämför lokala cykelverkstäder',
    description: 'Beskriv felet på din cykel och jämför pris och tid från anslutna cykelverkstäder i Linköping, Norrköping, Uppsala eller Lund.',
    h1: 'Jämför lokala cykelverkstäder',
    priority: 1,
    changefreq: 'weekly',
    lastmod: today(),
    ogImage: '/og/hem.jpg',
    sections: [
      { h2: 'Så fungerar Cykelhjälpen', body: 'Välj stad, beskriv cykeln och problemet och jämför sedan svar från anslutna verkstäder i den valda staden.' },
      { h2: 'Gratis för dig som cyklist', body: 'Det kostar inget att skicka ett ärende och du behöver inte skapa konto. Du väljer själv om du vill gå vidare.' },
    ],
    links: [
      { label: 'Skicka cykelärende gratis', href: '/skicka-arende' },
      ...cityLinks,
      { label: 'För cykelverkstäder', href: '/for-cykelverkstader' },
    ],
  },
  {
    path: '/for-cykelverkstader',
    title: 'Få fler kunder till din cykelverkstad | Cykelhjälpen',
    description: 'Anslut din cykelverkstad i Linköping, Norrköping, Uppsala eller Lund. Ingen månadsavgift och betalning endast per skickad offert.',
    h1: 'Få fler lokala kunder till din cykelverkstad',
    priority: 0.8,
    changefreq: 'monthly',
    lastmod: today(),
    ogImage: '/og/for-cykelverkstader.jpg',
    sections: [
      { h2: 'Lokala och granskade förfrågningar', body: 'Cykelhjälpen förmedlar cykelärenden från personer i den stad där verkstaden arbetar.' },
      { h2: 'Ingen månadsavgift', body: 'Registreringen är kostnadsfri. En leadavgift tas ut först när verkstaden aktivt väljer att skicka en offert.' },
      { h2: 'Ni behåller kundrelationen', body: 'När offerten skickats får kunden verkstadens kontaktuppgifter och fortsatt bokning sker direkt med verkstaden.' },
    ],
    links: [
      { label: 'Registrera verkstaden gratis', href: '/registrera/verkstad' },
      ...cityLinks,
    ],
    faq: [
      { q: 'Kostar det att registrera verkstaden?', a: 'Nej. Registreringen har ingen månadsavgift.' },
      { q: 'Måste vi svara på alla ärenden?', a: 'Nej. Verkstaden väljer själv vilka förfrågningar den vill svara på.' },
    ],
  },
  ...cityRoutes(),
  ...detailedCykelPages.map<StaticSeoRoute>((page) => ({
    path: `/${page.slug}`,
    title: page.title,
    description: trunc(page.description),
    h1: page.h1,
    city: 'Linköping',
    priority: page.variant === 'price-stats' ? 0.9 : 0.78,
    changefreq: page.variant === 'price-stats' ? 'weekly' : 'monthly',
    lastmod: today(),
    sections: page.sections,
    faq: page.faq,
    ogImage: page.ogImage,
    links: [
      { label: 'Skicka cykelärende i Linköping', href: '/skicka-arende?stad=Link%C3%B6ping' },
      { label: 'Cykelverkstad i Linköping', href: '/cykelverkstad-linkoping' },
      ...cityLinks.filter((link) => link.href !== '/cykelverkstad-linkoping'),
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
  ...CYKEL_CITIES.map((city) => cityLandingPath(city.name)),
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
  const areaServed = route.city
    ? { '@type': 'City', name: route.city }
    : CYKEL_CITIES.map((city) => ({ '@type': 'City', name: city.name }))

  const graph: Record<string, unknown>[] = [
    { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: brandName, legalName: 'Aurora Media AB', url: siteUrl },
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, url: siteUrl, name: brandName, publisher: { '@id': `${siteUrl}/#organization` }, inLanguage: 'sv-SE' },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: route.title, headline: route.h1, description: route.description, isPartOf: { '@id': `${siteUrl}/#website` }, inLanguage: 'sv-SE' },
  ]

  if (host === 'cykelhjalpen') {
    graph.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name: route.path === '/for-cykelverkstader' ? 'Förmedling av kundförfrågningar till cykelverkstäder' : 'Jämför prisförslag på cykelreparation',
      provider: { '@id': `${siteUrl}/#organization` },
      areaServed,
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
  const primaryHref = route.path === '/for-cykelverkstader'
    ? '/registrera/verkstad'
    : route.city
      ? `/skicka-arende?stad=${encodeURIComponent(route.city)}`
      : '/skicka-arende'
  const primaryLabel = route.path === '/for-cykelverkstader' ? 'Registrera verkstaden gratis' : 'Få prisförslag gratis'
  return `<main id="static-seo-content" data-static-route="${esc(route.path)}"><nav><a href="/">Cykelhjälpen</a></nav><article><h1>${esc(route.h1)}</h1><p>${esc(route.description)}</p><p><a href="${primaryHref}">${primaryLabel}</a></p>${
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
