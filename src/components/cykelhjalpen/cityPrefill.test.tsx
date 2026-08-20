import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/usePageTracking', () => ({
  trackClick: () => {},
}))

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
})
import { LanguageProvider } from '@/lib/i18n'
import CykelFooter from './CykelFooter'
import CykelHomeHeroNeutral from './CykelHomeHeroNeutral'
import CykelHowItWorks from './CykelHowItWorks'
import { CykelV3FaqAndFinalCta, CykelV3QuotePreview } from './CykelHomeV3Full'
import { CykelV3MobileStickyNeutral } from './CykelV3NeutralSections'

const wrap = (ui: ReactElement) => render(
  <LanguageProvider>
    <MemoryRouter>{ui}</MemoryRouter>
  </LanguageProvider>,
)

const requestHrefs = () =>
  screen.getAllByRole('link')
    .map((link) => link.getAttribute('href') || '')
    .filter((href) => href.startsWith('/skicka-arende'))

describe('generic customer CTAs', () => {
  it('homepage hero and problem chips do not lock a city', () => {
    wrap(<CykelHomeHeroNeutral />)
    const hrefs = requestHrefs()
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.every((href) => !/[?&]stad=/.test(href))).toBe(true)
    expect(hrefs).toContain('/skicka-arende')
    expect(hrefs.some((href) => href.includes('problem=Punktering'))).toBe(true)
  })

  it('how-it-works repair chips do not lock Linköping', () => {
    wrap(<CykelHowItWorks />)
    const hrefs = requestHrefs()
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.every((href) => !href.includes('stad=linkoping'))).toBe(true)
    expect(hrefs.every((href) => !/[?&]stad=/.test(href))).toBe(true)
  })

  it('quote preview, final CTA, footer and sticky do not lock a city', () => {
    wrap(
      <>
        <CykelV3QuotePreview />
        <CykelV3FaqAndFinalCta />
        <CykelFooter />
        <CykelV3MobileStickyNeutral />
      </>,
    )
    const hrefs = requestHrefs()
    expect(hrefs).toContain('/skicka-arende')
    expect(hrefs.every((href) => !/[?&]stad=/.test(href))).toBe(true)
  })
})
