import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { checkCronAuth, timingSafeEqual } from './cron-auth.ts'

const req = (headers: Record<string, string> = {}) => new Request('https://example.com', { method: 'POST', headers })
const env = { cronSecret: 'cron-secret-value', serviceRoleKey: 'service-role-key' }

Deno.test('checkCronAuth: correct cron secret is authorized', () => {
  assertEquals(checkCronAuth(req({ 'x-cron-secret': 'cron-secret-value' }), env), 'authorized')
})

Deno.test('checkCronAuth: service role bearer is authorized', () => {
  assertEquals(checkCronAuth(req({ Authorization: 'Bearer service-role-key' }), env), 'authorized')
})

Deno.test('checkCronAuth: missing or wrong credentials are rejected once a secret is configured', () => {
  assertEquals(checkCronAuth(req(), env), 'unauthorized')
  assertEquals(checkCronAuth(req({ 'x-cron-secret': 'cron-secret-valuX' }), env), 'unauthorized')
  assertEquals(checkCronAuth(req({ Authorization: 'Bearer anon-key' }), env), 'unauthorized')
})

Deno.test('checkCronAuth: empty configured values never match empty headers', () => {
  assertEquals(checkCronAuth(req({ 'x-cron-secret': '' }), { cronSecret: 'x', serviceRoleKey: '' }), 'unauthorized')
  assertEquals(checkCronAuth(req({ Authorization: 'Bearer ' }), { cronSecret: 'x', serviceRoleKey: '' }), 'unauthorized')
})

Deno.test('checkCronAuth: stays open while CRON_SECRET is not configured', () => {
  assertEquals(checkCronAuth(req(), { serviceRoleKey: 'service-role-key' }), 'unconfigured')
})

Deno.test('timingSafeEqual compares full strings', () => {
  assertEquals(timingSafeEqual('abc', 'abc'), true)
  assertEquals(timingSafeEqual('abc', 'abd'), false)
  assertEquals(timingSafeEqual('abc', 'abcd'), false)
})
