import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkshopLayout from '@/components/cykelhjalpen/WorkshopLayout'
import { AUTH_TIMEOUT_MS } from '@/lib/authErrors'

const mock = vi.hoisted(() => ({ useAuth: vi.fn(), from: vi.fn(), query: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: mock.useAuth }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mock.from } }))
vi.mock('@/components/NotificationBell', () => ({ default: () => null }))
vi.mock('@/components/workshop/LowBalanceAlert', () => ({ LowBalanceAlert: () => null }))

const userId = 'workshop-user'
const workshop = { id: 'workshop', company_name: 'Testverkstaden', city: 'Linköping', approved: true }
let auth: { user: { id: string } | null; loading: boolean; signOut: () => Promise<void> }

const App = () => <MemoryRouter initialEntries={['/dashboard/verkstad']}><Routes>
  <Route path="/dashboard/verkstad" element={<WorkshopLayout />}>
    <Route index element={<h2>Panelinnehåll</h2>} />
  </Route>
</Routes></MemoryRouter>

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem(`cykelhjalpen_workshop_city_confirmed_${userId}`, '1')
  auth = { user: { id: userId }, loading: false, signOut: vi.fn() }
  mock.useAuth.mockImplementation(() => auth)
  mock.query.mockResolvedValue({ data: workshop, error: null })
  mock.from.mockImplementation(() => {
    const request = { select: () => request, eq: () => request, maybeSingle: () => mock.query() }
    return request
  })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('workshop dashboard layout', () => {
  it('opens the dashboard for a registered workshop', async () => {
    render(<App />)
    expect(await screen.findByText('Panelinnehåll')).toBeInTheDocument()
  })

  it('offers retry on a database error instead of asking a registered workshop to sign up', async () => {
    mock.query.mockResolvedValueOnce({ data: null, error: { message: 'network error' } })
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Du behöver inte registrera dig på nytt')
    expect(screen.queryByText('Registrera verkstad')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }))
    expect(await screen.findByText('Panelinnehåll')).toBeInTheDocument()
  })

  it('shows an error after a timeout instead of an endless spinner', async () => {
    vi.useFakeTimers()
    mock.query.mockReturnValueOnce(new Promise(() => {}))
    render(<App />)
    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS) })
    expect(screen.getByRole('alert')).toHaveTextContent('Du behöver inte registrera dig på nytt')
  })

  it('does not reload the workshop when a token refresh replaces the user object', async () => {
    const view = render(<App />)
    await screen.findByText('Panelinnehåll')
    auth = { ...auth, user: { id: userId } }
    view.rerender(<App />)
    expect(screen.getByText('Panelinnehåll')).toBeInTheDocument()
    expect(mock.query).toHaveBeenCalledOnce()
  })

  it('still offers registration when the account has no workshop', async () => {
    mock.query.mockResolvedValueOnce({ data: null, error: null })
    render(<App />)
    expect(await screen.findByText('Registrera verkstad')).toBeInTheDocument()
  })
})
