import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationBell from '@/components/NotificationBell'

const mock = vi.hoisted(() => ({
  useAuth: vi.fn(), from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn(), subscribe: vi.fn(), query: vi.fn(),
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: mock.useAuth }))
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mock.from, channel: mock.channel, removeChannel: mock.removeChannel },
}))

const notification = {
  id: 'n1', title: 'Ny offert', message: null, link: null, is_read: false, created_at: '2026-10-15T10:00:00Z', type: 'quote',
}
let auth: { user: { id: string } | null }
let onInsert: (payload: { new: unknown }) => void
const App = () => <MemoryRouter><NotificationBell /></MemoryRouter>

beforeEach(() => {
  vi.clearAllMocks()
  auth = { user: { id: 'workshop-user' } }
  mock.useAuth.mockImplementation(() => auth)
  mock.query.mockResolvedValue({ data: [], error: null })
  mock.from.mockImplementation(() => {
    const request = { select: () => request, eq: () => request, order: () => request, limit: () => mock.query() }
    return request
  })
  mock.channel.mockImplementation(() => {
    const channel = {
      on: (_type: string, _filter: unknown, callback: typeof onInsert) => { onInsert = callback; return channel },
      subscribe: () => { mock.subscribe(); return channel },
    }
    return channel
  })
})
afterEach(cleanup)

describe('notification bell', () => {
  it('keeps the live subscription when a token refresh replaces the user object', async () => {
    const view = render(<App />)
    await act(async () => {})
    auth = { user: { id: 'workshop-user' } }
    view.rerender(<App />)
    await act(async () => {})
    expect(mock.channel).toHaveBeenCalledOnce()
    expect(mock.subscribe).toHaveBeenCalledOnce()
    expect(mock.removeChannel).not.toHaveBeenCalled()
    expect(mock.query).toHaveBeenCalledOnce()
    act(() => onInsert({ new: notification }))
    expect(screen.getByRole('button', { name: 'Notiser (1 olästa)' })).toBeInTheDocument()
  })

  it('subscribes again for a different user', async () => {
    const view = render(<App />)
    await act(async () => {})
    auth = { user: { id: 'other-user' } }
    view.rerender(<App />)
    await act(async () => {})
    expect(mock.removeChannel).toHaveBeenCalledOnce()
    expect(mock.channel).toHaveBeenLastCalledWith('notif-other-user')
    expect(mock.query).toHaveBeenCalledTimes(2)
  })
})
