import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/lib/i18n'
import { COOKIE_CONSENT_KEY } from '@/lib/analyticsConsent'
import RegisterWorkshopPage from './RegisterWorkshopPage'
import LoginPage from '@/pages/LoginPage'

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), setSession: vi.fn(), track: vi.fn(), plausible: vi.fn(), ads: vi.fn() }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: mocks.invoke }, auth: { setSession: mocks.setSession },
} }))
vi.mock('@/hooks/usePageTracking', () => ({ trackClick: mocks.track }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ signIn: vi.fn(), profile: null }) }))
vi.mock('@/lib/analytics', () => ({ trackEvent: mocks.plausible }))
vi.mock('@/lib/googleAds', () => ({ trackAdsConversion: mocks.ads }))
vi.mock('@/components/cykelhjalpen/CykelNavbar', () => ({ default: () => null }))
vi.mock('@/components/cykelhjalpen/CykelFooter', () => ({ default: () => null }))
vi.mock('@/components/Navbar', () => ({ default: () => null }))
vi.mock('@/components/Footer', () => ({ default: () => null }))
vi.mock('@/components/cykelhjalpen/Turnstile', () => ({ default: ({ onVerify, onExpire, onStatus, resetKey }: {
  onVerify: (token: string) => void; onExpire: () => void; onStatus: (status: string) => void; resetKey: number
}) => <div>
  <button type="button" onClick={() => { onVerify('local-test-token'); onStatus('ready') }}>Test security</button>
  <button type="button" onClick={() => { onExpire(); onStatus('expired') }}>Expire security</button>
  <span data-testid="reset-key">{resetKey}</span>
</div> }))

function mount(path = '/registrera/verkstad?stad=goteborg') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <LanguageProvider><HelmetProvider><MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/registrera/verkstad" element={<RegisterWorkshopPage />} />
        <Route path="/logga-in" element={<LoginPage />} />
        <Route path="/dashboard/verkstad" element={<p>Workshop dashboard</p>} />
      </Routes>
    </MemoryRouter></HelmetProvider></LanguageProvider>
  </QueryClientProvider>)
}

function fill() {
  fireEvent.change(screen.getByLabelText('Verkstadens namn'), { target: { value: 'Local Test Workshop' } })
  fireEvent.change(screen.getByLabelText('E-post'), { target: { value: 'workshop@example.test' } })
  fireEvent.change(screen.getByLabelText('Lösenord'), { target: { value: 'local-test-password' } })
  fireEvent.click(screen.getByRole('checkbox', { name: /plattformsavtalet/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: /databehandlingsavtalet/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Test security' }))
}
const submitButton = () => screen.getByRole('button', { name: 'Registrera verkstaden kostnadsfritt' })
const events = () => mocks.track.mock.calls.map(([event]) => event)

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ level: 'all' }))
  mocks.invoke.mockResolvedValue({ data: { userId: 'test-user', session: null, needsEmailConfirmation: true }, error: null })
  mocks.setSession.mockResolvedValue({ error: null })
})

describe('workshop registration journey with isolated service responses', () => {
  it('preserves the selected city and shows all open cities', () => {
    mount(); fill()
    expect(screen.getByRole('button', { name: 'Göteborg' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Umeå' })).toBeVisible()
    expect(submitButton()).toBeEnabled()
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('creates one application, keeps marketing optional and displays persistent confirmation steps', async () => {
    mount(); fill(); fireEvent.click(submitButton())
    await screen.findByRole('heading', { name: 'Kontot är skapat' })
    expect(screen.getByText(/Öppna bekräftelsemejlet/)).toBeVisible()
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    expect(mocks.invoke).toHaveBeenCalledWith('register-workshop', { body: expect.objectContaining({ city: 'Göteborg', terms_accepted: true, dpa_accepted: true, marketing_accepted: false, turnstile_token: 'local-test-token' }) })
    expect(events()).toEqual(['workshop_registration_started', 'workshop_registration_security_ready', 'workshop_registration_submit_clicked', 'workshop_registration_completed', 'workshop_registration_confirmation_required'])
    expect(JSON.stringify(mocks.track.mock.calls)).not.toMatch(/workshop@example|local-test-password|local-test-token|Local Test Workshop/)
  })

  it('does not count a session failure as a failed registration or offer duplicate registration', async () => {
    mocks.invoke.mockResolvedValue({ data: { userId: 'test-user', session: { access_token: 'test-access', refresh_token: 'test-refresh' } }, error: null })
    mocks.setSession.mockResolvedValue({ error: new Error('test session error') })
    mount(); fill(); fireEvent.click(submitButton())
    await screen.findByText(/Du behöver inte registrera verkstaden igen/)
    expect(events()).toContain('workshop_registration_completed')
    expect(events()).toContain('workshop_registration_session_failed')
    expect(events()).not.toContain('workshop_registration_failed')
    expect(events().filter(e => e === 'workshop_registration_completed')).toHaveLength(1)
  })

  it('continues to the dashboard when the returned session works', async () => {
    mocks.invoke.mockResolvedValue({ data: { userId: 'test-user', session: { access_token: 'test-access', refresh_token: 'test-refresh' } }, error: null })
    mount(); fill(); fireEvent.click(submitButton())
    await screen.findByText('Workshop dashboard')
    expect(events()).toContain('workshop_registration_session_ready')
  })

  it('explains requirements and stops city or DPA omissions before calling the service', () => {
    mount('/registrera/verkstad')
    expect(screen.getByText(/För att fortsätta:/)).toHaveTextContent('slutför säkerhetskontrollen')
    fill(); fireEvent.click(submitButton())
    expect(screen.getByRole('alert')).toHaveTextContent('Välj vilken stad')
    fireEvent.click(screen.getByRole('button', { name: 'Göteborg' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /databehandlingsavtalet/ }))
    fireEvent.submit(submitButton().closest('form')!)
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(events().filter(e => e === 'workshop_registration_validation_blocked')).toHaveLength(2)
  })

  it('records native validation categories without field contents', () => {
    mount(); fill()
    const email = screen.getByLabelText('E-post')
    fireEvent.change(email, { target: { value: 'private-invalid-input' } })
    fireEvent.invalid(email); fireEvent.invalid(email)
    expect(mocks.track).toHaveBeenCalledWith('workshop_registration_validation_blocked', expect.any(String), expect.objectContaining({ reason: 'email' }))
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain('private-invalid-input')
    expect(events().filter(e => e === 'workshop_registration_validation_blocked')).toHaveLength(1)
  })

  it('requires fresh security verification after a service failure', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new Error('isolated service failure') })
    mount(); fill(); fireEvent.click(submitButton())
    await waitFor(() => expect(screen.getByTestId('reset-key')).toHaveTextContent('1'))
    expect(submitButton()).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('isolated service failure')
    expect(events()).not.toContain('workshop_registration_completed')
    expect(events()).toContain('workshop_registration_failed')
  })

  it('blocks expired security tokens and duplicate submits', async () => {
    let resolve!: (value: unknown) => void
    mocks.invoke.mockReturnValue(new Promise(r => { resolve = r }))
    mount(); fill()
    fireEvent.click(screen.getByRole('button', { name: 'Expire security' }))
    expect(submitButton()).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Test security' }))
    const form = submitButton().closest('form')!
    fireEvent.submit(form); fireEvent.submit(form)
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    resolve({ data: { userId: 'test-user', session: null }, error: null })
    await screen.findByRole('heading', { name: 'Kontot är skapat' })
  })

  it('allows registration without analytics consent', async () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ level: 'necessary' }))
    mount(); fill(); fireEvent.click(submitButton())
    await screen.findByRole('heading', { name: 'Kontot är skapat' })
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    expect(mocks.track).not.toHaveBeenCalled()
    expect(mocks.plausible).not.toHaveBeenCalled()
    expect(mocks.ads).not.toHaveBeenCalled()
  })

  it('keeps confirmation instructions when the login page is reloaded', () => {
    mount('/logga-in?registrerad=verkstad')
    expect(screen.getByRole('heading', { name: 'Kontot är skapat' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Behöver du hjälp? Kontakta oss' })).toHaveAttribute('href', 'mailto:info@cykelhjalpen.se')
  })
})
