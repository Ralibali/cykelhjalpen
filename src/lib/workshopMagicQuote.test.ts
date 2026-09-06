import { describe, expect, it } from 'vitest'
import {
  WORKSHOP_MAGIC_QUOTE_FLAG,
  WORKSHOP_QUOTE_TOKEN_ERROR_SV,
  WORKSHOP_QUOTE_TOKEN_TTL_MS,
  buildWorkshopQuoteSms,
  generateRawQuoteToken,
  parseTruthyEnv,
  requestIsOpenForQuote,
  sha256Hex,
  tokenExpiresAt,
  validateQuoteForm,
  validateQuoteToken,
  workshopMagicQuoteEnvOn,
  workshopQuoteUrl,
} from '../../supabase/functions/_shared/workshop-quote-core'

const HASH = 'abc123hash'
const workshopId = '11111111-1111-4111-8111-111111111111'
const requestId = '22222222-2222-4222-8222-222222222222'
const future = '2099-01-01T00:00:00.000Z'
const past = '2000-01-01T00:00:00.000Z'

const record = {
  token_hash: HASH,
  workshop_id: workshopId,
  request_id: requestId,
  expires_at: future,
  used_at: null,
}

describe('workshop magic quote flag', () => {
  it('defaults OFF for missing/false env', () => {
    expect(parseTruthyEnv(undefined)).toBe(false)
    expect(parseTruthyEnv('')).toBe(false)
    expect(parseTruthyEnv('false')).toBe(false)
    expect(parseTruthyEnv('off')).toBe(false)
    expect(workshopMagicQuoteEnvOn(() => undefined)).toBe(false)
  })

  it('turns on only for explicit truthy env', () => {
    expect(parseTruthyEnv('true')).toBe(true)
    expect(parseTruthyEnv('1')).toBe(true)
    expect(workshopMagicQuoteEnvOn((key) => key === 'WORKSHOP_MAGIC_QUOTE' ? 'true' : undefined)).toBe(true)
    expect(workshopMagicQuoteEnvOn((key) => key === 'VITE_WORKSHOP_MAGIC_QUOTE' ? 'true' : undefined)).toBe(true)
  })

  it('uses the explicit product flag name', () => {
    expect(WORKSHOP_MAGIC_QUOTE_FLAG).toBe('workshop_magic_quote')
  })
})

describe('workshop magic quote token validation', () => {
  it('rejects when the flag is off even if the token is otherwise valid', () => {
    const result = validateQuoteToken({ flagOn: false, record, expectedHash: HASH })
    expect(result).toEqual({ ok: false, reason: 'flag_off' })
    expect(WORKSHOP_QUOTE_TOKEN_ERROR_SV.flag_off).toMatch(/avstängd/i)
  })

  it('rejects missing, mismatched, or empty hashes as invalid', () => {
    expect(validateQuoteToken({ flagOn: true, record: null, expectedHash: HASH }).reason).toBe('invalid')
    expect(validateQuoteToken({ flagOn: true, record, expectedHash: 'other' }).reason).toBe('invalid')
    expect(validateQuoteToken({ flagOn: true, record, expectedHash: '' }).reason).toBe('invalid')
  })

  it('rejects expired tokens', () => {
    const result = validateQuoteToken({
      flagOn: true,
      record: { ...record, expires_at: past },
      expectedHash: HASH,
      now: new Date('2026-09-06T12:00:00.000Z'),
    })
    expect(result.reason).toBe('expired')
  })

  it('rejects used tokens (single-use)', () => {
    const result = validateQuoteToken({
      flagOn: true,
      record: { ...record, used_at: '2026-09-06T10:00:00.000Z' },
      expectedHash: HASH,
    })
    expect(result.reason).toBe('used')
  })

  it('rejects a token bound to a different workshop', () => {
    const result = validateQuoteToken({
      flagOn: true,
      record,
      expectedHash: HASH,
      expectedWorkshopId: '33333333-3333-4333-8333-333333333333',
    })
    expect(result.reason).toBe('wrong_workshop')
  })

  it('accepts a valid unused unexpired token for the bound workshop', () => {
    const result = validateQuoteToken({
      flagOn: true,
      record,
      expectedHash: HASH,
      expectedWorkshopId: workshopId,
      now: new Date('2026-09-06T12:00:00.000Z'),
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.record.request_id).toBe(requestId)
  })

  it('caps TTL at 48 hours', () => {
    const created = new Date('2026-09-06T00:00:00.000Z')
    expect(tokenExpiresAt(created).getTime() - created.getTime()).toBe(WORKSHOP_QUOTE_TOKEN_TTL_MS)
    expect(tokenExpiresAt(created, 99 * 60 * 60 * 1000).getTime() - created.getTime()).toBe(WORKSHOP_QUOTE_TOKEN_TTL_MS)
    expect(WORKSHOP_QUOTE_TOKEN_TTL_MS).toBeLessThanOrEqual(48 * 60 * 60 * 1000)
  })
})

describe('workshop magic quote SMS + form', () => {
  it('builds Swedish copy with the public /offert URL', () => {
    const sms = buildWorkshopQuoteSms({
      city: 'Norrköping',
      category: 'punktering',
      token: 'tok123',
    })
    expect(sms).toBe('Hej! Kundjobb i Norrköping: punktering. Lämna offert här: https://cykelhjalpen.se/offert/tok123')
    expect(workshopQuoteUrl('tok123')).toBe('https://cykelhjalpen.se/offert/tok123')
    expect(sms).not.toContain('dashboard')
  })

  it('validates the mini quote form like the dashboard', () => {
    expect(validateQuoteForm({ message: 'för kort' }).ok).toBe(false)
    expect(validateQuoteForm({ message: 'Vi byter slang och kollar hjulet noga.' }).ok).toBe(true)
    expect(validateQuoteForm({
      message: 'Vi byter slang och kollar hjulet noga.',
      estimated_price_min: 400,
      estimated_price_max: 200,
    }).ok).toBe(false)
    expect(validateQuoteForm({
      message: 'Vi byter slang och kollar hjulet noga.',
      estimated_price_min: -1,
    }).ok).toBe(false)
  })

  it('treats only new/has_offers as open for quoting', () => {
    expect(requestIsOpenForQuote('new')).toBe(true)
    expect(requestIsOpenForQuote('has_offers')).toBe(true)
    expect(requestIsOpenForQuote('completed')).toBe(false)
    expect(requestIsOpenForQuote('expired')).toBe(false)
  })

  it('hashes tokens and never treats the raw value as the stored secret', async () => {
    const raw = generateRawQuoteToken(new Uint8Array(24).fill(7))
    const hash = await sha256Hex(raw)
    expect(raw).not.toBe(hash)
    expect(hash).toHaveLength(64)
    expect(await sha256Hex(raw)).toBe(hash)
  })
})
