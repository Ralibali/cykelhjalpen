import { describe, expect, it } from 'vitest'
import {
  getRobotsDirectiveForPath,
  INDEX_ROBOTS_DIRECTIVE,
  NOINDEX_ROBOTS_DIRECTIVE,
  normalizeSeoPath,
  shouldNoindexPath,
} from './seoRobots'

describe('seoRobots', () => {
  const configuredNoindexPaths = ['/skicka-arende', '/registrera/verkstad']

  it('normalizes trailing slashes, queries and hashes', () => {
    expect(normalizeSeoPath('/cykelverkstad-linkoping/?ref=test#top')).toBe('/cykelverkstad-linkoping')
    expect(normalizeSeoPath('/')).toBe('/')
  })

  it('keeps public landing pages indexable', () => {
    expect(shouldNoindexPath('/cykelservice-uppsala', configuredNoindexPaths)).toBe(false)
    expect(getRobotsDirectiveForPath('/cykelservice-uppsala', configuredNoindexPaths)).toBe(INDEX_ROBOTS_DIRECTIVE)
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
