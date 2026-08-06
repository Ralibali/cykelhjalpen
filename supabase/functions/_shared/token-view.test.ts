import { assertEquals } from 'jsr:@std/assert'
import { toCustomerResponse } from './token-view.ts'

const base = {
  id: 'r1',
  message: 'Vi fixar det',
  estimated_price_min: 400,
  estimated_price_max: 600,
  estimated_time: '2 dagar',
  can_pickup: false,
  created_at: '2026-01-01T00:00:00Z',
  workshops: {
    id: 'w1',
    company_name: 'Cykelverkstan AB',
    phone: '0700000000',
    email: 'verkstad@example.com',
    website: 'https://example.com',
  },
}

Deno.test('skickad offert exponerar aldrig kontaktvägar', () => {
  const out = toCustomerResponse({ ...base, status: 'sent', paid: false })
  assertEquals(out.contact_unlocked, false)
  assertEquals(out.workshop?.company_name, 'Cykelverkstan AB')
  assertEquals(out.workshop?.phone, null)
  assertEquals(out.workshop?.email, null)
  assertEquals(out.workshop?.website, null)
})

Deno.test('vald men obetald vinnare exponerar inte kontaktvägar', () => {
  const out = toCustomerResponse({ ...base, status: 'won', paid: false })
  assertEquals(out.contact_unlocked, false)
  assertEquals(out.workshop?.phone, null)
  assertEquals(out.workshop?.email, null)
})

Deno.test('förlorad offert exponerar inte kontaktvägar', () => {
  const out = toCustomerResponse({ ...base, status: 'lost', paid: true })
  assertEquals(out.contact_unlocked, false)
  assertEquals(out.workshop?.phone, null)
})

Deno.test('reglerad vinnare låser upp kontaktvägar', () => {
  const out = toCustomerResponse({ ...base, status: 'won', paid: true })
  assertEquals(out.contact_unlocked, true)
  assertEquals(out.workshop?.phone, '0700000000')
  assertEquals(out.workshop?.email, 'verkstad@example.com')
  assertEquals(out.workshop?.website, 'https://example.com')
})
