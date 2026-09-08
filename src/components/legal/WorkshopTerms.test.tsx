import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { WorkshopTerms } from './WorkshopTerms'

vi.mock('@/lib/i18n', () => ({ useT: () => (text: string) => text }))
vi.mock('@/lib/v2/pricing', () => ({
  useV2Pricing: () => ({ amountOre: 5000, vatRate: 0.25 }),
  formatKrFromOre: (ore: number) => String(ore / 100),
  v2GrossOre: (ore: number, rate: number) => ore * (1 + rate),
}))
// Layout is not the subject of this form-submission regression test.
vi.mock('@/components/ui/scroll-area', () => ({ ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

it('neither close button submits the surrounding registration form', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
  render(<form onSubmit={submit}><WorkshopTerms accepted onAccept={vi.fn()} /></form>)
  const open = () => fireEvent.click(screen.getByText('plattformsavtalet och åtar mig att följa svensk lag'))
  open()
  const close = document.querySelector('button[aria-label="Stäng avtalet"]') as HTMLButtonElement
  expect(close.type).toBe('button')
  fireEvent.click(close)
  open()
  const read = screen.getByText('Jag har läst avtalet') as HTMLButtonElement
  expect(read.type).toBe('button')
  fireEvent.click(read)
  expect(submit).not.toHaveBeenCalled()
  expect(screen.queryByText('Jag har läst avtalet')).toBeNull()
})
