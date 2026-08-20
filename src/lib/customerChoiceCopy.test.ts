import { describe, expect, it } from 'vitest'
import {
  WAIT_FOR_MORE_PHRASES,
  closedChoiceDaysLeft,
  customerResponseEmailBody,
  customerResponseEmailCta,
  customerResponseSmsCopy,
  isHasOffersNudgeDue,
  publishedQuotesStatusCopy,
  shouldUseCompareCopy,
} from './customerChoiceCopy'

const NOW = new Date('2026-08-20T12:00:00.000Z')
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString()

const impliesWaitingForMore = (text: string) =>
  WAIT_FOR_MORE_PHRASES.some((phrase) => text.includes(phrase))

describe('publishedQuotesStatusCopy', () => {
  it('one quote does not tell the customer to wait for more', () => {
    const copy = publishedQuotesStatusCopy({ status: 'has_offers', quoteCount: 1 })
    expect(impliesWaitingForMore(copy.text)).toBe(false)
    expect(copy.text.toLowerCase()).not.toContain('jämför')
    expect(copy.text).toContain('Välj redan nu')
    expect(copy.text).toContain('kontaktuppgifterna först när du valt i Cykelhjälpen')
  })

  it('two or more quotes may ask the customer to compare', () => {
    const copy = publishedQuotesStatusCopy({ status: 'has_offers', quoteCount: 2 })
    expect(shouldUseCompareCopy(2)).toBe(true)
    expect(impliesWaitingForMore(copy.text)).toBe(false)
    expect(copy.text).toContain('Jämför')
    expect(copy.text).toContain('välj redan nu')
    expect(copy.text).toContain('kontaktuppgifterna först när du valt i Cykelhjälpen')
  })

  it('closed window with one quote still leads with choose now', () => {
    const copy = publishedQuotesStatusCopy({
      status: 'closed_for_responses',
      quoteCount: 1,
      daysLeft: 3,
    })
    expect(impliesWaitingForMore(copy.text)).toBe(false)
    expect(copy.text.toLowerCase()).not.toContain('jämföra')
    expect(copy.text).toContain('Välj redan nu')
    expect(copy.vars).toEqual({ days: 3 })
  })
})

describe('isHasOffersNudgeDue', () => {
  it('is not due 23 hours after the latest quote', () => {
    expect(isHasOffersNudgeDue(hoursAgo(23), NOW)).toBe(false)
  })

  it('is due 25 hours after the latest quote', () => {
    expect(isHasOffersNudgeDue(hoursAgo(25), NOW)).toBe(true)
  })

  it('is due at exactly 24 hours', () => {
    expect(isHasOffersNudgeDue(hoursAgo(24), NOW)).toBe(true)
  })

  it('skips missing or invalid timestamps', () => {
    expect(isHasOffersNudgeDue(null, NOW)).toBe(false)
    expect(isHasOffersNudgeDue('not-a-date', NOW)).toBe(false)
  })
})

describe('first-quote notification copy', () => {
  it('one quote SMS and email do not say compare', () => {
    const sms = customerResponseSmsCopy('Jojos', 'https://cykelhjalpen.se/mitt-arende/x', 'sv', 1)
    const body = customerResponseEmailBody('Jojos', 'sv', 1)
    expect(sms.toLowerCase()).not.toContain('jämför')
    expect(body.toLowerCase()).not.toContain('jämför')
    expect(sms).toContain('Välj redan nu')
    expect(body).toContain('Välj redan nu')
    expect(body).toContain('först när du valt i Cykelhjälpen')
    expect(customerResponseEmailCta('sv', 1)).toBe('Välj verkstad redan nu')
  })

  it('two-quote SMS and email may say compare', () => {
    const sms = customerResponseSmsCopy('Jojos', 'https://cykelhjalpen.se/mitt-arende/x', 'sv', 2)
    const body = customerResponseEmailBody('Jojos', 'sv', 2)
    expect(sms).toContain('Jämför')
    expect(body).toContain('Jämför förslagen')
    expect(body).toContain('först när du valt i Cykelhjälpen')
  })
})

describe('closedChoiceDaysLeft', () => {
  it('counts remaining days from closed_at', () => {
    expect(closedChoiceDaysLeft(hoursAgo(48), NOW)).toBe(3)
  })
})
