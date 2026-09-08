import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Turnstile from './Turnstile'

const invoke = vi.hoisted(() => vi.fn())
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }))
vi.mock('@/lib/i18n', () => { const t = (text: string) => text; return { useT: () => t } })

beforeEach(() => {
  vi.useFakeTimers()
  invoke.mockReset().mockResolvedValue({ data: { siteKey: 'test-site-key' } })
  delete window.turnstile
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  delete window.turnstile
  document.querySelectorAll('script[src*="turnstile"]').forEach(s => s.remove())
})

it('times out a newly inserted stalled script and permits a fresh retry', async () => {
  const status = vi.fn()
  render(<Turnstile onVerify={vi.fn()} onStatus={status} action="register_workshop" />)
  await act(async () => {})
  const original = document.querySelector('script[src*="turnstile"]')!
  expect(original).not.toBeNull()
  await act(async () => { await vi.advanceTimersByTimeAsync(12000) })
  expect(screen.getByRole('alert')).toHaveTextContent('Säkerhetskontrollen kunde inte laddas')
  expect(original.isConnected).toBe(false)
  expect(status).toHaveBeenCalledWith('failed')
  fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }))
  await act(async () => {})
  const replacement = document.querySelector('script[src*="turnstile"]')!
  expect(replacement).not.toBe(original)
  window.turnstile = { render: vi.fn(() => 'widget'), remove: vi.fn(), reset: vi.fn() }
  await act(async () => { fireEvent.load(replacement) })
  expect(window.turnstile.render).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ action: 'register_workshop' }))
  expect(screen.queryByRole('alert')).toBeNull()
}, 20000)

it('reports actual verification and expiration, and ignores stale callbacks after unmount', async () => {
  let options: Record<string, unknown> = {}
  window.turnstile = { render: vi.fn((_el, opts) => { options = opts; return 'widget' }), remove: vi.fn(), reset: vi.fn() }
  const verify = vi.fn(); const expire = vi.fn(); const status = vi.fn()
  const view = render(<Turnstile onVerify={verify} onExpire={expire} onStatus={status} />)
  await act(async () => {})
  expect(status).not.toHaveBeenCalled()
  act(() => { (options.callback as (token: string) => void)('test-token') })
  expect(verify).toHaveBeenCalledWith('test-token')
  expect(status).toHaveBeenCalledWith('ready')
  act(() => { (options['expired-callback'] as () => void)() })
  expect(status).toHaveBeenLastCalledWith('expired')
  view.unmount()
  ;(options.callback as (token: string) => void)('stale-token')
  expect(verify).toHaveBeenCalledTimes(1)
})
