import { FunctionsHttpError } from '@supabase/supabase-js'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CustomerResponses from '@/pages/cykelhjalpen/CustomerResponses'

const mock = vi.hoisted(() => ({
  invoke: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mock.invoke } } }))
vi.mock('sonner', () => ({ toast: mock.toast }))
vi.mock('@/hooks/usePageTracking', () => ({ trackClick: vi.fn() }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('@/lib/v2/useV2Flag', () => ({ useV2Flag: () => false }))
vi.mock('@/components/cykelhjalpen/CykelNavbar', () => ({ default: () => null }))
vi.mock('@/components/cykelhjalpen/CykelFooter', () => ({ default: () => null }))
vi.mock('@/components/cykelhjalpen/OutcomeReviewCard', () => ({ default: () => null }))
vi.mock('@/components/cykelhjalpen/CustomerRetentionSection', () => ({ default: () => null }))

const GENERIC = 'Edge Function returned a non-2xx status code'
const httpError = (body: unknown, status = 400) => new FunctionsHttpError(new Response(JSON.stringify(body), { status }))

const workshop = { id: 'workshop-1', company_name: 'Testverkstaden', phone: '0701234567', email: 'verkstad@example.test', website: null }
const request = {
  id: 'request-1', customer_name: 'Anna', bike_type: 'Elcykel', repair_category: 'Bromsar', description: 'Bromsarna tar dåligt.',
  city: 'Linköping', urgency: null, can_drop_off: true, wants_pickup: false, status: 'has_offers', admin_status: 'approved',
  rejected_reason: null, created_at: '2026-10-01T10:00:00Z', closed_at: null,
}
const quote = {
  id: 'response-1', message: 'Vi byter bromsbelägg.', estimated_price_min: 300, estimated_price_max: 450,
  estimated_time: null, can_pickup: false, status: 'sent', workshop,
}
const openRequest = { data: { request, responses: [quote], images: [] }, error: null }

const loads = () => mock.invoke.mock.calls.filter(([name]) => name === 'get-bike-request-by-token')

const mount = () => render(<HelmetProvider><MemoryRouter initialEntries={['/mitt-arende/token-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <Routes><Route path="/mitt-arende/:token" element={<CustomerResponses />} /></Routes>
</MemoryRouter></HelmetProvider>)

// The page reloads when the tab becomes visible; let that reload settle.
const reloadOnVisible = () => act(async () => {
  document.dispatchEvent(new Event('visibilitychange'))
  await new Promise((resolve) => setTimeout(resolve, 50))
})

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})
afterEach(cleanup)

describe('customer responses', () => {
  it('shows the server message when the first load fails', async () => {
    mock.invoke.mockResolvedValue({ data: null, error: httpError({ error: 'Kunde inte läsa ärendet just nu.' }, 500) })
    mount()
    expect(await screen.findByRole('heading', { name: 'Kunde inte läsa ärendet' })).toBeInTheDocument()
    expect(screen.getByText('Kunde inte läsa ärendet just nu.')).toBeInTheDocument()
    expect(screen.queryByText(GENERIC)).not.toBeInTheDocument()
  })

  it('keeps the loaded request when a background refresh fails', async () => {
    mock.invoke.mockResolvedValueOnce(openRequest)
    mount()
    expect(await screen.findByText('Bromsarna tar dåligt.')).toBeInTheDocument()

    mock.invoke.mockResolvedValueOnce({ data: null, error: httpError({ error: 'Kunde inte läsa ärendet just nu.' }, 500) })
    await reloadOnVisible()
    expect(loads()).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Kunde inte läsa ärendet' })).not.toBeInTheDocument()
    expect(screen.getByText('Bromsarna tar dåligt.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Välj denna verkstad' })).toBeInTheDocument()
  })

  it('shows the server message and refreshes when the winner can no longer be chosen', async () => {
    const chosenElsewhere = {
      data: {
        request: { ...request, status: 'completed' },
        responses: [{ ...quote, status: 'lost' }, { ...quote, id: 'response-2', status: 'won', workshop: { ...workshop, id: 'workshop-2', company_name: 'Andra verkstaden' } }],
        images: [],
      },
      error: null,
    }
    mock.invoke.mockImplementation(async (name: string) => {
      if (name === 'select-bike-winner') return { data: null, error: httpError({ error: 'En verkstad är redan vald för det här ärendet.' }) }
      return loads().length > 1 ? chosenElsewhere : openRequest
    })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Välj denna verkstad' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, välj verkstaden' }))

    await waitFor(() => expect(mock.toast.error).toHaveBeenCalledWith('Kunde inte registrera valet.', {
      description: 'En verkstad är redan vald för det här ärendet.',
    }))
    await waitFor(() => expect(loads()).toHaveLength(2))
    expect(await screen.findByRole('heading', { name: 'Du har valt verkstad' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Välj denna verkstad' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ja, välj verkstaden' })).not.toBeInTheDocument()
  })
})
