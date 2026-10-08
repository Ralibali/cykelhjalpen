import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AUTH_TIMEOUT_MS } from '@/lib/authErrors'

const mock = vi.hoisted(() => ({ useAuth: vi.fn(), from: vi.fn(), query: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: mock.useAuth }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mock.from } }))

let auth: {
  isAuthenticated: boolean; loading: boolean; profile: { role: string } | null;
  user: { id: string } | null; profileError: string | null; refreshProfile: () => Promise<void>
}
function App() {
  return <MemoryRouter initialEntries={['/dashboard/verkstad']}><Routes>
    <Route path="/dashboard/verkstad" element={<ProtectedRoute role="workshop"><h1>Verkstadskonto</h1></ProtectedRoute>} />
    <Route path="/logga-in" element={<h1>Inloggning</h1>} />
    <Route path="/registrera/verkstad" element={<h1>Registrering</h1>} />
  </Routes></MemoryRouter>
}
beforeEach(() => {
  vi.clearAllMocks()
  auth = {
    isAuthenticated: true, loading: false, profile: { role: 'supplier' },
    user: { id: 'workshop-user' }, profileError: null, refreshProfile: vi.fn(),
  }
  mock.useAuth.mockImplementation(() => auth)
  mock.query.mockResolvedValue({ data: { id: 'workshop' }, error: null })
  mock.from.mockImplementation(() => {
    const request = {
      select: () => request, eq: () => request, abortSignal: () => request,
      maybeSingle: () => mock.query(),
    }
    return request
  })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('workshop access', () => {
  it('waits for the workshop after the initial empty session instead of redirecting to registration', async () => {
    auth = { ...auth, loading: true, isAuthenticated: false, user: null, profile: null }
    let resolve!: (value: unknown) => void
    mock.query.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const view = render(<App />)
    auth = { ...auth, loading: false, isAuthenticated: true, user: { id: 'workshop-user' }, profile: { role: 'supplier' } }
    view.rerender(<App />)
    expect(screen.queryByText('Registrering')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    await act(async () => resolve({ data: { id: 'workshop' }, error: null }))
    expect(screen.getByText('Verkstadskonto')).toBeInTheDocument()
  })

  it('offers retry on a database error without treating it as a missing workshop', async () => {
    mock.query.mockResolvedValueOnce({ data: null, error: { message: 'network error' } })
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Du behöver inte registrera dig på nytt')
    expect(screen.queryByText('Registrering')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }))
    expect(await screen.findByText('Verkstadskonto')).toBeInTheDocument()
  })

  it('does not retain workshop access when another user signs in', async () => {
    const view = render(<App />)
    await screen.findByText('Verkstadskonto')
    mock.query.mockReturnValueOnce(new Promise(() => {}))
    auth = { ...auth, user: { id: 'different-user' } }
    view.rerender(<App />)
    expect(screen.queryByText('Verkstadskonto')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('only redirects to registration after confirming that no workshop exists', async () => {
    mock.query.mockResolvedValueOnce({ data: null, error: null })
    render(<App />)
    expect(await screen.findByText('Registrering')).toBeInTheDocument()
  })

  it('shows an error after a timeout instead of an endless spinner', async () => {
    vi.useFakeTimers()
    mock.query.mockReturnValueOnce(new Promise(() => {}))
    render(<App />)
    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS) })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Registrering')).not.toBeInTheDocument()
  })

  it('preserves admin access without requiring a workshop record', async () => {
    auth = { ...auth, profile: { role: 'admin' } }
    render(<App />)
    await waitFor(() => expect(screen.getByText('Verkstadskonto')).toBeInTheDocument())
    expect(mock.from).not.toHaveBeenCalled()
  })
})
