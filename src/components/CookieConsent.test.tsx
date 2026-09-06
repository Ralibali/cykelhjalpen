import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import CookieConsent from './CookieConsent'

vi.mock('@/lib/i18n', () => ({ useT: () => (text: string) => text }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('cookie choice with unavailable storage', () => {
  it('lets the visitor dismiss the banner using necessary-only when storage is blocked', () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError')
    })
    render(<MemoryRouter><CookieConsent /></MemoryRouter>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Endast nödvändiga' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ändra cookieinställningar' })).toBeInTheDocument()
  })
})
