import { FunctionsHttpError } from '@supabase/supabase-js'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkshopDashboard from '@/pages/cykelhjalpen/workshop/WorkshopDashboard'

const mock = vi.hoisted(() => ({
  invoke: vi.fn(),
  responses: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn(), loading: vi.fn() },
}))

// Every query the dashboard builds resolves to the same result for its table.
const query = (result: unknown) => {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order']) chain[method] = () => chain
  chain.maybeSingle = () => Promise.resolve(result)
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return chain
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mock.invoke },
    from: (table: string) => query(table === 'workshop_responses' ? mock.responses() : { data: [], error: null }),
  },
}))
vi.mock('sonner', () => ({ toast: mock.toast }))
vi.mock('@/lib/v2/pricing', () => ({ useV2Pricing: () => ({ amountOre: 5000 }), formatKrFromOre: () => '50' }))
vi.mock('@/components/workshop/FreeLeadsBanner', () => ({ FreeLeadsBanner: () => null }))
vi.mock('@/components/service-orders/CreateOrderFromLead', () => ({ default: () => null }))

const GENERIC = 'Edge Function returned a non-2xx status code'
const httpError = (body: unknown, status = 400) => new FunctionsHttpError(new Response(JSON.stringify(body), { status }))

const workshop = { id: 'workshop-1', company_name: 'Testverkstaden', city: 'Linköping', free_leads_remaining: 0 }
const wonResponse = (paid: boolean) => ({
  id: 'response-1', request_id: 'request-1', created_at: '2026-10-01T10:00:00Z', estimated_price_min: 300,
  estimated_price_max: 450, estimated_time: null, paid, status: 'won', used_free_lead: false,
})

const mount = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
  <Route element={<Outlet context={{ workshop }} />}>
    <Route index element={<WorkshopDashboard />} />
  </Route>
</Routes></MemoryRouter>)

const answer = (name: string, result: unknown) => mock.invoke.mockImplementation(async (called: string) =>
  called === name ? result : { data: { requests: [] }, error: null })

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('workshop dashboard', () => {
  it('shows the server message when buying a lead whose payment is still being confirmed', async () => {
    mock.responses.mockReturnValue({ data: [wonResponse(false)], error: null })
    answer('create-winner-payment', { data: null, error: httpError({ error: 'Betalningen behandlas redan. Uppdatera sidan om några sekunder.' }) })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Köp lead – 50 kr exkl. moms' }))
    await waitFor(() => expect(mock.toast.error).toHaveBeenCalledWith('Kunde inte starta leadköpet.', {
      description: 'Betalningen behandlas redan. Uppdatera sidan om några sekunder.',
    }))
    expect(JSON.stringify(mock.toast.error.mock.calls)).not.toContain(GENERIC)
  })

  it('shows the server message when the contact details cannot be read', async () => {
    mock.responses.mockReturnValue({ data: [wonResponse(true)], error: null })
    answer('get-won-lead-contact', { data: null, error: httpError({ error: 'Kunden har inte valt er för det här ärendet.' }) })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Visa kunduppgifter' }))
    await waitFor(() => expect(mock.toast.error).toHaveBeenCalledWith('Kunde inte läsa kontaktuppgifterna.', {
      description: 'Kunden har inte valt er för det här ärendet.',
    }))
  })
})
