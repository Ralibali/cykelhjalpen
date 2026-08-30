// V2 shared UTM helper (frontend). Mirror of
// supabase/functions/_shared/v2/utm.ts — keep in sync (parity test:
// src/lib/v2/utm.test.ts). Pure: no imports, no I/O.

export interface V2UtmParams {
  /** e.g. 'email' */
  source: string
  /** defaults to 'email' */
  medium?: string
  /** lifecycle email type, e.g. 'new_quote', 'request_approved' */
  campaign: string
  content?: string
}

/** Conservative sanitizer: utm values become safe slugs (max 100 chars). */
export function sanitizeUtmValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100)
}

/**
 * Append utm_* params to a URL, preserving existing query string and hash.
 * Never throws: invalid input returns the original URL unchanged.
 */
export function withUtmParams(url: string, utm: V2UtmParams): string {
  try {
    if (typeof url !== 'string' || !url) return url
    const source = sanitizeUtmValue(utm.source)
    const campaign = sanitizeUtmValue(utm.campaign)
    if (!source || !campaign) return url

    const parsed = new URL(url)
    parsed.searchParams.set('utm_source', source)
    parsed.searchParams.set('utm_medium', sanitizeUtmValue(utm.medium ?? 'email') || 'email')
    parsed.searchParams.set('utm_campaign', campaign)
    if (utm.content) {
      const content = sanitizeUtmValue(utm.content)
      if (content) parsed.searchParams.set('utm_content', content)
    }
    return parsed.toString()
  } catch {
    return url
  }
}
