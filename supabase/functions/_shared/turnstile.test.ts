import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { allowedTurnstileHostname, verifyTurnstile } from './turnstile.ts'

Deno.test('allowedTurnstileHostname: godkänner cykelhjalpen.se + www + localhost + preview', () => {
  assert(allowedTurnstileHostname('cykelhjalpen.se'))
  assert(allowedTurnstileHostname('www.cykelhjalpen.se'))
  assert(allowedTurnstileHostname('CYKELHJALPEN.SE'))
  assert(allowedTurnstileHostname('localhost'))
  assert(allowedTurnstileHostname('id-preview--abc.lovable.app'))
})

Deno.test('allowedTurnstileHostname: avvisar okänd domän', () => {
  assertEquals(allowedTurnstileHostname('evil.example.com'), false)
  assertEquals(allowedTurnstileHostname('cykelhjalpen.se.evil.com'), false)
})

Deno.test('allowedTurnstileHostname: tomt hostname ignoreras (Cloudflare skickar inte alltid)', () => {
  assert(allowedTurnstileHostname(undefined))
  assert(allowedTurnstileHostname(''))
})

const okFetch = (payload: object): typeof fetch =>
  ((async () => new Response(JSON.stringify(payload), { status: 200 })) as unknown as typeof fetch)

Deno.test('verifyTurnstile: godkänner giltig token', async () => {
  const result = await verifyTurnstile({
    secret: 's', token: 't', expectedAction: 'register_workshop',
    fetchImpl: okFetch({ success: true, action: 'register_workshop', hostname: 'cykelhjalpen.se' }),
  })
  assertEquals(result.ok, true)
})

Deno.test('verifyTurnstile: avvisar fel action', async () => {
  const result = await verifyTurnstile({
    secret: 's', token: 't', expectedAction: 'register_workshop',
    fetchImpl: okFetch({ success: true, action: 'submit_bike_request', hostname: 'cykelhjalpen.se' }),
  })
  assertEquals(result.ok, false)
  if (!result.ok) assertEquals(result.status, 403)
})

Deno.test('verifyTurnstile: avvisar okänt hostname', async () => {
  const result = await verifyTurnstile({
    secret: 's', token: 't', expectedAction: 'register_workshop',
    fetchImpl: okFetch({ success: true, action: 'register_workshop', hostname: 'evil.example.com' }),
  })
  assertEquals(result.ok, false)
})

Deno.test('verifyTurnstile: nätverksfel = 503', async () => {
  const failing = (async () => { throw new Error('boom') }) as unknown as typeof fetch
  const result = await verifyTurnstile({ secret: 's', token: 't', fetchImpl: failing })
  assertEquals(result.ok, false)
  if (!result.ok) assertEquals(result.status, 503)
})
