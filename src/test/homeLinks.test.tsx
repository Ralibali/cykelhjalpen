import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { Link, MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/lib/i18n'
import { ScrollToHash } from '@/App'
import CykelhjalpenIndexV3 from '@/pages/cykelhjalpen/CykelhjalpenIndexV3'

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))
vi.mock('@/hooks/usePageTracking', () => ({ usePageTracking: () => {}, trackClick: () => {} }))
vi.mock('@/components/cykelhjalpen/CykelNavbar', () => ({ default: () => null }))
vi.mock('@/components/cykelhjalpen/CykelFooter', () => ({ default: () => null }))

const future = { v7_startTransition: true, v7_relativeSplatPath: true }

/** Renders the homepage as the router does on /en (basename) or / (Swedish). */
const renderHome = (lang: 'sv' | 'en') => {
  const base = lang === 'en' ? '/en' : '/'
  // LanguageProvider reads the language from the real browser pathname.
  window.history.replaceState(null, '', base)
  return render(
    <LanguageProvider><HelmetProvider>
      <MemoryRouter basename={base} initialEntries={[base]} future={future}><CykelhjalpenIndexV3 /></MemoryRouter>
    </HelmetProvider></LanguageProvider>,
  )
}

const hrefOf = (name: string | RegExp) => screen.getByRole('link', { name }).getAttribute('href')

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('homepage links', () => {
  it('sends English visitors to the English city pages and request form', () => {
    renderHome('en')
    expect(hrefOf(/Linköping/)).toBe('/en/bike-repair-linkoping')
    expect(hrefOf(/Norrköping/)).toBe('/en/bike-repair-norrkoping')
    expect(hrefOf(/Uppsala/)).toBe('/en/bike-repair-uppsala')
    expect(hrefOf(/Lund/)).toBe('/en/bike-repair-lund')
    expect(hrefOf(/Describe the problem/)).toBe('/en/submit-request')
    expect(hrefOf('Flat tyre')).toBe('/en/submit-request?problem=Punktering')
  })

  it('keeps the Swedish links on the Swedish site', () => {
    renderHome('sv')
    expect(hrefOf(/Linköping/)).toBe('/cykelverkstad-linkoping')
    expect(hrefOf(/Beskriv felet/)).toBe('/skicka-arende')
    expect(hrefOf('Punka')).toBe('/skicka-arende?problem=Punktering')
  })
})

describe('hash links', () => {
  const renderWithTarget = () => {
    const scrollIntoView = vi.fn()
    render(
      <MemoryRouter initialEntries={['/blogg']} future={future}>
        <ScrollToHash />
        <Link to="/#stader">Städer</Link>
        <section id="stader" ref={(el) => { if (el) el.scrollIntoView = scrollIntoView }} />
      </MemoryRouter>,
    )
    return scrollIntoView
  }

  it('scrolls to the #hash target once the page has rendered', () => {
    vi.useFakeTimers()
    const scrollIntoView = renderWithTarget()
    fireEvent.click(screen.getByRole('link', { name: 'Städer' }))
    expect(scrollIntoView).not.toHaveBeenCalled()
    act(() => { vi.runAllTimers() })
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('jumps without animation when the visitor prefers reduced motion', () => {
    vi.useFakeTimers()
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({ matches: query === '(prefers-reduced-motion: reduce)' }) as MediaQueryList)
    const scrollIntoView = renderWithTarget()
    fireEvent.click(screen.getByRole('link', { name: 'Städer' }))
    act(() => { vi.runAllTimers() })
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' })
  })
})
