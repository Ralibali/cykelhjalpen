import { describe, expect, it } from 'vitest'
import { workshopFlyerShortUrl, workshopFlyerUrl } from './workshopFlyer'
import { resolveWorkshopLandingMarket } from './workshopLanding'

const lund = { name: 'Lund', slug: 'lund' }

describe('workshopFlyerUrl', () => {
  it('points to the workshop page for the city with print UTM tags', () => {
    const url = new URL(workshopFlyerUrl(lund))
    expect(url.origin).toBe('https://cykelhjalpen.se')
    expect(url.pathname).toBe('/for-cykelverkstader')
    expect(url.searchParams.get('stad')).toBe('lund')
    expect(url.searchParams.get('utm_source')).toBe('print')
    expect(url.searchParams.get('utm_medium')).toBe('qr')
    expect(url.searchParams.get('utm_campaign')).toBe('workshop_recruit_lund')
    expect(url.searchParams.get('utm_content')).toBe('a5')
  })

  it('uses a stad value the landing page resolves to the same city', () => {
    const stad = new URL(workshopFlyerUrl({ name: 'Linköping', slug: 'linkoping' })).searchParams.get('stad')
    expect(resolveWorkshopLandingMarket(stad).selected?.name).toBe('Linköping')
  })

  it('prints a short readable address', () => {
    expect(workshopFlyerShortUrl(lund)).toBe('cykelhjalpen.se/for-cykelverkstader?stad=lund')
  })
})
