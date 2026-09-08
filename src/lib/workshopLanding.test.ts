import { SERVICE_CITIES } from './cykelCities'
import { describe, expect, it } from 'vitest'
import { resolveWorkshopLandingMarket, workshopLandingCopy } from './workshopLanding'

const text = (sv: string) => sv

describe('workshop landing default', () => {
  it('presents all open cities when no stad param is set', () => {
    const { selected, registerHref } = resolveWorkshopLandingMarket(null)
    const copy = workshopLandingCopy(selected, text)

    expect(selected).toBeNull()
    expect(registerHref).toBe('/registrera/verkstad')
    expect(copy.badge).toBe('Founding Partner')
    expect(copy.h1Lead).toBe('Få in fler lokala cykeljobb')
    expect(copy.networkTitle).toContain('11 öppna städer')
    expect(copy.title).not.toContain('Linköping')
    expect(copy.description).toContain('11 öppna städer')
    expect(copy.heroCta).toBe('Bli Founding Partner')
  })

  it('stays city-specific when stad is set', () => {
    const { selected, registerHref } = resolveWorkshopLandingMarket('lund')
    const copy = workshopLandingCopy(selected, text)

    expect(selected?.name).toBe('Lund')
    expect(registerHref).toBe('/registrera/verkstad?stad=lund')
    expect(copy.badge).toBe('Founding Partner · Lund')
    expect(copy.h1Lead).toContain('Lund')
    expect(copy.networkTitle).toContain('Lund')
    expect(copy.heroCta).toContain('Lund')
    expect(copy.bottomCta).toContain('Lund')
  })
})

// Every operational city must survive the landing → registration link.
it.each(SERVICE_CITIES)('preserves $name in the registration destination', ({name, slug}) => {
  const market = resolveWorkshopLandingMarket(slug)
  expect(market.selected?.name).toBe(name)
  expect(market.registerHref).toBe(`/registrera/verkstad?stad=${slug}`)
  expect(workshopLandingCopy(market.selected, text).networkTitle).toContain(name)
})
