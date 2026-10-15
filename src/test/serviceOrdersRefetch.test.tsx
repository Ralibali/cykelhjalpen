import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkshopServiceOrders from '@/pages/cykelhjalpen/workshop/WorkshopServiceOrders'
import ServiceOrderCustomer from '@/pages/cykelhjalpen/ServiceOrderCustomer'
import type { ServiceOrder } from '@/lib/serviceOrders'

const mock = vi.hoisted(() => ({ listOrders: vi.fn(), customerAction: vi.fn() }))
vi.mock('@/lib/serviceOrders', async () => ({
  ...await vi.importActual('@/lib/serviceOrders'),
  listOrders: mock.listOrders,
  customerAction: mock.customerAction,
}))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }))

const token = '00000000-0000-4000-8000-0000000000aa'
const order: ServiceOrder = {
  id: '00000000-0000-4000-8000-000000000001',
  customer: { name: 'Kund', email: null, phone: '123' },
  workshop: { name: 'Testverkstaden', email: 'verkstad@example.se', phone: null },
  bike: 'Crescent Elda',
  description: 'Kontrollera bromsar',
  status: 'awaiting_approval',
  quotes: [{ version: 1, description: 'Bromsbelägg', price_ore: 49900, currency: 'SEK', vat_included: true, created_at: '2026-09-07', decision: null }],
  history: [],
  revision: 1,
  created_at: '2026-09-07',
}
let client: QueryClient

const Workshop = () => <QueryClientProvider client={client}><MemoryRouter><Routes>
  <Route element={<Outlet context={{ workshop: { id: 'workshop', approved: true } }} />}>
    <Route path="/" element={<WorkshopServiceOrders />} />
  </Route>
</Routes></MemoryRouter></QueryClientProvider>

const Customer = () => <QueryClientProvider client={client}><HelmetProvider>
  <MemoryRouter initialEntries={[`/arbetsorder#token=${token}`]}><ServiceOrderCustomer /></MemoryRouter>
</HelmetProvider></QueryClientProvider>

beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear() })

describe('workshop service orders refetch', () => {
  it('keeps the list and unsaved drafts when a background refetch fails', async () => {
    mock.listOrders.mockResolvedValueOnce([order]).mockRejectedValueOnce(new Error('Nätverksfel'))
    render(<Workshop />)
    fireEvent.click(await screen.findByRole('button', { name: /Crescent Elda/ }))
    fireEvent.change(screen.getByLabelText('Arbete och delar som ingår'), { target: { value: 'Byt bromsbelägg' } })

    await act(() => client.refetchQueries())

    expect(await screen.findByRole('status')).toHaveTextContent('Kunde inte uppdatera')
    expect(screen.queryByText(/Arbetsordrarna kunde inte hämtas/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crescent Elda/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Arbete och delar som ingår')).toHaveValue('Byt bromsbelägg')

    mock.listOrders.mockResolvedValueOnce([order])
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Arbete och delar som ingår')).toHaveValue('Byt bromsbelägg')
  })

  it('still blocks with an error when the first load fails', async () => {
    mock.listOrders.mockRejectedValueOnce(new Error('Nätverksfel'))
    render(<Workshop />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Arbetsordrarna kunde inte hämtas.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('customer service order refetch', () => {
  it('keeps a loaded order and the typed name visible when a background refetch fails', async () => {
    mock.customerAction.mockResolvedValueOnce(order).mockRejectedValueOnce(new Error('Arbetsordern kunde inte hämtas'))
    render(<Customer />)
    fireEvent.change(await screen.findByLabelText('Ditt namn'), { target: { value: 'Anna' } })

    await act(() => client.refetchQueries())

    expect(await screen.findByRole('status')).toHaveTextContent('Kunde inte uppdatera')
    expect(screen.queryByText('Arbetsordern kunde inte hämtas')).not.toBeInTheDocument()
    expect(screen.getByText('Crescent Elda')).toBeInTheDocument()
    expect(screen.getByLabelText('Ditt namn')).toHaveValue('Anna')
  })

  it('still shows the error when the order has never loaded', async () => {
    mock.customerAction.mockRejectedValueOnce(new Error('Länken är ogiltig'))
    render(<Customer />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Länken är ogiltig')
    expect(screen.queryByText('Crescent Elda')).not.toBeInTheDocument()
  })
})
