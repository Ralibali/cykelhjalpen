import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { matchesImageSignature } from './image-signature.ts'

const bytes = (...values: number[]) => new Uint8Array(values)

Deno.test('matchesImageSignature: accepts real JPEG, PNG and WebP headers', () => {
  assertEquals(matchesImageSignature(bytes(0xff, 0xd8, 0xff, 0xe0), 'image/jpeg'), true)
  assertEquals(matchesImageSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0), 'image/png'), true)
  const webp = new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')
  assertEquals(matchesImageSignature(webp, 'image/webp'), true)
})

Deno.test('matchesImageSignature: rejects content that does not match the declared type', () => {
  const html = new TextEncoder().encode('<html><script>alert(1)</script>')
  assertEquals(matchesImageSignature(html, 'image/png'), false)
  assertEquals(matchesImageSignature(bytes(0xff, 0xd8, 0xff), 'image/png'), false)
  assertEquals(matchesImageSignature(new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WAVE'), 'image/webp'), false)
  assertEquals(matchesImageSignature(bytes(), 'image/jpeg'), false)
  assertEquals(matchesImageSignature(bytes(0xff, 0xd8, 0xff), 'image/gif'), false)
})
