// Attribution persistence tests (S6 data-moat): first-touch UTM survives
// across sessions (sessionStorage → localStorage fallback).
import { describe, expect, it } from 'vitest'

import {
  ATTRIBUTION_PERSISTENT_KEY,
  ATTRIBUTION_SESSION_KEY,
  captureAttribution,
  readAttribution,
  sanitizeTrackingPath,
  type AttributionStorage,
} from './attribution'

function memoryStorage(): AttributionStorage & { dump(): Record<string, string> } {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
    removeItem: (key) => { map.delete(key) },
    dump: () => Object.fromEntries(map),
  }
}

describe('captureAttribution', () => {
  it('captures utm params, landing path and referrer origin', () => {
    const session = memoryStorage()
    const result = captureAttribution(
      {
        search: '?utm_source=google&utm_medium=cpc&utm_campaign=verkstad-linkoping&gclid=abc',
        pathname: '/skicka-arende',
        referrer: 'https://www.google.se/search?q=cykelreparation',
        now: new Date('2026-08-31T10:00:00Z'),
      },
      session,
      memoryStorage(),
    )
    expect(result.utm_source).toBe('google')
    expect(result.utm_campaign).toBe('verkstad-linkoping')
    expect(result.gclid).toBe('abc')
    expect(result.landing_path).toBe('/skicka-arende')
    expect(result.first_referrer).toBe('https://www.google.se')
  })

  it('redacts view_token paths (no PII in attribution)', () => {
    const session = memoryStorage()
    const result = captureAttribution(
      { search: '', pathname: '/mitt-arende/SECRET-TOKEN', referrer: '', now: new Date() },
      session,
    )
    expect(result.landing_path).toBe('/mitt-arende/[redacted]')
  })

  it('persists first-touch to the persistent store so later sessions keep it', () => {
    const session1 = memoryStorage()
    const persistent = memoryStorage()
    captureAttribution(
      { search: '?utm_source=email&utm_campaign=new_quote', pathname: '/', now: new Date() },
      session1,
      persistent,
    )
    expect(persistent.dump()[ATTRIBUTION_PERSISTENT_KEY]).toBeDefined()

    // New session (empty sessionStorage): falls back to persisted first-touch…
    const session2 = memoryStorage()
    const read = readAttribution(session2, persistent)
    expect(read.utm_source).toBe('email')
    expect(read.utm_campaign).toBe('new_quote')

    // …and a fresh capture in the new session does NOT overwrite first-touch.
    const again = captureAttribution(
      { search: '?utm_source=direct', pathname: '/', now: new Date() },
      session2,
      persistent,
    )
    expect(again.utm_source).toBe('email')
  })

  it('keeps session attribution when one exists (first-touch wins)', () => {
    const session = memoryStorage()
    captureAttribution({ search: '?utm_source=a', pathname: '/', now: new Date() }, session)
    const second = captureAttribution({ search: '?utm_source=b', pathname: '/', now: new Date() }, session)
    expect(second.utm_source).toBe('a')
  })

  it('recovers from corrupted storage instead of throwing', () => {
    const session = memoryStorage()
    session.setItem(ATTRIBUTION_SESSION_KEY, '{broken json')
    const result = captureAttribution({ search: '?utm_source=x', pathname: '/', now: new Date() }, session)
    expect(result.utm_source).toBe('x')
    expect(session.dump()[ATTRIBUTION_SESSION_KEY]).not.toBe('{broken json')
  })
})

describe('sanitizeTrackingPath', () => {
  it('redacts mitt-arende tokens, keeps other paths', () => {
    expect(sanitizeTrackingPath('/mitt-arende/abc-def')).toBe('/mitt-arende/[redacted]')
    expect(sanitizeTrackingPath('/cykelreparation')).toBe('/cykelreparation')
  })
})
