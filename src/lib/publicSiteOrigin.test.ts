import { describe, expect, it } from 'vitest'
import { CYKELHJALPENS_SITE_ORIGIN, publicSiteOrigin } from './publicSiteOrigin'

describe('publicSiteOrigin', () => {
  it('keeps production and www', () => {
    expect(publicSiteOrigin('https://cykelhjalpen.se')).toBe('https://cykelhjalpen.se')
    expect(publicSiteOrigin('https://www.cykelhjalpen.se')).toBe('https://www.cykelhjalpen.se')
  })

  it('keeps localhost for local recovery flows', () => {
    expect(publicSiteOrigin('http://localhost')).toBe('http://localhost')
    expect(publicSiteOrigin('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('pins preview and unknown hosts to production', () => {
    expect(publicSiteOrigin('https://cykelhjalpen.lovable.app')).toBe(CYKELHJALPENS_SITE_ORIGIN)
    expect(publicSiteOrigin('https://id-preview--abc.lovable.app')).toBe(CYKELHJALPENS_SITE_ORIGIN)
    expect(publicSiteOrigin('https://cykelhjalpen.vercel.app')).toBe(CYKELHJALPENS_SITE_ORIGIN)
    expect(publicSiteOrigin('https://ralibalis-projects.vercel.app')).toBe(CYKELHJALPENS_SITE_ORIGIN)
    expect(publicSiteOrigin('https://evil.example')).toBe(CYKELHJALPENS_SITE_ORIGIN)
    expect(publicSiteOrigin(null)).toBe(CYKELHJALPENS_SITE_ORIGIN)
    expect(publicSiteOrigin('')).toBe(CYKELHJALPENS_SITE_ORIGIN)
  })
})
