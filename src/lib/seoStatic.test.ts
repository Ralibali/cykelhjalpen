import { describe, expect, it } from 'vitest'
import { CYKEL_SEO_PAGES } from './cykelSeoPages'
import { generateSitemapXml, getIndexableSeoRoutes, getNoindexSeoRoutes } from './seoStatic'

describe('Cykelhjälpen SEO-konfiguration', () => {
  it('har unika lokala landningssidors sluggar', () => {
    const slugs = CYKEL_SEO_PAGES.map((page) => page.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('lanserar bara lokala SEO-sidor för Linköping', () => {
    for (const page of CYKEL_SEO_PAGES) {
      expect(page.slug).toContain('linkoping')
      expect(`${page.title} ${page.description} ${page.h1}`.toLowerCase()).toContain('linköping')
    }
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

  it('indexerar verkstadssidan men inte formulär eller privata kundsidor', () => {
    const indexablePaths = getIndexableSeoRoutes('cykelhjalpen').map((route) => route.path)
    const noindexPaths = getNoindexSeoRoutes('cykelhjalpen').map((route) => route.path)

    expect(indexablePaths).toContain('/for-cykelverkstader')
    expect(indexablePaths).not.toContain('/skicka-arende')
    expect(indexablePaths).not.toContain('/registrera/verkstad')
    expect(noindexPaths).toContain('/mitt-arende')
  })

  it('läcker inte gamla, inaktiva stads-URL:er till sitemap', () => {
    const sitemap = generateSitemapXml('cykelhjalpen')

    expect(sitemap).not.toContain('cykelverkstad-norrkoping')
    expect(sitemap).not.toContain('cykelverkstad-uppsala')
    expect(sitemap).not.toContain('cykelverkstad-lund')
  })
})
