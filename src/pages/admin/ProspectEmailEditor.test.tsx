import type { ReactElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/lib/i18n'
import { ProspectEmailEditor } from './ProspectEmailEditor'

const wrap = (ui: ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>)

describe('ProspectEmailEditor', () => {
  it('visar tomt fält och inaktiverat spara när e-post saknas', () => {
    wrap(<ProspectEmailEditor email={null} onSave={vi.fn()} />)
    const input = screen.getByTestId('prospect-email-input') as HTMLInputElement
    expect(input.value).toBe('')
    expect(screen.getByTestId('prospect-email-save')).toBeDisabled()
    expect(screen.getByText('Lägg till e-post')).toBeInTheDocument()
  })

  it('aktiverar spara för företagsmejl och skickar normaliserad adress', () => {
    const onSave = vi.fn()
    wrap(<ProspectEmailEditor email={null} onSave={onSave} />)
    fireEvent.change(screen.getByTestId('prospect-email-input'), {
      target: { value: ' INFO@Cykelverkstad.SE ' },
    })
    const save = screen.getByTestId('prospect-email-save')
    expect(save).toBeEnabled()
    fireEvent.click(save)
    expect(onSave).toHaveBeenCalledWith('info@cykelverkstad.se')
  })

  it('blockerar personlig e-post med samma guard som utskicket', () => {
    wrap(<ProspectEmailEditor email={null} onSave={vi.fn()} />)
    fireEvent.change(screen.getByTestId('prospect-email-input'), {
      target: { value: 'anna@verkstad.se' },
    })
    expect(screen.getByTestId('prospect-email-save')).toBeDisabled()
    expect(screen.getByTestId('prospect-email-guard')).toHaveTextContent(
      'E-postadressen ser inte ut som ett publikt företagsmejl',
    )
  })

  it('låter admin ändra en redan sparad adress', () => {
    wrap(<ProspectEmailEditor email="info@gammal.se" onSave={vi.fn()} />)
    const input = screen.getByTestId('prospect-email-input') as HTMLInputElement
    expect(input.value).toBe('info@gammal.se')
    expect(screen.getByText('Spara e-post')).toBeInTheDocument()
    expect(screen.getByTestId('prospect-email-save')).toBeDisabled()
  })
})
