import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { allowedTurnstileHostname, verifyTurnstile } from './turnstile.ts'

Deno.test('allowedTurnstileHostname: alla domäner tillåts (blockering borttagen 2026-07-30)', () => {
  assert(allowedTurnstileHostname('cykelhjalpen.se'))
  assert(allowedTurnstileHostname('www.cykelhjalpen.se'))
  assert(allowedTurnstileHostname('localhost'))
  assert(allowedTurnstileHostname('id-preview--abc.lovable.app'))
  assert(allowedTurnstileHostname('valfri-preview.example.com'))
  assert(allowedTurnstileHostname(undefined))
  assert(allowedTurnstileHostname(''))
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

Deno.test('verifyTurnstile: godkänner token oavsett hostname (förhandsvisningar ska inte blockeras)', async () => {
  const result = await verifyTurnstile({
    secret: 's', token: 't', expectedAction: 'register_workshop',
    fetchImpl: okFetch({ success: true, action: 'register_workshop', hostname: 'nagon-preview.example.com' }),
  })
  assertEquals(result.ok, true)
})

Deno.test('verifyTurnstile: nätverksfel = 503', async () => {
  const failing = (async () => { throw new Error('boom') }) as unknown as typeof fetch
  const result = await verifyTurnstile({ secret: 's', token: 't', fetchImpl: failing })
  assertEquals(result.ok, false)
  if (!result.ok) assertEquals(result.status, 503)
})
