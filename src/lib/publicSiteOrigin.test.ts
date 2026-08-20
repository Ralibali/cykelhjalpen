import { describe, expect, it } from 'vitest'
import { CYKELHJALPENS_SITE_ORIGIN, publicSiteOrigin } from './publicSiteOrigin'

describe('publicSiteOrigin', () => {
  it('always returns the apex host', () => {
    expect(publicSiteOrigin()).toBe('https://cykelhjalpen.se')
    expect(publicSiteOrigin()).toBe(CYKELHJALPENS_SITE_ORIGIN)
  })
})
