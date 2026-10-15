import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkshopRequests from '@/pages/cykelhjalpen/workshop/WorkshopRequests'

type Result = { data?: unknown; error: { message: string } | null }

const mock = vi.hoisted(() => ({
  invoke: vi.fn(),
  readResponses: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mock.invoke },
    from: () => ({
      select: () => ({ eq: () => mock.readResponses() }),
      insert: (values: unknown) => ({ select: () => ({ single: () => mock.insert(values) }) }),
      update: (values: unknown) => {
        const filters: Record<string, unknown> = {}
        const query = {
          eq: (column: string, value: unknown) => { filters[column] = value; return query },
          in: (column: string, value: unknown) => { filters[column] = value; return query },
          then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(mock.update(values, filters)).then(resolve, reject),
        }
        return query
      },
    }),
  },
}))
vi.mock('sonner', () => ({ toast: mock.toast }))
vi.mock('@/lib/v2/pricing', () => ({ useV2Pricing: () => ({ amountOre: 5000 }), formatKrFromOre: () => '50' }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))

const workshop = { id: 'workshop-1', company_name: 'Testverkstaden', city: 'Linköping', approved: true }
const request = {
  id: 'request-1', bike_type: 'Elcykel', repair_category: 'Bromsar', description: 'Bromsarna tar dåligt.',
  area: null, postcode: null, urgency: null, can_drop_off: true, wants_pickup: false,
  status: 'open', created_at: '2026-10-01T10:00:00Z',
}

const App = () => <MemoryRouter><Routes>
  <Route element={<Outlet context={{ workshop }} />}>
    <Route index element={<WorkshopRequests />} />
  </Route>
</Routes></MemoryRouter>

const submitCalls = () => mock.invoke.mock.calls.filter(([name]) => name === 'submit-bike-response')

const fillOffer = (values: { min?: string; max?: string } = {}) => {
  fireEvent.click(screen.getByRole('button', { name: 'Lämna offert' }))
  fireEvent.change(screen.getByLabelText('Pris från (kr, inkl. moms)'), { target: { value: values.min ?? '300' } })
  fireEvent.change(screen.getByLabelText('Pris till (kr, inkl. moms)'), { target: { value: values.max ?? '450' } })
  fireEvent.change(screen.getByLabelText('Beräknad tid'), { target: { value: 'Två arbetsdagar' } })
  fireEvent.change(screen.getByLabelText('Meddelande till kunden'), { target: { value: 'Vi byter bromsbelägg och justerar bromsarna.' } })
  fireEvent.click(screen.getByLabelText('Vi kan hämta cykeln'))
  fireEvent.click(screen.getByRole('button', { name: 'Skicka offerten – kostnadsfritt' }))
}

const typedOffer = {
  message: 'Vi byter bromsbelägg och justerar bromsarna.',
  estimated_price_min: 300,
  estimated_price_max: 450,
  estimated_time: 'Två arbetsdagar',
  can_pickup: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mock.invoke.mockImplementation(async (name: string) => name === 'list-open-bike-requests'
    ? { data: { requests: [request] }, error: null }
    : { data: { ok: true }, error: null })
  mock.readResponses.mockResolvedValue({ data: [], error: null })
  mock.insert.mockResolvedValue({ data: { id: 'response-new', request_id: request.id, paid: false, status: 'draft' }, error: null })
  mock.update.mockReturnValue({ error: null })
})
afterEach(cleanup)

describe('workshop requests', () => {
  it('saves a new offer as a draft and sends it', async () => {
    render(<App />)
    await screen.findByText('Elcykel')
    fillOffer()
    await waitFor(() => expect(submitCalls()).toHaveLength(1))
    expect(mock.insert).toHaveBeenCalledWith({ request_id: request.id, workshop_id: workshop.id, ...typedOffer, status: 'draft' })
    expect(submitCalls()[0][1]).toEqual({ body: { response_id: 'response-new' } })
    expect(mock.update).not.toHaveBeenCalled()
    expect(await screen.findByText('Offert skickad')).toBeInTheDocument()
  })

  it.each(['draft', 'pending_payment'])('saves what was typed into an existing %s before sending it', async (status) => {
    mock.readResponses.mockResolvedValue({ data: [{ id: 'response-1', request_id: request.id, paid: false, status }], error: null })
    render(<App />)
    await screen.findByText('Elcykel')
    fillOffer()
    await waitFor(() => expect(submitCalls()).toHaveLength(1))
    expect(mock.insert).not.toHaveBeenCalled()
    expect(mock.update).toHaveBeenCalledWith(typedOffer, { id: 'response-1', status: ['draft', 'pending_payment'] })
    expect(mock.update.mock.invocationCallOrder[0]).toBeLessThan(mock.invoke.mock.invocationCallOrder.at(-1)!)
    expect(submitCalls()[0][1]).toEqual({ body: { response_id: 'response-1' } })
  })

  it('does not send a stale draft when saving the typed offer fails', async () => {
    mock.readResponses.mockResolvedValue({ data: [{ id: 'response-1', request_id: request.id, paid: false, status: 'draft' }], error: null })
    mock.update.mockReturnValue({ error: { message: 'permission denied' } })
    render(<App />)
    await screen.findByText('Elcykel')
    fillOffer()
    await waitFor(() => expect(mock.toast.error).toHaveBeenCalledWith('Kunde inte spara offerten.', { description: 'permission denied' }))
    expect(submitCalls()).toHaveLength(0)
    expect(screen.getByLabelText('Meddelande till kunden')).toHaveValue(typedOffer.message)
  })

  it('does not update a response in any other status', async () => {
    mock.readResponses.mockResolvedValue({ data: [{ id: 'response-1', request_id: request.id, paid: false, status: 'lost' }], error: null })
    render(<App />)
    await screen.findByText('Elcykel')
    fillOffer()
    await waitFor(() => expect(submitCalls()).toHaveLength(1))
    expect(mock.update).not.toHaveBeenCalled()
  })

  it('asks for whole kronor instead of sending a decimal price', async () => {
    render(<App />)
    await screen.findByText('Elcykel')
    fillOffer({ min: '299.5' })
    await waitFor(() => expect(mock.toast.error).toHaveBeenCalledWith('Ange priset i hela kronor.'))
    expect(mock.insert).not.toHaveBeenCalled()
    expect(submitCalls()).toHaveLength(0)
    expect(screen.getByLabelText('Pris från (kr, inkl. moms)')).toHaveAttribute('step', '1')
    expect(screen.getByLabelText('Pris till (kr, inkl. moms)')).toHaveAttribute('step', '1')
  })

  it('asks for whole kronor in the price to field as well', async () => {
    render(<App />)
    await screen.findByText('Elcykel')
    fillOffer({ max: '450.25' })
    await waitFor(() => expect(mock.toast.error).toHaveBeenCalledWith('Ange priset i hela kronor.'))
    expect(mock.insert).not.toHaveBeenCalled()
  })

  it('shows a load error instead of offer forms when previous responses cannot be read', async () => {
    mock.readResponses.mockResolvedValueOnce({ data: null, error: { message: 'network error' } })
    render(<App />)
    expect(await screen.findByText('Kunde inte läsa dina tidigare offerter.')).toBeInTheDocument()
    expect(screen.queryByText('Elcykel')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lämna offert' })).not.toBeInTheDocument()

    mock.readResponses.mockResolvedValueOnce({ data: [{ id: 'response-1', request_id: request.id, paid: false, status: 'sent' }], error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }))
    expect(await screen.findByText('Offert skickad')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lämna offert' })).not.toBeInTheDocument()
  })
})
