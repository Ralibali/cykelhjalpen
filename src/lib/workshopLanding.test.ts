import { describe, expect, it } from 'vitest'
import { resolveWorkshopLandingMarket, workshopLandingCopy } from './workshopLanding'

const text = (sv: string) => sv

describe('workshop landing default', () => {
  it('presents all four cities when no stad param is set', () => {
    const { selected, registerHref } = resolveWorkshopLandingMarket(null)
    const copy = workshopLandingCopy(selected, text)

    expect(selected).toBeNull()
    expect(registerHref).toBe('/registrera/verkstad')
    expect(copy.badge).toBe('Founding Partner')
    expect(copy.h1Lead).toBe('Få in fler lokala cykeljobb')
    expect(copy.networkTitle).toContain('Linköping, Norrköping, Uppsala och Lund')
    expect(copy.title).not.toContain('Linköping')
    expect(copy.description).toContain('Linköping, Norrköping, Uppsala och Lund')
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
