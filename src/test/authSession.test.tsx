import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { AUTH_TIMEOUT_MS } from '@/lib/authErrors'

const backend = vi.hoisted(() => ({
  getSession: vi.fn(), onAuthStateChange: vi.fn(), signInWithPassword: vi.fn(), from: vi.fn(),
}))
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: backend, from: backend.from } }))

type Result = { data: unknown; error: unknown }
let listener: (event: AuthChangeEvent, session: Session | null) => void
let query: ReturnType<typeof vi.fn>
const session = (id = 'workshop-user') => ({ user: { id }, access_token: 'test-only' }) as Session
const profile = (id = 'workshop-user') => ({ id, role: 'supplier' })
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  backend.getSession.mockResolvedValue({ data: { session: null }, error: null })
  backend.onAuthStateChange.mockImplementation(callback => {
    listener = callback
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
  query = vi.fn().mockResolvedValue({ data: profile(), error: null })
  backend.from.mockImplementation((table: string) => {
    let id: string
    const request = {
      select: () => request,
      eq: (_key: string, value: string) => { id = value; return request },
      abortSignal: () => request,
      maybeSingle: () => query(table, id),
      single: () => query(table, id),
    }
    return request
  })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('workshop session recovery', () => {
  it('loads a workshop profile without querying the unrelated supplier table', async () => {
    backend.getSession.mockResolvedValue({ data: { session: session() }, error: null })
    const { result } = renderHook(useAuth, { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile?.id).toBe('workshop-user')
    expect(backend.from.mock.calls.map(([table]) => table)).toEqual(['profiles'])
  })

  it('does not start database work inside the auth notification callback', async () => {
    const { result } = renderHook(useAuth, { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      listener('SIGNED_IN', session())
      expect(backend.from).not.toHaveBeenCalled()
    })
    await waitFor(() => expect(result.current.profile?.id).toBe('workshop-user'))
  })

  it.each([
    { data: null, error: { message: 'temporary failure' } },
    { data: null, error: null },
  ])('shows a recoverable error when the profile cannot be read: %j', async failed => {
    query.mockResolvedValueOnce(failed)
    backend.getSession.mockResolvedValue({ data: { session: session() }, error: null })
    const { result } = renderHook(useAuth, { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profileError).toContain('kunde inte läsa in ditt konto')
    expect(result.current.isAuthenticated).toBe(true)
    await act(async () => { await result.current.refreshProfile() })
    expect(result.current.profile?.id).toBe('workshop-user')
    expect(result.current.profileError).toBeNull()
  })

  it('ignores a profile response that arrives after sign-out', async () => {
    const pending = deferred<Result>()
    query.mockReturnValueOnce(pending.promise)
    backend.getSession.mockResolvedValue({ data: { session: session() }, error: null })
    const { result } = renderHook(useAuth, { wrapper: AuthProvider })
    await waitFor(() => expect(query).toHaveBeenCalled())
    act(() => listener('SIGNED_OUT', null))
    await act(async () => pending.resolve({ data: profile(), error: null }))
    expect(result.current.profile).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('does not let an older initial session replace a newer sign-in', async () => {
    const initial = deferred<{ data: { session: Session | null }; error: null }>()
    backend.getSession.mockReturnValueOnce(initial.promise)
    const { result } = renderHook(useAuth, { wrapper: AuthProvider })
    act(() => listener('SIGNED_IN', session()))
    await waitFor(() => expect(result.current.profile?.id).toBe('workshop-user'))
    await act(async () => initial.resolve({ data: { session: null }, error: null }))
    expect(result.current.user?.id).toBe('workshop-user')
  })

  it('stops waiting and offers recovery when a profile request never settles', async () => {
    vi.useFakeTimers()
    query.mockReturnValueOnce(new Promise(() => {}))
    backend.getSession.mockResolvedValue({ data: { session: session() }, error: null })
    const { result } = renderHook(useAuth, { wrapper: AuthProvider })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS + 1) })
    expect(result.current.loading).toBe(false)
    expect(result.current.profileError).toBeTruthy()
  })

  it('stops waiting if restoring the session never settles', async () => {
    vi.useFakeTimers()
    backend.getSession.mockReturnValueOnce(new Promise(() => {}))
    const { result } = renderHook(useAuth, { wrapper: AuthProvider })
    await act(async () => { await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS) })
    expect(result.current.loading).toBe(false)
    expect(result.current.profileError).toContain('Försök logga in igen')
  })

  it('returns network errors instead of leaving the login form submitting', async () => {
    backend.signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { result } = renderHook(useAuth, { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let error: Error | null = null
    await act(async () => { ({ error } = await result.current.signIn(' test@example.invalid ', 'test-only')) })
    expect(error).toBeInstanceOf(TypeError)
    expect(backend.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.invalid', password: 'test-only' })
  })
})
