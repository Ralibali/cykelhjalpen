import { describe, expect, it } from 'vitest'
import { CYKEL_SEO_PAGES, isThinSeoFarmPage, seoPageHref } from './cykelSeoPages'
import { CYKEL_CITIES, cityLandingPath } from './cykelCities'
import { generateSitemapXml, getAllStaticSeoRoutes, getIndexableSeoRoutes, getNoindexSeoRoutes, renderStaticHtml } from './seoStatic'

// Slugs som redan är indexerade i Google — får ALDRIG ändras.
const LEGACY_LINKOPING_SLUGS = [
  'cykelverkstad-linkoping',
  'cykelreparation-linkoping',
  'punktering-linkoping',
  'cykelservice-linkoping',
  'elcykel-reparation-linkoping',
  'cykelverkstad-innerstaden-linkoping',
  'cykelverkstad-ryd-linkoping',
  'cykelverkstad-vallastaden-linkoping',
  'mobil-cykelreparation-linkoping',
  'cykelverkstad-lambohov-linkoping',
  'cykelverkstad-ekholmen-linkoping',
  'cykelverkstad-skaggetorp-linkoping',
  'cykelverkstad-tannefors-linkoping',
  'cykelverkstad-berga-linkoping',
  'cykelverkstad-tallboda-linkoping',
  'cykelverkstad-ljungsbro-linkoping',
  'cykelverkstad-sturefors-linkoping',
  'cykelverkstad-malmslatt-linkoping',
  'vaxeljustering-linkoping',
  'bromsservice-linkoping',
  'kedjebyte-linkoping',
  'dackbyte-cykel-linkoping',
  'hjul-och-ekrar-linkoping',
  'cykelmontering-linkoping',
  'varservice-cykel-linkoping',
  'vad-kostar-cykelreparation-linkoping',
]

describe('Cykelhjälpen SEO-konfiguration', () => {
  it('har unika detaljerade SEO-sluggar', () => {
    const slugs = CYKEL_SEO_PAGES.map((page) => page.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('bevarar alla indexerade Linköping-sluggar (får ej ändras)', () => {
    const existing = new Set(CYKEL_SEO_PAGES.map((page) => page.slug))
    for (const legacy of LEGACY_LINKOPING_SLUGS) {
      expect(existing, `saknar indexerad slug: ${legacy}`).toContain(legacy)
    }
  })

  it('har exakt fyra aktiva städer med unika sluggar', () => {
    expect(CYKEL_CITIES.map((city) => city.name)).toEqual(['Linköping', 'Norrköping', 'Uppsala', 'Lund'])
    expect(new Set(CYKEL_CITIES.map((city) => city.slug)).size).toBe(CYKEL_CITIES.length)
  })

  it('inkluderar alla indexerbara sidor i sitemap', () => {
    const routes = getIndexableSeoRoutes('cykelhjalpen')
    const sitemap = generateSitemapXml('cykelhjalpen')

    for (const route of routes) {
      const expectedUrl = route.path === '/'
        ? 'https://cykelhjalpen.se/'
        : `https://cykelhjalpen.se${route.path}`
      expect(sitemap).toContain(`<loc>${expectedUrl}</loc>`)
    }
  })

  it('indexerar en unik landningssida för varje stad', () => {
    const indexablePaths = getIndexableSeoRoutes('cykelhjalpen').map((route) => route.path)

    for (const city of CYKEL_CITIES) {
      expect(indexablePaths).toContain(cityLandingPath(city.name))
    }
  })

  it('kopplar varje prerenderad SEO-sida till rätt stad', () => {
    const routes = getAllStaticSeoRoutes('cykelhjalpen')
    const byPath = new Map(routes.map((route) => [route.path, route]))
    const cityHubPaths = new Set(CYKEL_CITIES.map((city) => cityLandingPath(city.name)))

    for (const page of CYKEL_SEO_PAGES) {
      const path = `/${page.slug}`
      const route = byPath.get(path)

      expect(route, `saknar statisk SEO-route: ${path}`).toBeDefined()
      expect(route?.city, `fel stad på ${path}`).toBe(page.city)
      expect(Boolean(route?.noindex), `fel noindex på ${path}`).toBe(Boolean(page.noindex))

      if (!cityHubPaths.has(path)) {
        expect(route?.links).toEqual(expect.arrayContaining([
          {
            label: `Skicka cykelärende i ${page.city}`,
            href: `/skicka-arende?stad=${encodeURIComponent(page.city)}`,
          },
          {
            label: `Cykelverkstad i ${page.city}`,
            href: cityLandingPath(page.city),
          },
        ]))
      }
    }
  })

  it('noindexar Lund/Uppsala-distrikt och tjänstefarmar men behåller stadshubbar indexerbara', () => {
    const indexable = new Set(getIndexableSeoRoutes('cykelhjalpen').map((route) => route.path))
    const noindex = new Set(getNoindexSeoRoutes('cykelhjalpen').map((route) => route.path))
    const sitemap = generateSitemapXml('cykelhjalpen')

    const farmPages = CYKEL_SEO_PAGES.filter(isThinSeoFarmPage)
    expect(farmPages.length).toBeGreaterThan(20)

    for (const page of farmPages) {
      const sv = seoPageHref(page, 'sv')
      const en = seoPageHref(page, 'en')
      expect(page.noindex, `farm ska vara noindex: ${page.slug}`).toBe(true)
      expect(noindex.has(sv), `saknas i noindex: ${sv}`).toBe(true)
      expect(noindex.has(en), `saknas i noindex: ${en}`).toBe(true)
      expect(indexable.has(sv), `ska inte vara indexbar: ${sv}`).toBe(false)
      expect(indexable.has(en), `ska inte vara indexbar: ${en}`).toBe(false)
      expect(sitemap).not.toContain(`<loc>https://cykelhjalpen.se${sv}</loc>`)
      expect(sitemap).not.toContain(`<loc>https://cykelhjalpen.se${en}</loc>`)
    }

    for (const hub of ['/cykelverkstad-lund', '/cykelverkstad-uppsala', '/en/bike-repair-lund', '/en/bike-repair-uppsala']) {
      expect(indexable.has(hub), `hub ska vara indexbar: ${hub}`).toBe(true)
      expect(noindex.has(hub), `hub ska inte noindexas: ${hub}`).toBe(false)
      expect(sitemap).toContain(`<loc>https://cykelhjalpen.se${hub}</loc>`)
    }

    expect(indexable.has('/')).toBe(true)
    expect(indexable.has('/cykelverkstad-linkoping')).toBe(true)
    expect(indexable.has('/en/bike-repair-linkoping')).toBe(true)
    expect(indexable.has('/for-cykelverkstader')).toBe(true)
    expect(indexable.has('/registrera/verkstad')).toBe(true)
    expect(indexable.has('/en/for-bike-shops')).toBe(true)
    expect(sitemap).toContain('<loc>https://cykelhjalpen.se/</loc>')
    expect(sitemap).toContain('<loc>https://cykelhjalpen.se/cykelverkstad-linkoping</loc>')

    // The committed public/sitemap.xml was removed (it drifted stale at 104 URLs
    // while the build generates 108). The build-time generated sitemap is the
    // single source of truth — assert on it directly instead.
    expect(sitemap).toContain('<loc>https://cykelhjalpen.se/cykelverkstad-lund</loc>')
    expect(sitemap).toContain('<loc>https://cykelhjalpen.se/cykelverkstad-uppsala</loc>')
    expect(sitemap).toContain('<loc>https://cykelhjalpen.se/cykelverkstad-linkoping</loc>')
    expect(sitemap).toContain('<loc>https://cykelhjalpen.se/</loc>')
    const sitemapUrlCount = (sitemap.match(/<url>/g) || []).length
    expect(sitemapUrlCount).toBeGreaterThan(100)

    const norrkopingFarms = CYKEL_SEO_PAGES.filter((page) =>
      page.city === 'Norrköping' && page.slug !== 'cykelverkstad-norrkoping')
    expect(norrkopingFarms.length).toBeGreaterThan(5)
    for (const page of norrkopingFarms) {
      expect(page.noindex).toBeFalsy()
      expect(indexable.has(seoPageHref(page, 'sv'))).toBe(true)
      expect(indexable.has(seoPageHref(page, 'en'))).toBe(true)
      expect(sitemap).toContain(`<loc>https://cykelhjalpen.se${seoPageHref(page, 'sv')}</loc>`)
      expect(sitemap).toContain(`<loc>https://cykelhjalpen.se${seoPageHref(page, 'en')}</loc>`)
    }
  })

  it('indexerar verkstadssidan, formuläret, registrering och juridiska sidor men inte privata kundsidor', () => {
    const indexablePaths = getIndexableSeoRoutes('cykelhjalpen').map((route) => route.path)
    const noindexPaths = getNoindexSeoRoutes('cykelhjalpen').map((route) => route.path)

    expect(indexablePaths).toContain('/for-cykelverkstader')
    expect(indexablePaths).toContain('/skicka-arende')
    expect(indexablePaths).toContain('/registrera/verkstad')
    expect(indexablePaths).toContain('/integritetspolicy')
    expect(indexablePaths).toContain('/villkor')
    expect(indexablePaths).toContain('/cookies')
    expect(noindexPaths).not.toContain('/registrera/verkstad')
    expect(noindexPaths).toContain('/mitt-arende')
    expect(noindexPaths).toContain('/avregistrera')
    expect(noindexPaths).toContain('/annons/verkstad')
  })

  it('ger varje engelsk SEO-sida en svensk hreflang-motsvarighet', () => {
    const routes = getAllStaticSeoRoutes('cykelhjalpen')
    const svPaths = new Set(routes.filter((r) => r.lang !== 'en').map((r) => r.path))
    const enRoutes = routes.filter((r) => r.lang === 'en' && r.altPath)

    expect(enRoutes.length).toBeGreaterThan(80)
    for (const route of enRoutes) {
      expect(svPaths.has(route.altPath!), `saknar svensk motsvarighet: ${route.path}`).toBe(true)
    }
  })


  it('har inga dubbla URL:er i sitemap', () => {
    const sitemap = generateSitemapXml('cykelhjalpen')
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('generateSitemapXml(cykelhjalpen) returnerar välformad XML utan att kasta', () => {
    let sitemap = ''
    expect(() => {
      sitemap = generateSitemapXml('cykelhjalpen')
    }).not.toThrow()

    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(sitemap.trimEnd().endsWith('</urlset>')).toBe(true)

    const parsed = new DOMParser().parseFromString(sitemap, 'application/xml')
    expect(parsed.querySelector('parsererror')).toBeNull()

    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
    expect(urls.length).toBeGreaterThan(20)
    expect(urls).toEqual(expect.arrayContaining([
      'https://cykelhjalpen.se/',
      'https://cykelhjalpen.se/skicka-arende',
      'https://cykelhjalpen.se/for-cykelverkstader',
      'https://cykelhjalpen.se/registrera/verkstad',
      'https://cykelhjalpen.se/cykelverkstad-linkoping',
      'https://cykelhjalpen.se/integritetspolicy',
      'https://cykelhjalpen.se/villkor',
      'https://cykelhjalpen.se/cookies',
      'https://cykelhjalpen.se/en',
      'https://cykelhjalpen.se/en/submit-request',
      'https://cykelhjalpen.se/en/for-bike-shops',
    ]))

    for (const url of urls) {
      expect(url.startsWith('https://cykelhjalpen.se')).toBe(true)
      expect(url).not.toContain('updro.se')
    }

    expect(sitemap).not.toContain('updro.se')
    expect(sitemap).not.toContain('/mitt-arende')
    expect(sitemap).not.toContain('/annons/')
    expect(sitemap).not.toContain('/dashboard')
    expect(sitemap).not.toContain('/admin')
    expect(sitemap).not.toContain('/logga-in')
  })

  it('låter Updro-sitemap vara oförändrat Updro-innehåll', () => {
    const sitemap = generateSitemapXml('updro')
    expect(sitemap).toContain('https://updro.se/')
    expect(sitemap).toContain('https://updro.se/publicera')
    expect(sitemap).not.toContain('cykelhjalpen.se')
    expect(sitemap).not.toContain('/skicka-arende')
  })

  it('låser inte Linköping på generiska kund- och verkstadsingångar', () => {
    const routes = getIndexableSeoRoutes('cykelhjalpen')
    const generic = ['/', '/skicka-arende', '/for-cykelverkstader', '/en', '/en/submit-request', '/en/for-bike-shops']

    for (const path of generic) {
      const route = routes.find((item) => item.path === path)
      expect(route, `saknar SEO-route: ${path}`).toBeDefined()
      const locked = (route?.links || []).some((link) => /stad=linkoping|stad=Linköping/i.test(link.href))
      expect(locked, `${path} ska inte prefill:a Linköping`).toBe(false)
    }

    const workshop = routes.find((item) => item.path === '/for-cykelverkstader')
    const workshopEn = routes.find((item) => item.path === '/en/for-bike-shops')
    expect(JSON.stringify(workshop?.sections)).not.toMatch(/skicka en offert/)
    expect(JSON.stringify(workshopEn?.sections)).not.toMatch(/when you send a quote/)
    expect(workshopEn?.description).not.toMatch(/when you send a quote/)

    const home = routes.find((item) => item.path === '/')
    expect(JSON.stringify(home?.sections)).toContain('Gratis för cyklisten')
    expect(JSON.stringify(home?.sections)).toContain('Aurora Media AB')
    expect(JSON.stringify(workshop?.sections)).toContain('50 kr exkl. moms')
    expect(JSON.stringify(home?.sections)).not.toMatch(/jojoscykel|hundratals|lovable\.app|vercel\.app/i)
    expect(JSON.stringify(workshop?.sections)).not.toMatch(/jojoscykel|hundratals|lovable\.app|vercel\.app/i)
  })

  it('ger Norrköping en ärlig first-byte-titel utan att ändra brödtext eller Linköping', () => {
    const routes = getAllStaticSeoRoutes('cykelhjalpen')
    const norrkoping = routes.find((route) => route.path === '/cykelverkstad-norrkoping')
    const linkoping = routes.find((route) => route.path === '/cykelverkstad-linkoping')
    const norrkopingEn = routes.find((route) => route.path === '/en/bike-repair-norrkoping')

    expect(norrkoping, 'saknar Norrköping-hub').toBeDefined()
    expect(linkoping, 'saknar Linköping-hub').toBeDefined()

    expect(norrkoping?.title).toBe('Cykelverkstad Norrköping – tillgänglighet beror på aktiva partners')
    expect(norrkoping?.title.toLowerCase()).not.toMatch(/^(jämför|prisförslag)/)
    expect(norrkoping?.title).not.toMatch(/jämför|prisförslag/i)
    expect(norrkoping?.title).not.toMatch(/\d+\s+(verkstad|verkstäder|partners?)/i)

    expect(norrkoping?.h1).toBe('Cykelverkstad i Norrköping')
    expect(norrkoping?.description).toBe(
      'Behöver du cykelverkstad i Norrköping? Beskriv problemet gratis. Anslutna verkstäder kan svara med pris och möjlig tid när de har kapacitet.',
    )
    expect(norrkoping?.sections).toEqual([
      {
        h2: 'Cykelhjälp i Norrköping',
        body: 'Campus Norrköping, Resecentrum och de täta stadsdelarna gör cykeln till ett naturligt transportmedel. Ange område eller postnummer så kan verkstaden själv bedöma avstånd och möjlig tid.',
      },
      {
        h2: 'Aktuell tillgänglighet',
        body: 'Cykelhjälpen finns i Norrköping. Tillgängligheten beror på vilka partnerverkstäder som är aktiva när ärendet skickas.',
      },
      {
        h2: 'Vanliga cykeljobb',
        body: 'Punktering, däck, bromsar, växlar, kedja, hjul, service och elcykelproblem är exempel på jobb du kan beskriva.',
      },
    ])

    expect(linkoping?.title).toBe('Cykelverkstad Linköping – jämför lokala prisförslag')
    expect(norrkopingEn?.title).toBe('Bike shop Norrköping — compare local replies')

    const template = '<!doctype html><html><head><title>x</title><meta name="description" content="x" /><meta name="robots" content="index" /><link rel="canonical" href="https://example.com/" /></head><body><div id="root"></div></body></html>'
    const html = renderStaticHtml(template, norrkoping!, 'cykelhjalpen')
    expect(html).toMatch(/<title>Cykelverkstad Norrköping – tillgänglighet beror på aktiva partners<\/title>/)
    expect(html).toMatch(/<meta property="og:title" content="Cykelverkstad Norrköping – tillgänglighet beror på aktiva partners" \/>/)
    expect(html).not.toMatch(/<title>[^<]*(jämför|prisförslag)/i)
    expect(html).toContain('Anslutna verkstäder kan svara med pris och möjlig tid när de har kapacitet.')
  })
})
