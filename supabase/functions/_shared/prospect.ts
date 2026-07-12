// Delade normaliseringshjälpare för prospekthantering.

export const normalizeName = (raw: string): string =>
  (raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(ab|hb|kb|aktiebolag|handelsbolag|the|and|och|&)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

const stripProtocol = (raw: string): string =>
  raw.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase()

export const normalizeDomain = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const host = stripProtocol(raw)
  if (!host || !host.includes('.')) return null
  return host
}

export const normalizeEmail = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const match = raw.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  return match ? match[0].toLowerCase() : null
}

const PRIVATE_EMAIL_LOCAL_PARTS = new Set([
  'firstname', 'lastname', 'personal',
])

export const looksLikeBusinessEmail = (email: string | null): boolean => {
  if (!email) return false
  const local = email.split('@')[0]
  if (!local) return false
  if (PRIVATE_EMAIL_LOCAL_PARTS.has(local)) return false
  const businessPrefixes = ['info', 'kontakt', 'contact', 'hej', 'support', 'service', 'bokning', 'verkstad', 'workshop', 'sales', 'kund', 'butik']
  return businessPrefixes.some((prefix) => local === prefix || local.startsWith(`${prefix}.`) || local.startsWith(`${prefix}@`) || local.startsWith(`${prefix}-`))
}

export const normalizePhone = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const digits = raw.replace(/[^\d+]/g, '')
  if (!digits) return null
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('0')) return `+46${digits.slice(1)}`
  return digits
}

export interface ProspectExtract {
  company_name?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  services?: string[]
  opening_hours?: string
  ai_summary?: string
}

export interface ProspectScoreInput {
  city: string
  targetCity: string
  website: string | null
  email: string | null
  emailIsBusiness: boolean
  services: string[]
  hasActiveSite: boolean
}

/** Poäng 0-100 som prioriterar egen sajt, publikt företagsmejl, rätt stad, cykelservice och aktiv sajt. */
export const scoreProspect = (input: ProspectScoreInput): number => {
  let score = 0
  if (input.website) score += 20
  if (input.hasActiveSite) score += 10
  if (input.email) score += 10
  if (input.emailIsBusiness) score += 15
  if (input.city && input.targetCity && input.city.toLowerCase().includes(input.targetCity.toLowerCase())) score += 20
  const cycleTerms = ['cykel', 'bike', 'elcykel', 'service', 'reparation', 'däckbyte', 'punktering', 'växel', 'broms']
  const hits = input.services.reduce((acc, service) => acc + (cycleTerms.some((term) => service.toLowerCase().includes(term)) ? 1 : 0), 0)
  score += Math.min(25, hits * 5)
  return Math.min(100, score)
}
