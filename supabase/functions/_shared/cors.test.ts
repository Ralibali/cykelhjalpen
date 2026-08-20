import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { allowedPublicOrigin, corsFor, CYKELHJALPENS_SITE_ORIGIN } from './cors.ts'

Deno.test('allowedPublicOrigin: production and www stay as-is', () => {
  assertEquals(allowedPublicOrigin('https://cykelhjalpen.se'), 'https://cykelhjalpen.se')
  assertEquals(allowedPublicOrigin('https://www.cykelhjalpen.se'), 'https://www.cykelhjalpen.se')
})

Deno.test('allowedPublicOrigin: localhost is allowed for local Stripe/auth', () => {
  assertEquals(allowedPublicOrigin('http://localhost'), 'http://localhost')
  assertEquals(allowedPublicOrigin('http://localhost:8080'), 'http://localhost:8080')
})

Deno.test('allowedPublicOrigin: preview hosts fall back to production', () => {
  assertEquals(allowedPublicOrigin('https://cykelhjalpen.lovable.app'), CYKELHJALPENS_SITE_ORIGIN)
  assertEquals(allowedPublicOrigin('https://id-preview--abc.lovable.app'), CYKELHJALPENS_SITE_ORIGIN)
  assertEquals(allowedPublicOrigin('https://cykelhjalpen.vercel.app'), CYKELHJALPENS_SITE_ORIGIN)
  assertEquals(allowedPublicOrigin('https://ralibalis-projects.vercel.app'), CYKELHJALPENS_SITE_ORIGIN)
  assertEquals(allowedPublicOrigin('https://evil.example'), CYKELHJALPENS_SITE_ORIGIN)
  assertEquals(allowedPublicOrigin(null), CYKELHJALPENS_SITE_ORIGIN)
  assertEquals(allowedPublicOrigin(''), CYKELHJALPENS_SITE_ORIGIN)
})

Deno.test('corsFor: reflects only allowed origins', () => {
  const prod = corsFor(new Request('https://example.com', { headers: { origin: 'https://cykelhjalpen.se' } }))
  assertEquals(prod['Access-Control-Allow-Origin'], 'https://cykelhjalpen.se')

  const preview = corsFor(new Request('https://example.com', { headers: { origin: 'https://cykelhjalpen.lovable.app' } }))
  assertEquals(preview['Access-Control-Allow-Origin'], CYKELHJALPENS_SITE_ORIGIN)

  const vercel = corsFor(new Request('https://example.com', { headers: { origin: 'https://project.vercel.app' } }))
  assertEquals(vercel['Access-Control-Allow-Origin'], CYKELHJALPENS_SITE_ORIGIN)
})
