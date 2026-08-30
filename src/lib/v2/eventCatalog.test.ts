// Event catalog tests (S6 data-moat): the server events emitted by the
// instrumented V1 flows exist in the catalog, client names stay out of the
// server namespace, and PII keys are stripped from client payloads.
import { describe, expect, it } from 'vitest'

import {
  isV2ClientEventName,
  isV2ServerEventName,
  sanitizeClientPayload,
  V2_CLIENT_PAYLOAD_BLOCKED_KEYS,
  V2_SERVER_EVENT_NAMES,
} from '../../../supabase/functions/_shared/v2/config-schema'

describe('server event catalog covers the instrumented V1 flows', () => {
  it.each([
    'request.submitted',
    'request.approved',
    'request.rejected',
    'request.closed',
    'quote.sent',
    'quote.won',
    'quote.settled',
    'contact.unlocked',
    'workshop.first_quote',
  ])('%s is a valid server event', (name) => {
    expect(isV2ServerEventName(name)).toBe(true)
    expect(V2_SERVER_EVENT_NAMES).toContain(name)
  })

  it('client.* names are NOT accepted as server events (namespace separation)', () => {
    expect(isV2ServerEventName('client.wizard_started')).toBe(false)
    expect(isV2ServerEventName('client.quote_card_viewed')).toBe(false)
  })

  it('server names are NOT accepted as client events (hardened RPC boundary)', () => {
    expect(isV2ClientEventName('quote.settled')).toBe(false)
    expect(isV2ClientEventName('contact.unlocked')).toBe(false)
    expect(isV2ClientEventName('request.submitted')).toBe(false)
  })
})

describe('PII stripping (client payload whitelist)', () => {
  it('strips every blocked key and keeps analytics-safe fields', () => {
    const dirty: Record<string, unknown> = {}
    for (const key of V2_CLIENT_PAYLOAD_BLOCKED_KEYS) dirty[key] = 'pii-value'
    dirty.city_slug = 'linkoping'
    dirty.step = 2
    dirty.quotes_total = 3

    const clean = sanitizeClientPayload(dirty)
    expect(clean).toEqual({ city_slug: 'linkoping', step: 2, quotes_total: 3 })
    for (const key of Object.keys(clean)) {
      expect(V2_CLIENT_PAYLOAD_BLOCKED_KEYS).not.toContain(key)
    }
  })

  it('handles null/undefined payloads', () => {
    expect(sanitizeClientPayload(null)).toEqual({})
    expect(sanitizeClientPayload(undefined)).toEqual({})
  })
})
