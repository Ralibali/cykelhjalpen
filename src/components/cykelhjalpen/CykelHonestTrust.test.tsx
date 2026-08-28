import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/lib/i18n'
import CykelHonestTrust from './CykelHonestTrust'

const wrap = (ui: ReactElement) => render(
  <LanguageProvider>
    <MemoryRouter>{ui}</MemoryRouter>
  </LanguageProvider>,
)

describe('CykelHonestTrust', () => {
  it('renders a factual cyclist trust block without invented proof', () => {
    wrap(<CykelHonestTrust variant="cyclist" ctaHref="/skicka-arende" ctaLabel="Få prisförslag gratis" />)

    expect(screen.getByRole('heading', { name: 'Så här är Cykelhjälpen upplagt' })).toBeInTheDocument()
    expect(screen.getByText('Gratis för cyklisten')).toBeInTheDocument()
    expect(screen.getByText('Kunden väljer verkstad')).toBeInTheDocument()
    expect(screen.getByText('Offerter per ärende')).toBeInTheDocument()
    expect(screen.getByText('Aurora Media AB, Linköping')).toBeInTheDocument()
    expect(screen.getByText('Linköping, Norrköping, Uppsala och Lund')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Få prisförslag gratis/ })).toHaveAttribute('href', '/skicka-arende')
    expect(screen.queryByText(/jojoscykel/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/hundratals/i)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/lovable\.app|vercel\.app/)
  })

  it('leads the workshop variant with fee facts', () => {
    wrap(
      <CykelHonestTrust
        variant="workshop"
        ctaHref="/registrera/verkstad"
        ctaLabel="Registrera verkstaden gratis"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Vad det kostar – och när det tas ut' })).toBeInTheDocument()
    expect(screen.getByText('Bara när kunden väljer er')).toBeInTheDocument()
    expect(screen.getByText('Första vinsterna gratis')).toBeInTheDocument()
    expect(screen.getAllByText('0 kr/mån').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Registrera verkstaden gratis/ })).toHaveAttribute('href', '/registrera/verkstad')
  })
})
