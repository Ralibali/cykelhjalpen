import { FunctionsHttpError } from '@supabase/supabase-js'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import QuoteMagicLinkPage from '@/pages/cykelhjalpen/workshop/QuoteMagicLinkPage'

const mock = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mock.invoke } } }))
vi.mock('@/lib/v2/pricing', () => ({ useV2Pricing: () => ({ amountOre: 5000 }), formatKrFromOre: () => '50' }))
vi.mock('@/components/cykelhjalpen/CykelNavbar', () => ({ default: () => null }))
vi.mock('@/components/cykelhjalpen/CykelFooter', () => ({ default: () => null }))

const httpError = (body: unknown, status = 400) => new FunctionsHttpError(new Response(JSON.stringify(body), { status }))
const failed = (body: unknown, status = 400) => ({ data: null, error: httpError(body, status) })

const quoteLink = {
  data: {
    ok: true,
    already_quoted: false,
    workshop: { company_name: 'Testverkstaden', city: 'Linköping' },
    request: {
      bike_type: 'Elcykel', repair_category: 'Bromsar', description: 'Bromsarna tar dåligt.', area: null, postcode: null,
      urgency: null, can_drop_off: true, wants_pickup: false, status: 'has_offers', created_at: '2026-10-01T10:00:00Z',
      customer_language: 'sv', city: 'Linköping', images: [],
    },
  },
  error: null,
}

const mount = () => render(<HelmetProvider><MemoryRouter initialEntries={['/offert/token-1234567890abcdef']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <Routes><Route path="/offert/:token" element={<QuoteMagicLinkPage />} /></Routes>
</MemoryRouter></HelmetProvider>)

const submitQuote = async (result: unknown) => {
  mock.invoke.mockImplementation(async (name: string) => name === 'submit-workshop-quote-link' ? result : quoteLink)
  mount()
  fireEvent.change(await screen.findByLabelText('Kort meddelande till kunden'), { target: { value: 'Vi byter bromsbelägg och justerar bromsarna.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Skicka offerten – kostnadsfritt' }))
}

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('quote magic link page', () => {
  it('shows the disabled state when the feature is switched off', async () => {
    mock.invoke.mockResolvedValue(failed({ error: 'Funktionen är avstängd just nu.', reason: 'flag_off', disabled: true }, 403))
    mount()
    expect(await screen.findByRole('heading', { name: 'Funktionen är avstängd' })).toBeInTheDocument()
    expect(screen.getByText('Funktionen är avstängd just nu.')).toBeInTheDocument()
  })

  it('explains why the link cannot be opened', async () => {
    mock.invoke.mockResolvedValue(failed({ error: 'Länken har gått ut. Be Cykelhjälpen skicka en ny.', reason: 'expired' }))
    mount()
    expect(await screen.findByRole('heading', { name: 'Länken fungerar inte' })).toBeInTheDocument()
    expect(screen.getByText('Länken har gått ut. Be Cykelhjälpen skicka en ny.')).toBeInTheDocument()
  })

  it.each([
    ['used', { error: 'Den här länken är redan använd.', reason: 'used' }],
    ['request_closed', { error: 'Ärendet är stängt och tar inte emot fler offerter.', reason: 'request_closed' }],
    ['full', { error: 'Ärendet är fullt – tre verkstäder har redan svarat.' }],
  ])('stops asking to retry when the quote can never be sent (%s)', async (_case, body) => {
    await submitQuote(failed(body))
    expect(await screen.findByRole('heading', { name: 'Länken fungerar inte' })).toBeInTheDocument()
    expect(screen.getByText(body.error)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skicka offerten – kostnadsfritt' })).not.toBeInTheDocument()
  })

  it('shows the disabled state when the feature is switched off while quoting', async () => {
    await submitQuote(failed({ error: 'Funktionen är avstängd just nu.', reason: 'flag_off', disabled: true }, 403))
    expect(await screen.findByRole('heading', { name: 'Funktionen är avstängd' })).toBeInTheDocument()
  })

  it('keeps the form and shows the server message for a fixable error', async () => {
    await submitQuote(failed({ error: 'Ogiltiga uppgifter.' }))
    expect(await screen.findByText('Ogiltiga uppgifter.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skicka offerten – kostnadsfritt' })).toBeInTheDocument()
    expect(screen.getByLabelText('Kort meddelande till kunden')).toHaveValue('Vi byter bromsbelägg och justerar bromsarna.')
  })
})
