import { SEO_PAGES } from './seoData'
import { CITIES, SERVICE_CATEGORIES } from './seoCities'
import { COMPARISON_PAGES } from './seoComparisons'
import { ARTICLES } from './seoArticles'
import { TOOLS } from './seoTools'

export const SITE_URL = 'https://updro.se'
export type SitemapSection = 'main' | 'cities' | 'articles' | 'tools' | 'comparisons'
export const SITEMAP_SECTIONS: SitemapSection[] = ['main', 'cities', 'articles', 'tools', 'comparisons']

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
const words = (slug: string) => slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const esc = (value = '') => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const PRIMARY_CITIES = new Set(['stockholm', 'goteborg', 'malmo', 'uppsala', 'linkoping', 'vasteras', 'orebro', 'norrkoping', 'helsingborg', 'jonkoping', 'umea', 'lund'])
const PRIMARY_SERVICES = new Set(['webbutveckling', 'seo', 'ehandel', 'digital-marknadsforing', 'google-ads', 'ux-ui-design'])

export const shouldIndexCityService = (citySlug: string, serviceSlug: string) => {
  const city = CITIES.find(c => c.slug === citySlug)
  const service = SERVICE_CATEGORIES.find(s => s.slug === serviceSlug)
  return Boolean(city && service && clean(city.techDescription).length > 80 && clean(service.description).length > 120 && (PRIMARY_CITIES.has(city.slug) || PRIMARY_SERVICES.has(service.slug)))
}

const baseRoutes = (): StaticSeoRoute[] => [
  { path: '/', title: 'Updro – Jämför offerter från digitala byråer i Sverige', description: 'Beskriv ditt projekt och få upp till fem offerter från kvalitetssäkrade digitala byråer inom 24 timmar. Gratis och utan förpliktelser.', h1: 'Jämför offerter från digitala byråer', priority: 1, changefreq: 'daily', lastmod: today(), links: [{ label: 'Publicera uppdrag', href: '/publicera' }, { label: 'Hitta byråer', href: '/byraer' }, { label: 'Artiklar och guider', href: '/artiklar' }] },
  { path: '/publicera', title: 'Publicera uppdrag – få offerter från digitala byråer | Updro', description: 'Publicera ditt digitala projekt gratis och få relevanta offerter från kvalitetssäkrade byråer inom 24 timmar.', h1: 'Publicera ditt uppdrag och få offerter', priority: 0.9, changefreq: 'weekly', lastmod: today() },
  { path: '/byraer', title: 'Hitta digitala byråer i Sverige | Updro', description: 'Jämför kvalitetssäkrade webbyråer, SEO-byråer, e-handelsbyråer och digitala specialister i Sverige.', h1: 'Hitta rätt digital byrå', priority: 0.9, changefreq: 'weekly', lastmod: today() },
  { path: '/priser', title: 'Priser för digitala byråer – jämför offertnivåer | Updro', description: 'Se prisnivåer för webbutveckling, SEO, e-handel, annonsering och digital marknadsföring innan du jämför offerter.', h1: 'Priser för digitala byråtjänster', priority: 0.8, changefreq: 'weekly', lastmod: today() },
  { path: '/om-oss', title: 'Om Updro – marknadsplatsen för digitala uppdrag', description: 'Updro hjälper företag att hitta rätt digital byrå genom kostnadsfri offertmatchning och tydligare beslutsunderlag.', h1: 'Om Updro', priority: 0.6, changefreq: 'monthly', lastmod: today() },
  { path: '/artiklar', title: 'Artiklar och guider om digitala projekt | Updro', description: 'Guider om webb, SEO, e-handel, annonsering och digitala byråval för dig som ska köpa digitala tjänster.', h1: 'Artiklar och guider', priority: 0.8, changefreq: 'weekly', lastmod: today() },
  { path: '/verktyg', title: 'Gratis verktyg för digitala projekt | Updro', description: 'Kalkylatorer, mallar och beslutsstöd som hjälper dig planera och jämföra digitala projekt.', h1: 'Gratis verktyg', priority: 0.8, changefreq: 'weekly', lastmod: today() },
  { path: '/stader', title: 'Hitta digitala byråer per stad | Updro', description: 'Utforska digitala byråer per stad och jämför offerter från lokala och nationella specialister.', h1: 'Digitala byråer per stad', priority: 0.8, changefreq: 'weekly', lastmod: today() },
  { path: '/jamfor', title: 'Jämför byråer och alternativ | Updro', description: 'Oberoende jämförelser av byråer, plattformar och alternativ för digitala projekt.', h1: 'Jämför alternativ', priority: 0.8, changefreq: 'weekly', lastmod: today() },
  { path: '/hitta-webbyra', title: 'Hitta webbyrå – jämför offerter gratis | Updro', description: 'Hitta rätt webbyrå för hemsida, webbapp eller redesign. Jämför kvalitetssäkrade offerter gratis.', h1: 'Hitta webbyrå', priority: 0.9, changefreq: 'weekly', lastmod: today() },
  { path: '/hitta-seo-byra', title: 'Hitta SEO-byrå – jämför specialister | Updro', description: 'Jämför SEO-byråer inom teknisk SEO, content, lokal SEO och länkstrategi. Gratis offertmatchning.', h1: 'Hitta SEO-byrå', priority: 0.9, changefreq: 'weekly', lastmod: today() },
  { path: '/hitta-digital-byra', title: 'Hitta digital byrå – jämför offerter | Updro', description: 'Jämför digitala byråer inom webb, SEO, annonsering, e-handel, design och strategi.', h1: 'Hitta digital byrå', priority: 0.9, changefreq: 'weekly', lastmod: today() },
  { path: '/redaktionell-policy', title: 'Redaktionell policy | Updro', description: 'Så arbetar Updro med granskning, kvalitet och transparens i guider och jämförelser.', h1: 'Redaktionell policy', priority: 0.4, changefreq: 'monthly', lastmod: today() },
  { path: '/metod', title: 'Metod för jämförelser och guider | Updro', description: 'Läs hur Updro tar fram guider, jämförelser och rekommendationer för digitala projekt.', h1: 'Metod', priority: 0.4, changefreq: 'monthly', lastmod: today() },
  { path: '/integritetspolicy', title: 'Integritetspolicy | Updro', description: 'Så hanterar Updro personuppgifter, cookies och dataskydd.', h1: 'Integritetspolicy', priority: 0.3, changefreq: 'yearly' },
  { path: '/villkor', title: 'Villkor | Updro', description: 'Villkor för att använda Updros marknadsplats och offerttjänst.', h1: 'Villkor', priority: 0.3, changefreq: 'yearly' },
  { path: '/cookies', title: 'Cookiepolicy | Updro', description: 'Information om hur Updro använder cookies och liknande tekniker.', h1: 'Cookiepolicy', priority: 0.3, changefreq: 'yearly' },
]

const serviceRoutes = (): StaticSeoRoute[] => SEO_PAGES.flatMap((page: any) => [
  { path: `/${page.categorySlug}`, title: page.metaTitle, description: trunc(page.metaDesc || page.intro), h1: page.h1 || page.categoryName, priority: 0.9, changefreq: 'weekly', lastmod: today(), links: (page.subPages || []).slice(0, 8).map((s: any) => ({ label: s.h1 || s.title, href: `/${page.categorySlug}/${s.slug}` })), faq: (page.faq || []).slice(0, 5) },
  ...(page.subPages || []).map((sub: any) => ({ path: `/${page.categorySlug}/${sub.slug}`, title: sub.title || `${page.categoryName} ${words(sub.slug)} | Updro`, description: trunc(sub.metaDesc || sub.intro), h1: sub.h1 || `${page.categoryName} ${words(sub.slug)}`, priority: 0.7, changefreq: 'monthly' as const, lastmod: today(), links: [{ label: page.categoryName, href: `/${page.categorySlug}` }, ...((sub.relatedLinks || []).slice(0, 6))], faq: (sub.faq || []).slice(0, 5) }))
])

const cityRoutes = (): StaticSeoRoute[] => CITIES.flatMap((city: any) => {
  const serviceLinks = SERVICE_CATEGORIES.map((s: any) => ({ label: `${s.shortName || s.name} i ${city.name}`, href: `/byraer/${city.slug}/${s.slug}` }))
  return [
    { path: `/stader/${city.slug}`, title: `Digitala byråer i ${city.name} – jämför offerter | Updro`, description: trunc(`Hitta digitala byråer i ${city.name}. ${city.techDescription} Jämför offerter gratis och få svar inom 24 timmar.`), h1: `Digitala byråer i ${city.name}`, priority: 0.7, changefreq: 'weekly' as const, lastmod: today(), links: serviceLinks },
    { path: `/byraer/${city.slug}`, title: `Byråer i ${city.name} – webb, SEO och marknadsföring | Updro`, description: trunc(`Jämför byråer i ${city.name} inom webb, SEO, e-handel, annonsering och design. ${city.techDescription}`), h1: `Byråer i ${city.name}`, priority: 0.8, changefreq: 'weekly' as const, lastmod: today(), links: serviceLinks },
    ...SERVICE_CATEGORIES.map((service: any) => {
      const noindex = !shouldIndexCityService(city.slug, service.slug)
      const relatedServices = SERVICE_CATEGORIES.filter((s: any) => s.slug !== service.slug).slice(0, 5).map((s: any) => ({ label: `${s.name} i ${city.name}`, href: `/byraer/${city.slug}/${s.slug}` }))
      const relatedCities = CITIES.filter((c: any) => c.slug !== city.slug).slice(0, 5).map((c: any) => ({ label: `${service.name} i ${c.name}`, href: `/byraer/${c.slug}/${service.slug}` }))
      return { path: `/byraer/${city.slug}/${service.slug}`, title: `${service.name}-byrå i ${city.name} – jämför offerter | Updro`, description: trunc(`Hitta ${service.name.toLowerCase()}-byrå i ${city.name}. ${service.description} Lokal kontext: ${city.techDescription}`), h1: `${service.name}-byrå i ${city.name}`, priority: noindex ? 0.2 : 0.7, changefreq: 'monthly' as const, lastmod: today(), noindex, links: [...relatedServices, ...relatedCities], faq: [{ q: `Vad kostar ${service.name.toLowerCase()} i ${city.name}?`, a: 'Priset beror på omfattning, senioritet och leveransmodell. Jämför minst tre offerter för att få en rimlig nivå.' }, { q: `Måste byrån finnas i ${city.name}?`, a: 'Nej. Lokal närvaro kan vara värdefull, men många digitala projekt levereras effektivt på distans.' }] }
    })
  ]
})

const contentRoutes = (): StaticSeoRoute[] => [
  ...COMPARISON_PAGES.map((p: any) => ({ path: `/${p.slug}`, title: p.metaTitle || p.title || `${words(p.slug)} | Updro`, description: trunc(p.metaDesc || p.description || `Jämför ${words(p.slug)}.`), h1: p.h1 || p.title || words(p.slug), priority: 0.8, changefreq: 'monthly' as const, lastmod: today(), links: [{ label: 'Alla jämförelser', href: '/jamfor' }] })),
  ...ARTICLES.map((a: any) => ({ path: `/artiklar/${a.slug}`, title: a.metaTitle || a.title || `${words(a.slug)} | Updro`, description: trunc(a.metaDesc || a.excerpt || a.description || `Läs Updros guide om ${words(a.slug)}.`), h1: a.title || words(a.slug), priority: 0.7, changefreq: 'monthly' as const, lastmod: a.updatedDate || a.publishedDate || today(), links: [{ label: 'Alla artiklar', href: '/artiklar' }] })),
  ...TOOLS.map((t: any) => ({ path: `/verktyg/${t.slug}`, title: t.metaTitle || t.title || `${words(t.slug)} | Updro`, description: trunc(t.metaDesc || t.description || `Använd Updros kostnadsfria verktyg för ${words(t.slug)}.`), h1: t.h1 || t.title || words(t.slug), priority: 0.7, changefreq: 'monthly' as const, lastmod: today(), links: [{ label: 'Alla verktyg', href: '/verktyg' }] })),
]

export const getAllStaticSeoRoutes = () => {
  const map = new Map<string, StaticSeoRoute>()
  for (const route of [...baseRoutes(), ...serviceRoutes(), ...cityRoutes(), ...contentRoutes()]) map.set(route.path, route)
  return [...map.values()]
}

export const getIndexableSeoRoutes = () => getAllStaticSeoRoutes().filter(r => !r.noindex)
export const getNoindexSeoRoutes = () => getAllStaticSeoRoutes().filter(r => r.noindex)

const section = (path: string): SitemapSection => {
  if (path.startsWith('/artiklar/')) return 'articles'
  if (path.startsWith('/verktyg/')) return 'tools'
  if (path === '/jamfor' || path.includes('jamfor') || path.startsWith('/basta-') || path.includes('alternativ')) return 'comparisons'
  if (path.startsWith('/byraer/') || path.startsWith('/stader/')) return 'cities'
  return 'main'
}

const urlset = (routes: StaticSeoRoute[]) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(r => `  <url><loc>${abs(r.path)}</loc><lastmod>${r.lastmod || today()}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority.toFixed(1)}</priority></url>`).join('\n')}\n</urlset>`
export const generateSitemapXml = () => urlset(getIndexableSeoRoutes())
export const generateSectionSitemapXml = (s: SitemapSection) => {
  const routes = getIndexableSeoRoutes().filter(r => section(r.path) === s)
  return routes.length ? urlset(routes) : null
}
export const generateSitemapIndexXml = () => `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${SITEMAP_SECTIONS.filter(s => getIndexableSeoRoutes().some(r => section(r.path) === s)).map(s => `  <sitemap><loc>${SITE_URL}/sitemap-${s}.xml</loc><lastmod>${today()}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>`

const jsonLd = (route: StaticSeoRoute) => JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'Updro', legalName: 'Aurora Media AB', url: SITE_URL }, { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: 'Updro', publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: 'sv-SE' }, { '@type': 'WebPage', '@id': `${abs(route.path)}#webpage`, url: abs(route.path), name: route.title, headline: route.h1, description: route.description, inLanguage: 'sv-SE' }, ...(route.faq?.length ? [{ '@type': 'FAQPage', mainEntity: route.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : [])] }).replace(/</g, '\\u003c')

const head = (route: StaticSeoRoute) => [`<title>${esc(route.title)}</title>`, `<meta name="description" content="${esc(route.description)}" />`, `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`, `<link rel="canonical" href="${abs(route.path)}" />`, `<meta property="og:type" content="website" />`, `<meta property="og:url" content="${abs(route.path)}" />`, `<meta property="og:title" content="${esc(route.title)}" />`, `<meta property="og:description" content="${esc(route.description)}" />`, `<meta property="og:image" content="${SITE_URL}/og/og-default.png" />`, `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:title" content="${esc(route.title)}" />`, `<meta name="twitter:description" content="${esc(route.description)}" />`, `<script type="application/ld+json">${jsonLd(route)}</script>`].join('\n    ')

const body = (route: StaticSeoRoute) => `<main id="static-seo-content" data-static-route="${esc(route.path)}"><nav><a href="/">Hem</a></nav><h1>${esc(route.h1)}</h1><p>${esc(route.description)}</p>${route.links?.length ? `<section><h2>Relaterade sidor</h2><ul>${route.links.map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul></section>` : ''}${route.faq?.length ? `<section><h2>Vanliga frågor</h2>${route.faq.map(f => `<article><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></article>`).join('')}</section>` : ''}</main>`

export const renderStaticHtml = (template: string, route: StaticSeoRoute) => {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(route.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*"\s*\/>/, `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${abs(route.path)}" />`)
  html = html.replace(/<meta property="og:[^>]+>\n?/g, '').replace(/<meta name="twitter:[^>]+>\n?/g, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
  html = html.replace('</head>', `    ${head(route)}\n  </head>`)
  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${body(route)}</div>`)
}
