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

const CONSUMER_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'gmail.se',
  'googlemail.com',
  'hotmail.com',
  'hotmail.se',
  'outlook.com',
  'outlook.se',
  'live.com',
  'live.se',
  'msn.com',
  'icloud.com',
  'me.com',
  'yahoo.com',
  'yahoo.se',
])

/** Vanliga förnamn – inte en prefix-allowlist. Shop-roller som cykla/info/order hör inte hit. */
const GIVEN_NAMES = new Set([
  'adam', 'alexander', 'alice', 'alma', 'alva', 'amanda', 'anders', 'andreas',
  'anna', 'anne', 'anton', 'arvid', 'astrid', 'axel',
  'benjamin', 'birgitta', 'bjorn', 'camilla', 'carina', 'carl', 'cecilia',
  'charlie', 'christoffer', 'christopher',
  'daniel', 'david', 'ebba', 'edvin', 'elias', 'elin', 'elisabeth', 'ellen',
  'elsa', 'elvira', 'emma', 'emil', 'erik', 'eva',
  'felicia', 'felix', 'freja', 'fredrik', 'gustav',
  'hanna', 'hans', 'henrik', 'hugo',
  'ida', 'isak', 'isabella', 'jacob', 'jakob', 'jens', 'jessica', 'jesper',
  'johan', 'johanna', 'john', 'jonatan', 'jonathan', 'julia',
  'karl', 'karin', 'kasper', 'klara', 'kristina',
  'lars', 'lina', 'linda', 'linnea', 'lisa', 'lovisa', 'lucas', 'ludvig',
  'maja', 'malin', 'marcus', 'maria', 'marie', 'martin', 'matilda', 'mats',
  'mattias', 'max', 'michael', 'mikael',
  'nina', 'noah', 'nora', 'oliver', 'olivia', 'oscar', 'oskar',
  'patrick', 'patrik', 'per', 'peter', 'petra',
  'rebecca', 'robert', 'robin',
  'saga', 'samuel', 'sara', 'simon', 'sofia', 'stefan', 'stina', 'susanne',
  'therese', 'thomas', 'tobias', 'tomas', 'tuva', 'ulrika',
  'viktor', 'vilma', 'william', 'wilma',
])

const isConsumerEmailDomain = (domain: string): boolean => {
  if (CONSUMER_EMAIL_DOMAINS.has(domain)) return true
  for (const consumer of CONSUMER_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${consumer}`)) return true
  }
  return false
}

const looksLikePersonalLocal = (local: string): boolean => {
  if (PRIVATE_EMAIL_LOCAL_PARTS.has(local) || GIVEN_NAMES.has(local)) return true
  const segments = local.split(/[._-]+/).filter(Boolean)
  return segments.length >= 2 && GIVEN_NAMES.has(segments[0])
}

const emailDomainMatchesWebsite = (emailDomain: string, website?: string | null): boolean => {
  const host = normalizeDomain(website)
  if (!host) return false
  return emailDomain === host || emailDomain.endsWith(`.${host}`) || host.endsWith(`.${emailDomain}`)
}

export const looksLikeBusinessEmail = (
  email: string | null,
  website?: string | null,
): boolean => {
  if (!email) return false
  const [rawLocal, rawDomain] = email.split('@')
  if (!rawLocal || !rawDomain) return false
  const local = rawLocal.toLowerCase()
  const domain = rawDomain.toLowerCase()
  if (isConsumerEmailDomain(domain)) return false
  if (emailDomainMatchesWebsite(domain, website)) return true
  return !looksLikePersonalLocal(local)
}

export const PROSPECT_EMAIL_INVALID = 'Ogiltig e-postadress'
export const PROSPECT_EMAIL_NOT_BUSINESS =
  'E-postadressen ser inte ut som ett publikt företagsmejl – utkast blockerat.'

export type ProspectEmailUpdate =
  | { ok: true; email: string; normalized_email: string }
  | { ok: false; error: string }

/** Normaliserar och kräver publikt företagsmejl. Skickar inget – bara persist-underlag. */
export const prepareProspectEmailUpdate = (
  raw: string | null | undefined,
  website?: string | null,
): ProspectEmailUpdate => {
  const normalized = normalizeEmail(raw)
  if (!normalized) return { ok: false, error: PROSPECT_EMAIL_INVALID }
  if (!looksLikeBusinessEmail(normalized, website)) return { ok: false, error: PROSPECT_EMAIL_NOT_BUSINESS }
  return { ok: true, email: normalized, normalized_email: normalized }
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
