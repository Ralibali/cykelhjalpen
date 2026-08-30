// UTM helper tests + edge/frontend mirror parity (S6 data-moat).
import { describe, expect, it } from 'vitest'

import { sanitizeUtmValue as edgeSanitize, withUtmParams as edgeWithUtm } from '../../../supabase/functions/_shared/v2/utm'
import { sanitizeUtmValue, withUtmParams } from './utm'

describe('withUtmParams', () => {
  it('appends utm params to a bare URL', () => {
    expect(withUtmParams('https://cykelhjalpen.se/mitt-arende/abc', { source: 'email', campaign: 'new_quote' }))
      .toBe('https://cykelhjalpen.se/mitt-arende/abc?utm_source=email&utm_medium=email&utm_campaign=new_quote')
  })

  it('preserves existing query params and hash', () => {
    const url = withUtmParams('https://cykelhjalpen.se/skicka-arende?stad=Uppsala#form', {
      source: 'email',
      campaign: 'request_expired',
    })
    const parsed = new URL(url)
    expect(parsed.searchParams.get('stad')).toBe('Uppsala')
    expect(parsed.searchParams.get('utm_source')).toBe('email')
    expect(parsed.searchParams.get('utm_campaign')).toBe('request_expired')
    expect(parsed.hash).toBe('#form')
  })

  it('overwrites existing utm params (last write wins)', () => {
    const url = withUtmParams('https://cykelhjalpen.se/?utm_source=old', { source: 'email', campaign: 'c' })
    expect(new URL(url).searchParams.get('utm_source')).toBe('email')
  })

  it('sanitizes unsafe values into slugs', () => {
    const url = withUtmParams('https://cykelhjalpen.se/', {
      source: 'E-Mail <script>',
      campaign: 'Ny offert 2026!',
      content: 'knapp',
    })
    const parsed = new URL(url)
    expect(parsed.searchParams.get('utm_source')).toBe('e-mail_script')
    expect(parsed.searchParams.get('utm_campaign')).toBe('ny_offert_2026')
    expect(parsed.searchParams.get('utm_content')).toBe('knapp')
  })

  it('returns the original URL on empty source/campaign or invalid URL (never throws)', () => {
    expect(withUtmParams('not a url', { source: 'email', campaign: 'x' })).toBe('not a url')
    expect(withUtmParams('https://cykelhjalpen.se/', { source: '', campaign: 'x' }))
      .toBe('https://cykelhjalpen.se/')
    expect(withUtmParams('', { source: 'email', campaign: 'x' })).toBe('')
  })

  it('defaults medium to email and drops empty content', () => {
    const url = withUtmParams('https://cykelhjalpen.se/', { source: 'email', campaign: 'c', content: '  ' })
    const parsed = new URL(url)
    expect(parsed.searchParams.get('utm_medium')).toBe('email')
    expect(parsed.searchParams.has('utm_content')).toBe(false)
  })
})

describe('edge/frontend mirror parity', () => {
  it('sanitizeUtmValue identical', () => {
    for (const value of ['Email', 'Ny offert!', '<script>alert(1)</script>', '', '  spaced  ', 'a'.repeat(200)]) {
      expect(sanitizeUtmValue(value)).toBe(edgeSanitize(value))
    }
  })

  it('withUtmParams identical', () => {
    const cases: [string, Parameters<typeof withUtmParams>[1]][] = [
      ['https://cykelhjalpen.se/mitt-arende/abc', { source: 'email', campaign: 'new_quote' }],
      ['https://cykelhjalpen.se/x?a=1#h', { source: 'email', medium: 'sms', campaign: 'c', content: 'k' }],
      ['not a url', { source: 'email', campaign: 'c' }],
    ]
    for (const [url, utm] of cases) {
      expect(withUtmParams(url, utm)).toBe(edgeWithUtm(url, utm))
    }
  })
})
