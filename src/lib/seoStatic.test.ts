import { describe, expect, it } from 'vitest'
import { CYKEL_SEO_PAGES } from './cykelSeoPages'
import { CYKEL_CITIES, cityLandingPath } from './cykelCities'
import { generateSitemapXml, getIndexableSeoRoutes, getNoindexSeoRoutes } from './seoStatic'

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
    const routes = getIndexableSeoRoutes('cykelhjalpen')
    const byPath = new Map(routes.map((route) => [route.path, route]))
    const cityHubPaths = new Set(CYKEL_CITIES.map((city) => cityLandingPath(city.name)))

    for (const page of CYKEL_SEO_PAGES) {
      const path = `/${page.slug}`
      const route = byPath.get(path)

      expect(route, `saknar statisk SEO-route: ${path}`).toBeDefined()
      expect(route?.city, `fel stad på ${path}`).toBe(page.city)

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
    const routes = getIndexableSeoRoutes('cykelhjalpen')
    const svPaths = new Set(routes.filter((r) => r.lang !== 'en').map((r) => r.path))
    const enRoutes = routes.filter((r) => r.lang === 'en')

    expect(enRoutes.length).toBeGreaterThan(80)
    for (const route of enRoutes) {
      expect(route.altPath, `saknar altPath: ${route.path}`).toBeTruthy()
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
})
