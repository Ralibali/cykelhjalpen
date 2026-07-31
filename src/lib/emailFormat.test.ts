import { describe, expect, it } from 'vitest'
import { buildReplySubject, emailSnippet, formatMailDate } from './emailFormat'

describe('buildReplySubject', () => {
  it('lägger till Sv: på vanligt ämne', () => {
    expect(buildReplySubject('Intresserad av samarbete')).toBe('Sv: Intresserad av samarbete')
  })
  it('dubblerar inte Sv:', () => {
    expect(buildReplySubject('Sv: redan svarat')).toBe('Sv: redan svarat')
    expect(buildReplySubject('SV: VERSALER')).toBe('SV: VERSALER')
  })
  it('hanterar tomt ämne', () => {
    expect(buildReplySubject(null)).toBe('Sv:')
    expect(buildReplySubject('   ')).toBe('Sv:')
  })
})

describe('emailSnippet', () => {
  it('kollapsar whitespace och radbrytningar', () => {
    expect(emailSnippet('Hej!\n\nVi vill\n  gärna  ansluta')).toBe('Hej! Vi vill gärna ansluta')
  })
  it('trunkerar långa texter med ellips', () => {
    const long = 'a'.repeat(200)
    const snippet = emailSnippet(long, 50)
    expect(snippet.length).toBeLessThanOrEqual(50)
    expect(snippet.endsWith('…')).toBe(true)
  })
  it('saknat innehåll ger förklarande text', () => {
    expect(emailSnippet(null)).toBe('(utan textinnehåll)')
    expect(emailSnippet('  ')).toBe('(utan textinnehåll)')
  })
})

describe('formatMailDate', () => {
  it('visar klockslag för mejl från i dag', () => {
    const now = new Date()
    const result = formatMailDate(now.toISOString())
    expect(result).toMatch(/^\d{2}[:.]\d{2}$/)
  })
  it('visar dag och månad för äldre mejl samma år', () => {
    const date = new Date()
    date.setMonth(0, 5) // 5 januari i år
    const result = formatMailDate(date.toISOString())
    expect(result).toContain('5')
    expect(result.toLowerCase()).toContain('jan')
  })
  it('visar årtal för mejl från annat år', () => {
    const result = formatMailDate('2020-03-15T10:00:00Z')
    expect(result).toContain('2020')
  })
  it('ogiltigt datum ger tom sträng', () => {
    expect(formatMailDate('inte ett datum')).toBe('')
  })
})
