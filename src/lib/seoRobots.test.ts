import { describe, expect, it } from 'vitest'
import { CYKEL_SEO_PAGES, isThinSeoFarmPage, seoPageHref } from './cykelSeoPages'
import { getNoindexSeoRoutes } from './seoStatic'
import {
  getRobotsDirectiveForPath,
  INDEX_ROBOTS_DIRECTIVE,
  NOINDEX_ROBOTS_DIRECTIVE,
  normalizeSeoPath,
  shouldNoindexPath,
} from './seoRobots'

describe('seoRobots', () => {
  const configuredNoindexPaths = ['/skicka-arende', '/registrera/verkstad']
  const registryNoindexPaths = getNoindexSeoRoutes('cykelhjalpen').map((route) => route.path)

  it('normalizes trailing slashes, queries and hashes', () => {
    expect(normalizeSeoPath('/cykelverkstad-linkoping/?ref=test#top')).toBe('/cykelverkstad-linkoping')
    expect(normalizeSeoPath('/')).toBe('/')
  })

  it('keeps public landing pages indexable', () => {
    expect(shouldNoindexPath('/cykelverkstad-uppsala', configuredNoindexPaths)).toBe(false)
    expect(getRobotsDirectiveForPath('/cykelverkstad-uppsala', configuredNoindexPaths)).toBe(INDEX_ROBOTS_DIRECTIVE)
    expect(shouldNoindexPath('/cykelservice-norrkoping', registryNoindexPaths)).toBe(false)
    expect(getRobotsDirectiveForPath('/cykelverkstad-lund', registryNoindexPaths)).toBe(INDEX_ROBOTS_DIRECTIVE)
  })

  it('noindexar Lund/Uppsala-farmer via SEO-registret, inklusive engelska /en-sökvägar', () => {
    const farm = CYKEL_SEO_PAGES.find((page) => page.slug === 'cykelservice-uppsala')
    expect(farm && isThinSeoFarmPage(farm)).toBe(true)

    expect(getRobotsDirectiveForPath('/cykelservice-uppsala', registryNoindexPaths)).toBe(NOINDEX_ROBOTS_DIRECTIVE)
    expect(getRobotsDirectiveForPath('/en/bike-service-uppsala', registryNoindexPaths)).toBe(NOINDEX_ROBOTS_DIRECTIVE)
    expect(shouldNoindexPath('/bike-service-uppsala', registryNoindexPaths)).toBe(true)
    expect(shouldNoindexPath('/cykelverkstad-delphi-lund', registryNoindexPaths)).toBe(true)
    expect(shouldNoindexPath('/en/bike-shop-flogsta-uppsala', registryNoindexPaths)).toBe(true)

    for (const page of CYKEL_SEO_PAGES.filter(isThinSeoFarmPage)) {
      expect(shouldNoindexPath(seoPageHref(page, 'sv'), registryNoindexPaths)).toBe(true)
      expect(shouldNoindexPath(seoPageHref(page, 'en'), registryNoindexPaths)).toBe(true)
    }
  })

  it('marks configured noindex routes', () => {
    expect(getRobotsDirectiveForPath('/skicka-arende', configuredNoindexPaths)).toBe(NOINDEX_ROBOTS_DIRECTIVE)
    expect(getRobotsDirectiveForPath('/registrera/verkstad/', configuredNoindexPaths)).toBe(NOINDEX_ROBOTS_DIRECTIVE)
  })

  it('marks private and tokenized routes by prefix', () => {
    expect(getRobotsDirectiveForPath('/admin/cykelarenden', configuredNoindexPaths)).toBe(NOINDEX_ROBOTS_DIRECTIVE)
    expect(getRobotsDirectiveForPath('/dashboard/verkstad/arenden', configuredNoindexPaths)).toBe(NOINDEX_ROBOTS_DIRECTIVE)
    expect(getRobotsDirectiveForPath('/mitt-arende/hemlig-token', configuredNoindexPaths)).toBe(NOINDEX_ROBOTS_DIRECTIVE)
    expect(getRobotsDirectiveForPath('/avregistrera/hemlig-token', configuredNoindexPaths)).toBe(NOINDEX_ROBOTS_DIRECTIVE)
    expect(getRobotsDirectiveForPath('/annons/verkstad/linkoping', configuredNoindexPaths)).toBe(NOINDEX_ROBOTS_DIRECTIVE)
  })
})
