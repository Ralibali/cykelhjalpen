import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LEAD_FEE_KR } from './pricing'
import {
  HONEST_TRUST_CITIES,
  HONEST_TRUST_COMPANY,
  HONEST_TRUST_COMPANY_CITY,
  HONEST_TRUST_FREE_WINS,
  HONEST_TRUST_MAX_QUOTES,
  HONEST_TRUST_MONTHLY_FEE_KR,
  HONEST_TRUST_WIN_FEE_KR,
  honestTrustCopy,
  honestTrustPrerender,
} from './honestTrust'

const sv = (s: string) => s
const en = (_sv: string, english: string) => english

const FORBIDDEN = [
  /hundratals/i,
  /jojoscykel/i,
  /lovable\.app/i,
  /vercel\.app/i,
  /★|⭐|stjärn/i,
  /\brecension/i,
  /\btestimonial/i,
  /\breview(s)?\b/i,
  /\b[4-5],?\d?\s*\/\s*5\b/,
]

const flatten = (value: unknown): string => JSON.stringify(value)

describe('honest trust facts', () => {
  it('uses only the verified marketplace facts', () => {
    expect(HONEST_TRUST_CITIES).toEqual(['Linköping', 'Norrköping', 'Uppsala', 'Lund'])
    expect(HONEST_TRUST_COMPANY).toBe('Aurora Media AB')
    expect(HONEST_TRUST_COMPANY_CITY).toBe('Linköping')
    expect(HONEST_TRUST_MAX_QUOTES).toBe(3)
    expect(HONEST_TRUST_FREE_WINS).toBe(2)
    expect(HONEST_TRUST_MONTHLY_FEE_KR).toBe(0)
    expect(HONEST_TRUST_WIN_FEE_KR).toBe(LEAD_FEE_KR)
    expect(HONEST_TRUST_WIN_FEE_KR).toBe(50)
  })

  it('states the cyclist and workshop facts clearly in both languages', () => {
    const cyclistSv = honestTrustCopy('cyclist', sv)
    const workshopSv = honestTrustCopy('workshop', sv)
    const cyclistEn = honestTrustCopy('cyclist', en)
    const workshopEn = honestTrustCopy('workshop', en)
    const blob = [cyclistSv, workshopSv, cyclistEn, workshopEn, honestTrustPrerender]
      .map(flatten)
      .join('\n')

    expect(blob).toContain('Gratis för cyklisten')
    expect(blob).toContain('Free for the cyclist')
    expect(blob).toContain('inne i Cykelhjälpen')
    expect(blob).toContain('inside Cykelhjälpen')
    expect(blob).toContain('Högst tre')
    expect(blob).toContain('At most three')
    expect(blob).toContain('0 kr/mån')
    expect(blob).toContain('0 SEK/month')
    expect(blob).toContain('50 kr exkl. moms')
    expect(blob).toContain('50 SEK excl. VAT')
    expect(blob).toContain('två första vinsterna')
    expect(blob).toContain('first two wins')
    expect(blob).toContain('Aurora Media AB')
    expect(blob).toContain('Linköping, Norrköping, Uppsala och Lund')
    expect(blob).toContain('Linköping, Norrköping, Uppsala and Lund')

    expect(cyclistSv.facts).toHaveLength(6)
    expect(workshopSv.facts.map((fact) => fact.id)[0]).toBe('monthly-fee')
    expect(cyclistSv.facts.map((fact) => fact.id)[0]).toBe('free-cyclist')
  })

  it('does not invent reviews, counts, workshop names or preview-host URLs', () => {
    const blob = [
      honestTrustCopy('cyclist', sv),
      honestTrustCopy('workshop', sv),
      honestTrustCopy('cyclist', en),
      honestTrustCopy('workshop', en),
      honestTrustPrerender,
    ].map(flatten).join('\n')

    for (const pattern of FORBIDDEN) {
      expect(blob, `forbidden pattern: ${pattern}`).not.toMatch(pattern)
    }
  })

  it('is mounted on the production home and workshop landings', () => {
    const home = readFileSync(resolve(process.cwd(), 'src/pages/cykelhjalpen/CykelhjalpenIndexV3.tsx'), 'utf8')
    const workshop = readFileSync(resolve(process.cwd(), 'src/pages/cykelhjalpen/ForVerkstaderPageV4.tsx'), 'utf8')
    const indexBarrel = readFileSync(resolve(process.cwd(), 'src/pages/cykelhjalpen/CykelhjalpenIndex.tsx'), 'utf8')
    const workshopBarrel = readFileSync(resolve(process.cwd(), 'src/pages/cykelhjalpen/ForVerkstaderPage.tsx'), 'utf8')

    expect(indexBarrel).toContain("from './CykelhjalpenIndexV3'")
    expect(workshopBarrel).toContain("from './ForVerkstaderPageV4'")
    expect(home).toContain('CykelHonestTrust')
    expect(workshop).toContain('CykelHonestTrust')
    expect(home).not.toMatch(/jojoscykel/i)
    expect(workshop).not.toMatch(/jojoscykel/i)
  })
})
