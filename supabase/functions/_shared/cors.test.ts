import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { corsFor, CYKELHJALPENS_SITE_ORIGIN } from './cors.ts'

Deno.test('corsFor: production, www, and localhost are allowed', () => {
  const prod = corsFor(new Request('https://example.com', { headers: { origin: 'https://cykelhjalpen.se' } }))
  assertEquals(prod['Access-Control-Allow-Origin'], 'https://cykelhjalpen.se')

  const www = corsFor(new Request('https://example.com', { headers: { origin: 'https://www.cykelhjalpen.se' } }))
  assertEquals(www['Access-Control-Allow-Origin'], 'https://www.cykelhjalpen.se')

  const local = corsFor(new Request('https://example.com', { headers: { origin: 'http://localhost:8080' } }))
  assertEquals(local['Access-Control-Allow-Origin'], 'http://localhost:8080')
})

Deno.test('corsFor: lovable.app and vercel.app are not allowed', () => {
  const lovable = corsFor(new Request('https://example.com', { headers: { origin: 'https://cykelhjalpen.lovable.app' } }))
  assertEquals(lovable['Access-Control-Allow-Origin'], CYKELHJALPENS_SITE_ORIGIN)

  const preview = corsFor(new Request('https://example.com', { headers: { origin: 'https://id-preview--abc.lovable.app' } }))
  assertEquals(preview['Access-Control-Allow-Origin'], CYKELHJALPENS_SITE_ORIGIN)

  const vercel = corsFor(new Request('https://example.com', { headers: { origin: 'https://project.vercel.app' } }))
  assertEquals(vercel['Access-Control-Allow-Origin'], CYKELHJALPENS_SITE_ORIGIN)
})
