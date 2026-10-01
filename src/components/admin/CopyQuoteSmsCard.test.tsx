import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const setEnabled = vi.fn().mockResolvedValue(undefined)
const reload = vi.fn()
let flagState: boolean | null = false

vi.mock('@/lib/workshopMagicQuote', () => ({
  useWorkshopMagicQuoteFlag: () => [flagState, reload],
  setWorkshopMagicQuoteEnabled: (enabled: boolean) => setEnabled(enabled),
}))

const auditInsert = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'admin-1' } } }) },
    from: (table: string) => table === 'audit_log'
      ? { insert: auditInsert }
      : {
          select: () => ({
            eq: () => ({ in: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
          }),
        },
    functions: { invoke: vi.fn() },
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { CopyQuoteSmsCard } from './CopyQuoteSmsCard'

describe('CopyQuoteSmsCard flag toggle', () => {
  beforeEach(() => {
    setEnabled.mockClear()
    reload.mockClear()
    auditInsert.mockClear()
  })

  it('turns the feature on after confirmation and logs it', async () => {
    flagState = false
    render(<CopyQuoteSmsCard workshopId="w1" workshopCity="Lund" workshopApproved />)

    fireEvent.click(screen.getByRole('button', { name: /Slå på offert-SMS/ }))
    expect(setEnabled).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Slå på' }))

    await waitFor(() => expect(setEnabled).toHaveBeenCalledWith(true))
    await waitFor(() => expect(reload).toHaveBeenCalled())
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      admin_id: 'admin-1',
      action: 'feature_flag_enabled',
      details: { key: 'workshop_magic_quote' },
    }))
  })

  it('offers a turn-off button when the feature is on', async () => {
    flagState = true
    render(<CopyQuoteSmsCard workshopId="w1" workshopCity="Lund" workshopApproved />)
    fireEvent.click(screen.getByRole('button', { name: 'Stäng av' }))
    await waitFor(() => expect(setEnabled).toHaveBeenCalledWith(false))
  })
})
