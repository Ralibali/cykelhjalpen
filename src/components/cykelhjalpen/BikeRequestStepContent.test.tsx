import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/lib/i18n'
import { makeDefaultBikeRequest } from '@/lib/bikeRequestForm'
import BikeRequestStepContent from './BikeRequestStepContent'

vi.mock('./Turnstile', () => ({ default: () => null }))

const wrap = (ui: ReactElement) => render(
  <LanguageProvider>
    <MemoryRouter>{ui}</MemoryRouter>
  </LanguageProvider>,
)

const noop = vi.fn()

describe('BikeRequestStepContent description helper', () => {
  it('länkar till mallen vid beskrivningsfältet', () => {
    wrap(
      <BikeRequestStepContent
        step={1}
        form={makeDefaultBikeRequest()}
        files={[]}
        imagePreviews={[]}
        turnstileResetKey={0}
        update={noop}
        setStep={noop}
        onFiles={noop}
        onRemoveFile={noop}
        onTurnstileVerify={noop}
        onTurnstileExpire={noop}
      />,
    )

    const link = screen.getByRole('link', { name: 'Mall: så beskriver du cykelfelet' })
    expect(link).toHaveAttribute('href', '/blogg/beskriv-cykelfel-verkstad-mall')
    expect(screen.getByLabelText('Beskriv problemet')).toBeInTheDocument()
  })

  it('visar inte mallen på andra steg', () => {
    wrap(
      <BikeRequestStepContent
        step={0}
        form={makeDefaultBikeRequest()}
        files={[]}
        imagePreviews={[]}
        turnstileResetKey={0}
        update={noop}
        setStep={noop}
        onFiles={noop}
        onRemoveFile={noop}
        onTurnstileVerify={noop}
        onTurnstileExpire={noop}
      />,
    )

    expect(screen.queryByRole('link', { name: 'Mall: så beskriver du cykelfelet' })).not.toBeInTheDocument()
  })
})
