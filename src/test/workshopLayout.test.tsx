import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WorkshopLayout, { type WorkshopOutletContext } from '@/components/cykelhjalpen/WorkshopLayout'
import WorkshopSettings from '@/pages/cykelhjalpen/workshop/WorkshopSettings'
import { AUTH_TIMEOUT_MS } from '@/lib/authErrors'

const mock = vi.hoisted(() => ({ useAuth: vi.fn(), from: vi.fn(), query: vi.fn(), update: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: mock.useAuth }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mock.from } }))
vi.mock('@/hooks/useV2Flag', () => ({ useV2Flag: () => false }))
vi.mock('@/components/NotificationBell', () => ({ default: () => null }))
vi.mock('@/components/workshop/LowBalanceAlert', () => ({ LowBalanceAlert: () => null }))
vi.mock('@/components/cykelhjalpen/WorkshopRetentionPanel', () => ({ default: () => null }))

const userId = 'workshop-user'
const confirmedKey = `cykelhjalpen_workshop_city_confirmed_${userId}`
// A V1 row: production has never had the optional V2 columns bio_short and public_profile_opt_in.
const workshop = { id: 'workshop', company_name: 'Testverkstaden', city: 'Uppsala', approved: true, phone: '010-1' }
let auth: { user: { id: string; user_metadata?: Record<string, unknown> } | null; loading: boolean; signOut: () => Promise<void> }

function PublicProfileFlag() {
  const { workshop } = useOutletContext<WorkshopOutletContext>()
  return <p>Publik profil: {String(workshop.public_profile_opt_in)}</p>
}

const App = ({ path = '/dashboard/verkstad' }: { path?: string }) => <MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/dashboard/verkstad" element={<WorkshopLayout />}>
    <Route index element={<h2>Panelinnehåll</h2>} />
    <Route path="profil" element={<PublicProfileFlag />} />
    <Route path="installningar" element={<WorkshopSettings />} />
  </Route>
</Routes></MemoryRouter>

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  auth = { user: { id: userId }, loading: false, signOut: vi.fn() }
  mock.useAuth.mockImplementation(() => auth)
  mock.query.mockResolvedValue({ data: workshop, error: null })
  mock.update.mockResolvedValue({ error: null })
  mock.from.mockImplementation(() => {
    let columns = ''
    const request = {
      select: (value: string) => { columns = value; return request },
      eq: () => request,
      // PostgREST rejects the whole read when it names a column the table lacks.
      maybeSingle: () => /bio_short|public_profile_opt_in/.test(columns)
        ? Promise.resolve({ data: null, error: { code: '42703', message: 'column workshops.bio_short does not exist' } })
        : mock.query(),
      update: (values: unknown) => ({ eq: () => mock.update(values) }),
    }
    return request
  })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('workshop dashboard layout', () => {
  it('opens the dashboard on a database without the optional V2 columns', async () => {
    render(<App path="/dashboard/verkstad/profil" />)
    expect(await screen.findByText('Publik profil: false')).toBeInTheDocument()
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

describe('city confirmation', () => {
  it('does not ask an approved workshop again on a new device', async () => {
    render(<App />)
    expect(await screen.findByText('Panelinnehåll')).toBeInTheDocument()
  })

  it('does not ask a pending workshop whose sign-up city matches', async () => {
    mock.query.mockResolvedValueOnce({ data: { ...workshop, approved: false }, error: null })
    auth = { ...auth, user: { id: userId, user_metadata: { city: 'Uppsala' } } }
    render(<App />)
    expect(await screen.findByText('Väntar på godkännande')).toBeInTheDocument()
  })

  it.each([
    ['without a sign-up city', {}],
    ['whose sign-up city differs', { city: 'Lund' }],
  ])('still asks a pending workshop %s', async (_case, metadata) => {
    mock.query.mockResolvedValueOnce({ data: { ...workshop, approved: false }, error: null })
    auth = { ...auth, user: { id: userId, user_metadata: metadata } }
    render(<App />)
    expect(await screen.findByText('Bekräfta verkstadens stad')).toBeInTheDocument()
  })

  it('remembers a confirmation on this device', async () => {
    localStorage.setItem(confirmedKey, '1')
    mock.query.mockResolvedValueOnce({ data: { ...workshop, approved: false }, error: null })
    render(<App />)
    expect(await screen.findByText('Väntar på godkännande')).toBeInTheDocument()
  })
})

describe('workshop settings', () => {
  it('keeps saved values after visiting another dashboard page', async () => {
    render(<App path="/dashboard/verkstad/installningar" />)
    fireEvent.change(await screen.findByLabelText('Telefon'), { target: { value: '070-1234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Spara' }))
    await waitFor(() => expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ phone: '070-1234567' })))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Spara' })).toBeEnabled())

    fireEvent.click(screen.getByRole('link', { name: 'Affärsöversikt' }))
    await screen.findByText('Panelinnehåll')
    fireEvent.click(screen.getByRole('link', { name: 'Verkstadsprofil' }))
    expect(await screen.findByLabelText('Telefon')).toHaveValue('070-1234567')
  })

  it('shows the city of a workshop outside the four guide cities', async () => {
    mock.query.mockResolvedValueOnce({ data: { ...workshop, city: 'Örebro' }, error: null })
    render(<App path="/dashboard/verkstad/installningar" />)
    expect(await screen.findByRole('button', { name: 'Örebro' })).toHaveAttribute('aria-pressed', 'true')
  })
})
