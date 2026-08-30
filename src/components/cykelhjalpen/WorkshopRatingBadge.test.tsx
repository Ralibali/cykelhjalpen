// WorkshopRatingBadge — ärlighetsgaten: ingen visning utan publicerade
// recensioner (samma princip som CykelHomeTrust:s minimumtrösklar, dim12).

import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/lib/i18n'
import WorkshopRatingBadge from './WorkshopRatingBadge'

const wrap = (ui: ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>)

describe('WorkshopRatingBadge', () => {
  it('renderar inget när det finns noll publicerade recensioner', () => {
    const { container } = wrap(<WorkshopRatingBadge avgRating={null} publishedCount={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderar inget utan avg även om count är satt', () => {
    const { container } = wrap(<WorkshopRatingBadge avgRating={null} publishedCount={3} />)
    expect(container.firstChild).toBeNull()
  })

  it('visar avrundat betyg och antal för publicerade recensioner', () => {
    wrap(<WorkshopRatingBadge avgRating={4.33} publishedCount={7} />)
    expect(screen.getByText('4.3')).toBeInTheDocument()
    expect(screen.getByText('(7)')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Betyg 4.3 av 5 baserat på 7 recensioner'),
    ).toBeInTheDocument()
  })
})
