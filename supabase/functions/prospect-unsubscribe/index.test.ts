import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { extractToken } from './index.ts'

const UUID = '11111111-2222-3333-4444-555555555555'
const url = (path = '/') => `https://example.supabase.co/functions/v1/prospect-unsubscribe${path}`

Deno.test('extractToken: läser token från ?token= i GET', async () => {
  const req = new Request(url(`?token=${UUID}`), { method: 'GET' })
  assertEquals(await extractToken(req), UUID)
})

Deno.test('extractToken: läser token från ?token= i POST utan body', async () => {
  const req = new Request(url(`?token=${UUID}`), { method: 'POST' })
  assertEquals(await extractToken(req), UUID)
})

Deno.test('extractToken: läser token från application/x-www-form-urlencoded body (RFC 8058-liknande)', async () => {
  const req = new Request(url('?other=x'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `token=${UUID}&List-Unsubscribe=One-Click`,
  })
  // ?other=x sätter ingen token så vi faller tillbaka på body
  // (extractToken prioriterar query, så här måste vi säkerställa fallback)
  const gotFromQuery = await extractToken(
    new Request(url(`?token=${UUID}`), { method: 'POST' }),
  )
  assertEquals(gotFromQuery, UUID)

  const gotFromBody = await extractToken(req)
  assertEquals(gotFromBody, UUID)
})

Deno.test('extractToken: läser token från application/json body', async () => {
  const req = new Request(url(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: UUID }),
  })
  assertEquals(await extractToken(req), UUID)
})

Deno.test('extractToken: returnerar null när token saknas', async () => {
  const req = new Request(url(), { method: 'POST' })
  assertEquals(await extractToken(req), null)
})

Deno.test('extractToken: prioriterar query över body', async () => {
  const req = new Request(url(`?token=${UUID}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: '00000000-0000-0000-0000-000000000000' }),
  })
  assertEquals(await extractToken(req), UUID)
})
