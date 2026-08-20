import { assertEquals } from 'jsr:@std/assert'
import { isHasOffersNudgeDue } from './choice-nudge.ts'

const NOW = new Date('2026-08-20T12:00:00.000Z')
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString()

Deno.test('has_offers-knuff är inte redo efter 23 timmar', () => {
  assertEquals(isHasOffersNudgeDue(hoursAgo(23), NOW), false)
})

Deno.test('has_offers-knuff är redo efter 25 timmar', () => {
  assertEquals(isHasOffersNudgeDue(hoursAgo(25), NOW), true)
})
