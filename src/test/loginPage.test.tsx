import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '@/pages/LoginPage'

const mock = vi.hoisted(() => ({ useAuth: vi.fn(), signIn: vi.fn(), refreshProfile: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: mock.useAuth }))
vi.mock('@/components/Navbar', () => ({ default: () => null }))
vi.mock('@/components/Footer', () => ({ default: () => null }))
vi.mock('@/components/cykelhjalpen/CykelNavbar', () => ({ default: () => null }))
vi.mock('@/components/cykelhjalpen/CykelFooter', () => ({ default: () => null }))
vi.mock('@/lib/seoHelpers', () => ({ setSEOMeta: vi.fn() }))

let auth: {
  user: { id: string } | null; profile: { role: string } | null;
  loading: boolean; profileError: string | null
}
const App = () => <MemoryRouter initialEntries={['/logga-in']}><Routes>
  <Route path="/logga-in" element={<LoginPage />} />
  <Route path="/dashboard/verkstad" element={<h1>Verkstadskonto</h1>} />
</Routes></MemoryRouter>

beforeEach(() => {
  vi.clearAllMocks()
  auth = { user: null, profile: null, loading: false, profileError: null }
  mock.useAuth.mockImplementation(() => ({ ...auth, signIn: mock.signIn, refreshProfile: mock.refreshProfile }))
})
afterEach(cleanup)

function submit() {
  fireEvent.change(screen.getByLabelText('E-post'), { target: { value: 'test@example.invalid' } })
  fireEvent.change(screen.getByLabelText('Lösenord'), { target: { value: 'test-only' } })
  fireEvent.click(screen.getByRole('button', { name: /^Logga in$/ }))
}

describe('workshop login page', () => {
  it('keeps confirmation guidance visible next to the form', async () => {
    mock.signIn.mockResolvedValueOnce({ error: { code: 'email_not_confirmed' } })
    render(<App />)
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('bekräftelsemejlet')
    expect(screen.getByRole('button', { name: /^Logga in$/ })).toBeEnabled()
  })

  it('re-enables the form and shows a useful error after a rejected request', async () => {
    mock.signIn.mockRejectedValueOnce(new Error('fetch failed'))
    render(<App />)
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('internetanslutning')
    expect(screen.getByRole('button', { name: /^Logga in$/ })).toBeEnabled()
  })

  it('waits for account loading before opening the workshop dashboard', async () => {
    auth = { ...auth, user: { id: 'workshop-user' }, profile: { role: 'supplier' }, loading: true }
    const view = render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('Läser in ditt konto')
    expect(screen.queryByText('Verkstadskonto')).not.toBeInTheDocument()
    auth = { ...auth, loading: false }
    view.rerender(<App />)
    expect(await screen.findByText('Verkstadskonto')).toBeInTheDocument()
  })

  it('offers profile recovery instead of showing successful sign-in prematurely', async () => {
    auth = { ...auth, user: { id: 'workshop-user' }, profileError: 'Kunde inte läsa in ditt konto.' }
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('Kunde inte läsa in ditt konto')
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }))
    await waitFor(() => expect(mock.refreshProfile).toHaveBeenCalledOnce())
    expect(screen.queryByText('Verkstadskonto')).not.toBeInTheDocument()
  })
})
