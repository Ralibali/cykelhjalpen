// Pure helpers for the workshop magic-quote SMS link.
// No Deno/npm imports — vitest and edge functions both import this file.
//
// Flag: `workshop_magic_quote` in v2_feature_flags (DEFAULT OFF) plus optional
// env override for preview only:
//   Edge:     WORKSHOP_MAGIC_QUOTE=true
//   Frontend: VITE_WORKSHOP_MAGIC_QUOTE=true
// Never set either in production. Missing/false = OFF.

export const WORKSHOP_MAGIC_QUOTE_FLAG = 'workshop_magic_quote' as const

export const WORKSHOP_QUOTE_TOKEN_TTL_MS = 48 * 60 * 60 * 1000
export const WORKSHOP_QUOTE_SITE_ORIGIN = 'https://cykelhjalpen.se'
export const WORKSHOP_QUOTE_PATH_PREFIX = '/offert'
export const WORKSHOP_QUOTE_MESSAGE_MIN = 20

export function parseTruthyEnv(value: string | undefined | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}

export function workshopMagicQuoteEnvOn(
  read: (key: string) => string | undefined,
): boolean {
  return parseTruthyEnv(read('WORKSHOP_MAGIC_QUOTE')) || parseTruthyEnv(read('VITE_WORKSHOP_MAGIC_QUOTE'))
}

export type WorkshopQuoteTokenRecord = {
  token_hash: string
  workshop_id: string
  request_id: string
  expires_at: string
  used_at: string | null
}

export type WorkshopQuoteTokenFailure =
  | 'flag_off'
  | 'invalid'
  | 'expired'
  | 'used'
  | 'wrong_workshop'
  | 'workshop_not_approved'
  | 'request_not_approved'
  | 'request_closed'

export const WORKSHOP_QUOTE_TOKEN_ERROR_SV: Record<WorkshopQuoteTokenFailure, string> = {
  flag_off: 'Funktionen är avstängd just nu.',
  invalid: 'Länken är ogiltig. Be Cykelhjälpen skicka en ny.',
  expired: 'Länken har gått ut. Be Cykelhjälpen skicka en ny.',
  used: 'Den här länken är redan använd.',
  wrong_workshop: 'Länken gäller en annan verkstad.',
  workshop_not_approved: 'Verkstaden är inte godkänd ännu.',
  request_not_approved: 'Ärendet är inte publicerat ännu.',
  request_closed: 'Ärendet är stängt och tar inte emot fler offerter.',
}

export function tokenExpiresAt(
  createdAt: Date,
  ttlMs = WORKSHOP_QUOTE_TOKEN_TTL_MS,
): Date {
  const capped = Math.min(Math.max(0, ttlMs), WORKSHOP_QUOTE_TOKEN_TTL_MS)
  return new Date(createdAt.getTime() + capped)
}

export function validateQuoteToken(input: {
  flagOn: boolean
  record: WorkshopQuoteTokenRecord | null | undefined
  expectedHash: string
  now?: Date
  expectedWorkshopId?: string | null
}): { ok: true; record: WorkshopQuoteTokenRecord } | { ok: false; reason: WorkshopQuoteTokenFailure } {
  if (!input.flagOn) return { ok: false, reason: 'flag_off' }
  if (!input.record || !input.expectedHash || input.record.token_hash !== input.expectedHash) {
    return { ok: false, reason: 'invalid' }
  }
  const now = input.now ?? new Date()
  if (new Date(input.record.expires_at).getTime() <= now.getTime()) {
    return { ok: false, reason: 'expired' }
  }
  if (input.record.used_at) return { ok: false, reason: 'used' }
  if (input.expectedWorkshopId && input.record.workshop_id !== input.expectedWorkshopId) {
    return { ok: false, reason: 'wrong_workshop' }
  }
  return { ok: true, record: input.record }
}

export function workshopQuoteUrl(token: string): string {
  return `${WORKSHOP_QUOTE_SITE_ORIGIN}${WORKSHOP_QUOTE_PATH_PREFIX}/${token}`
}

export function buildWorkshopQuoteSms(input: {
  city: string
  category: string
  token: string
}): string {
  return `Hej! Kundjobb i ${input.city}: ${input.category}. Lämna offert här: ${workshopQuoteUrl(input.token)}`
}

export function validateQuoteForm(input: {
  message: unknown
  estimated_price_min?: unknown
  estimated_price_max?: unknown
}): { ok: true; message: string; estimated_price_min: number | null; estimated_price_max: number | null }
  | { ok: false; error: string } {
  const message = typeof input.message === 'string' ? input.message.trim() : ''
  if (message.length < WORKSHOP_QUOTE_MESSAGE_MIN) {
    return { ok: false, error: 'Beskriv ditt svar lite mer, minst tjugo tecken.' }
  }

  const toPrice = (value: unknown): number | null | 'invalid' => {
    if (value === null || value === undefined || value === '') return null
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return 'invalid'
    return n
  }

  const min = toPrice(input.estimated_price_min)
  const max = toPrice(input.estimated_price_max)
  if (min === 'invalid' || max === 'invalid') {
    return { ok: false, error: 'Priset måste vara ett tal.' }
  }
  if ((min !== null && min < 0) || (max !== null && max < 0)) {
    return { ok: false, error: 'Priset kan inte vara negativt.' }
  }
  if (min !== null && max !== null && max < min) {
    return { ok: false, error: 'Pris till måste vara samma som eller högre än pris från.' }
  }
  return { ok: true, message, estimated_price_min: min, estimated_price_max: max }
}

export function requestIsOpenForQuote(status: string | null | undefined): boolean {
  return status === 'new' || status === 'has_offers'
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateRawQuoteToken(randomBytes = crypto.getRandomValues(new Uint8Array(24))): string {
  return Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
