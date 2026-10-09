import { describe, expect, it } from 'vitest'
import { bikeResponseSummary, bikeResponseLabel } from './bikeResponseSummary'

describe('pay-per-win quote totals', () => {
  it('does not count unpaid sent quotes as drafts or settled wins', () => {
    expect(bikeResponseSummary([{ status: 'draft' }, { status: 'sent', paid: false }, { status: 'won', paid: true }, { status: 'lost' }])).toEqual({ sent: 3, drafts: 1, won: 1, settled: 1, hasReply: true })
  })
  it('keeps a request with only drafts in the no-reply queue', () => {
    expect(bikeResponseSummary([{ status: 'draft' }, { status: 'pending_payment' }]).hasReply).toBe(false)
    expect(bikeResponseLabel('sent', false, false)).toBe('Skickad')
    expect(bikeResponseLabel('won', true, true)).toBe('Vunnet · gratis')
  })
})
