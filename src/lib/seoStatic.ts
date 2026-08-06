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
  /** Language version of this URL. Defaults to Swedish. */
  lang?: 'sv' | 'en'
  /** Path of the same page in the other language (used for hreflang alternates). */
  altPath?: string
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

const cityLandingPaths = new Set(CYKEL_CITIES.map((city) => cityLandingPath(city.name)))

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

const detailedCykelPages = CYKEL_SEO_PAGES.filter((page) => !cityLandingPaths.has(`/${page.slug}`))

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
  {
    path: '/skicka-arende',
    title: 'Skicka cykelärende gratis | Cykelhjälpen',
    description: 'Beskriv problemet på två minuter och jämför prisförslag från lokala cykelverkstäder. Gratis och utan konto.',
    h1: 'Skicka ditt cykelärende gratis',
    priority: 0.9,
    changefreq: 'monthly',
    lastmod: today(),
    ogImage: '/og/hem.jpg',
    sections: [
      { h2: 'Så går det till', body: 'Välj stad, beskriv cykeln och problemet och lämna dina kontaktuppgifter. Anslutna verkstäder svarar med pris och tid.' },
      { h2: 'Gratis och utan konto', body: 'Det kostar inget och du har ingen köpplikt. Du får en personlig länk till ärendet via e-post.' },
    ],
    links: [...cityLinks, { label: 'För cykelverkstäder', href: '/for-cykelverkstader' }],
    faq: [
      { q: 'Vad kostar det?', a: 'Det är gratis för dig som cyklist.' },
      { q: 'Hur många svar får jag?', a: 'Upp till fem verkstäder kan svara med pris och tid.' },
    ],
  },
  ...cityRoutes(),
  ...detailedCykelPages.map<StaticSeoRoute>((page) => {
    const cityPath = cityLandingPath(page.city)
    return {
      path: `/${page.slug}`,
      title: page.title,
      description: trunc(page.description),
      h1: page.h1,
      city: page.city,
      priority: page.variant === 'price-stats' ? 0.9 : 0.78,
      changefreq: page.variant === 'price-stats' ? 'weekly' : 'monthly',
      lastmod: today(),
      sections: page.sections,
      faq: page.faq,
      ogImage: page.ogImage,
      links: [
        { label: `Skicka cykelärende i ${page.city}`, href: `/skicka-arende?stad=${encodeURIComponent(page.city)}` },
        { label: `Cykelverkstad i ${page.city}`, href: cityPath },
        ...cityLinks.filter((link) => link.href !== cityPath),
      ],
    }
  }),
]

// ============ English versions of the commercially important pages ============
// Real, separately indexable URLs under /en/ — written for international students
// and newcomers. Key message: free, no account needed, compare up to 5 quotes.

const enCityLinks = CYKEL_CITIES.map((city) => ({
  label: `Bike repair in ${city.name}`,
  href: `/en/bike-repair-${city.slug}`,
}))

const englishRoutes = (): StaticSeoRoute[] => [
  {
    path: '/en',
    altPath: '/',
    lang: 'en',
    title: 'Bike repair in Sweden – compare local bike shops | Cykelhjälpen',
    description: 'Free and no account needed. Describe your bike problem and compare up to 5 quotes from local bike shops in Linköping, Norrköping, Uppsala and Lund.',
    h1: 'Compare local bike shops in Sweden',
    priority: 0.95,
    changefreq: 'weekly',
    lastmod: today(),
    ogImage: '/og/hem.jpg',
    sections: [
      { h2: 'How it works', body: 'Choose your city, describe your bike and the problem, and leave your contact details. Local bike shops reply with a price and how long the repair takes.' },
      { h2: 'Free, no account needed', body: 'Sending a request is free and you never have to accept a quote. You get a personal link to your request by email.' },
      { h2: 'Made for students and newcomers', body: 'You can write your request in English. The bike shop sees that you want the answer in English.' },
    ],
    links: [
      { label: 'Get free quotes', href: '/en/submit-request' },
      ...enCityLinks,
      { label: 'For bike shops', href: '/en/for-bike-shops' },
    ],
    faq: [
      { q: 'What does it cost?', a: 'It is free for you as a cyclist and there is no obligation to buy.' },
      { q: 'Do I need an account?', a: 'No. You send the request and get a personal link by email.' },
      { q: 'How many quotes do I get?', a: 'Up to 5 local bike shops can reply with a price and a time.' },
    ],
  },
  {
    path: '/en/submit-request',
    altPath: '/skicka-arende',
    lang: 'en',
    title: 'Get free bike repair quotes | Cykelhjälpen',
    description: 'Describe your bike problem in two minutes and compare up to 5 quotes from local bike shops in Sweden. Free, no account needed.',
    h1: 'Send your bike repair request for free',
    priority: 0.9,
    changefreq: 'monthly',
    lastmod: today(),
    ogImage: '/og/hem.jpg',
    sections: [
      { h2: 'Two minutes, no account', body: 'Tell us the type of bike, what is wrong and where you live. You do not need to create an account.' },
      { h2: 'Compare up to 5 quotes', body: 'Local bike shops in your city reply with a price and how long the repair takes. You choose if you want to go ahead.' },
      { h2: 'Answers in English', body: 'When you send the request in English, the bike shop sees that you expect an answer in English.' },
    ],
    links: [...enCityLinks, { label: 'For bike shops', href: '/en/for-bike-shops' }],
    faq: [
      { q: 'Is it really free?', a: 'Yes. Sending a request costs nothing and you never have to accept a quote.' },
      { q: 'What happens after I send it?', a: 'We review the request and send it to local bike shops. You get a personal link by email.' },
    ],
  },
  {
    path: '/en/for-bike-shops',
    altPath: '/for-cykelverkstader',
    lang: 'en',
    title: 'Get more customers to your bike shop | Cykelhjälpen',
    description: 'Join with your bike shop in Linköping, Norrköping, Uppsala or Lund. No monthly fee — you only pay when you send a quote.',
    h1: 'Get more local customers to your bike shop',
    priority: 0.7,
    changefreq: 'monthly',
    lastmod: today(),
    ogImage: '/og/for-cykelverkstader.jpg',
    sections: [
      { h2: 'Local, reviewed requests', body: 'We send bike repair requests from people in the city where your shop works.' },
      { h2: 'No monthly fee', body: 'Registration is free. You pay a lead fee only when you choose to send a quote.' },
      { h2: 'You keep the customer', body: 'After you send a quote, the customer gets your contact details and books directly with you.' },
    ],
    links: [{ label: 'Register your bike shop for free', href: '/registrera/verkstad' }, ...enCityLinks],
    faq: [
      { q: 'Does it cost anything to register?', a: 'No. There is no monthly fee.' },
      { q: 'Do we have to answer every request?', a: 'No. You choose which requests you want to answer.' },
    ],
  },
  ...CYKEL_CITIES.map<StaticSeoRoute>((city) => ({
    path: `/en/bike-repair-${city.slug}`,
    altPath: cityLandingPath(city.name),
    lang: 'en',
    title: `Bike repair in ${city.name} – compare local bike shops | Cykelhjälpen`,
    description: `Free and no account needed. Describe your bike problem and compare up to 5 quotes from local bike shops in ${city.name}.`,
    h1: `Bike repair in ${city.name}`,
    city: city.name,
    priority: 0.85,
    changefreq: 'weekly',
    lastmod: today(),
    ogImage: '/og/hem.jpg',
    sections: [
      { h2: `Local bike shops in ${city.name}`, body: `We cover ${city.areas}. Add your area or postal code so the bike shops can judge the distance and possible pick-up.` },
      { h2: 'Common repairs', body: 'Local bike shops can help with punctures, tyres, brakes, gears, chain, wheels, full service and electric bike problems.' },
      { h2: 'Free, no account needed', body: 'Sending a request is free and you decide if you want to accept any of the quotes.' },
    ],
    links: [
      { label: `Get quotes in ${city.name}`, href: `/en/submit-request?stad=${city.slug}` },
      ...enCityLinks.filter((link) => link.href !== `/en/bike-repair-${city.slug}`),
      { label: 'For bike shops', href: '/en/for-bike-shops' },
    ],
    faq: [
      { q: `What does a bike repair in ${city.name} cost?`, a: 'The price depends on the repair. You compare up to 5 quotes for free before you decide.' },
      { q: 'Can I write in English?', a: 'Yes. The bike shop sees that you want the answer in English.' },
    ],
  })),
]



const CYKEL_NOINDEX_PATHS = [
  '/registrera/verkstad', '/mitt-arende', '/avregistrera', '/annons/verkstad',
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

const indexableFor = (host: SiteHost): StaticSeoRoute[] => host === 'updro'
  ? updroIndexableRoutes()
  : [...cykelIndexableRoutes(), ...englishRoutes()]
const noindexFor = (host: SiteHost): StaticSeoRoute[] => noindexRoutesFor(host === 'updro' ? UPDRO_NOINDEX_PATHS : CYKEL_NOINDEX_PATHS)

export const getAllStaticSeoRoutes = (host: SiteHost = 'cykelhjalpen') => {
  const map = new Map<string, StaticSeoRoute>()
  for (const route of [...indexableFor(host), ...noindexFor(host)]) map.set(route.path, route)
  // Link Swedish routes back to their English counterpart so both sides emit hreflang.
  for (const route of map.values()) {
    if (route.lang === 'en' && route.altPath) {
      const swedish = map.get(route.altPath)
      if (swedish) map.set(route.altPath, { ...swedish, altPath: route.path, lang: 'sv' })
    }
  }
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
  const pageLang = route.lang === 'en' ? 'en' : 'sv-SE'
  const siteUrl = siteUrlFor(host)
  const url = absFor(host, route.path)
  const brandName = host === 'updro' ? 'Updro' : 'Cykelhjälpen'
  const areaServed = route.city
    ? { '@type': 'City', name: route.city }
    : CYKEL_CITIES.map((city) => ({ '@type': 'City', name: city.name }))

  const graph: Record<string, unknown>[] = [
    { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: brandName, legalName: 'Aurora Media AB', url: siteUrl },
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, url: siteUrl, name: brandName, publisher: { '@id': `${siteUrl}/#organization` }, inLanguage: 'sv-SE' },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: route.title, headline: route.h1, description: route.description, isPartOf: { '@id': `${siteUrl}/#website` }, inLanguage: pageLang },
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

const alternateLinks = (host: SiteHost, route: StaticSeoRoute) => {
  if (!route.altPath) return []
  const isEnglish = route.lang === 'en'
  const svUrl = absFor(host, isEnglish ? route.altPath : route.path)
  const enUrl = absFor(host, isEnglish ? route.path : route.altPath)
  return [
    `<link rel="alternate" hreflang="sv" href="${svUrl}" />`,
    `<link rel="alternate" hreflang="en" href="${enUrl}" />`,
    `<link rel="alternate" hreflang="x-default" href="${svUrl}" />`,
  ]
}

const head = (host: SiteHost, route: StaticSeoRoute) => {
  const image = imageFor(host, route.ogImage)
  const url = absFor(host, route.path)
  const isEnglish = route.lang === 'en'
  return [
    ...alternateLinks(host, route),
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}" />`,
    `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`,
    `<link rel="canonical" href="${url}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:locale" content="${isEnglish ? 'en_US' : 'sv_SE'}" />`,
    `<meta property="og:locale:alternate" content="${isEnglish ? 'sv_SE' : 'en_US'}" />`,
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
  if (route.lang === 'en') return englishBody(route)
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

const englishBody = (route: StaticSeoRoute) => {
  const primaryHref = route.path === '/en/for-bike-shops'
    ? '/registrera/verkstad'
    : route.city
      ? `/en/submit-request?stad=${encodeURIComponent(route.city)}`
      : '/en/submit-request'
  const primaryLabel = route.path === '/en/for-bike-shops' ? 'Register your bike shop for free' : 'Get free quotes'
  return `<main id="static-seo-content" data-static-route="${esc(route.path)}" lang="en"><nav><a href="/en">Cykelhjälpen</a></nav><article><h1>${esc(route.h1)}</h1><p>${esc(route.description)}</p><p><a href="${primaryHref}">${primaryLabel}</a></p>${
    route.sections?.map((section) => `<section><h2>${esc(section.h2)}</h2><p>${esc(section.body)}</p></section>`).join('') || ''
  }${
    route.links?.length ? `<section><h2>Related pages</h2><ul>${route.links.map((link) => `<li><a href="${esc(link.href)}">${esc(link.label)}</a></li>`).join('')}</ul></section>` : ''
  }${
    route.faq?.length ? `<section><h2>Frequently asked questions</h2>${route.faq.map((item) => `<article><h3>${esc(item.q)}</h3><p>${esc(item.a)}</p></article>`).join('')}</section>` : ''
  }</article></main>`
}

export const renderStaticHtml = (template: string, route: StaticSeoRoute, host: SiteHost = 'cykelhjalpen') => {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(route.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*"\s*\/?>/, `<meta name="robots" content="${route.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>\s*/g, '')

  html = html
    .replace(/<link rel="alternate"[^>]+>\s*/g, '')
    .replace(/<meta property="og:[^>]+>\s*/g, '')
    .replace(/<meta name="twitter:[^>]+>\s*/g, '')
    .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/g, '')
    .replace('</head>', `    ${head(host, route)}\n  </head>`)

  if (route.lang === 'en') {
    html = html
      .replace(/<html lang="[^"]*"/, '<html lang="en"')
      .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><main style="padding:2rem;font-family:system-ui,sans-serif"><h2>Cykelhjälpen — compare local bike shops</h2><p>Free and no account needed. Describe your bike problem and compare up to 5 quotes from local bike shops.</p><p><a href="/en/submit-request">Get free quotes</a> · <a href="/en/bike-repair-linkoping">Linköping</a> · <a href="/en/bike-repair-norrkoping">Norrköping</a> · <a href="/en/bike-repair-uppsala">Uppsala</a> · <a href="/en/bike-repair-lund">Lund</a> · <a href="/en/for-bike-shops">For bike shops</a></main></noscript>`)
  }

  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${body(route)}</div>`)
}
