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
    expect(shouldNoindexPath('/cykelverkstad-uppsala')).toBe(false)
    expect(getRobotsDirectiveForPath('/cykelverkstad-uppsala')).toBe(INDEX_ROBOTS_DIRECTIVE)
    expect(shouldNoindexPath('/cykelservice-norrkoping')).toBe(false)
    expect(getRobotsDirectiveForPath('/cykelverkstad-lund')).toBe(INDEX_ROBOTS_DIRECTIVE)
    expect(shouldNoindexPath('/en/bike-repair-lund')).toBe(false)
    expect(shouldNoindexPath('/for-cykelverkstader')).toBe(false)
    expect(shouldNoindexPath('/registrera/verkstad')).toBe(false)
    expect(shouldNoindexPath('/cykelverkstad-linkoping')).toBe(false)
  })

  it('noindexar Lund/Uppsala-farmer i seoRobots, inklusive engelska /en-sökvägar', () => {
    const farm = CYKEL_SEO_PAGES.find((page) => page.slug === 'cykelservice-uppsala')
    expect(farm && isThinSeoFarmPage(farm)).toBe(true)

    expect(getRobotsDirectiveForPath('/cykelservice-uppsala')).toBe(NOINDEX_ROBOTS_DIRECTIVE)
    expect(getRobotsDirectiveForPath('/en/bike-service-uppsala')).toBe(NOINDEX_ROBOTS_DIRECTIVE)
    expect(shouldNoindexPath('/bike-service-uppsala')).toBe(true)
    expect(shouldNoindexPath('/cykelverkstad-delphi-lund')).toBe(true)
    expect(shouldNoindexPath('/en/bike-shop-flogsta-uppsala')).toBe(true)
    expect(registryNoindexPaths).toContain('/cykelservice-uppsala')
    expect(registryNoindexPaths).toContain('/en/bike-service-uppsala')

    for (const page of CYKEL_SEO_PAGES.filter(isThinSeoFarmPage)) {
      expect(shouldNoindexPath(seoPageHref(page, 'sv'))).toBe(true)
      expect(shouldNoindexPath(seoPageHref(page, 'en'))).toBe(true)
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
