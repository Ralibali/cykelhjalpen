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

  it('indexerar verkstadssidan men inte formulär eller privata kundsidor', () => {
    const indexablePaths = getIndexableSeoRoutes('cykelhjalpen').map((route) => route.path)
    const noindexPaths = getNoindexSeoRoutes('cykelhjalpen').map((route) => route.path)

    expect(indexablePaths).toContain('/for-cykelverkstader')
    expect(indexablePaths).not.toContain('/skicka-arende')
    expect(indexablePaths).not.toContain('/registrera/verkstad')
    expect(noindexPaths).toContain('/mitt-arende')
  })

  it('har inga dubbla URL:er i sitemap', () => {
    const sitemap = generateSitemapXml('cykelhjalpen')
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
    expect(new Set(urls).size).toBe(urls.length)
  })
})
