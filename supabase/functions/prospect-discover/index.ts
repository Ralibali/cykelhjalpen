// Admin-only: söker verkstäder i en stad via Firecrawl och sparar prospects.
// Skickar INGA externa mejl/SMS. Dedupliceras på domän/telefon/normaliserat namn.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import {
  looksLikeBusinessEmail,
  normalizeDomain,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  scoreProspect,
  type ProspectExtract,
} from '../_shared/prospect.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')

const ALLOWED_CITIES = new Set(['Linköping', 'Norrköping', 'Uppsala', 'Lund'])
const DEFAULT_TERMS = ['cykelverkstad', 'cykelservice', 'elcykelservice', 'cykelreparation']

interface RequestBody {
  city: string
  terms?: string[]
  limit_per_term?: number
  scrape_top?: number
  dry_run?: boolean
}

interface FirecrawlSearchResult {
  url: string
  title?: string
  description?: string
}

async function firecrawlSearch(query: string, limit: number): Promise<FirecrawlSearchResult[]> {
  const response = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit, lang: 'sv', country: 'se' }),
  })
  const data = await response.json().catch(() => null) as any
  if (!response.ok) {
    throw new Error(`Firecrawl search misslyckades (${response.status}): ${data?.error || response.statusText}`)
  }
  // Firecrawl v2 kan svara med { data: { web: [...] } }, { data: [...] }, eller { web: [...] }
  const raw = data?.data?.web ?? data?.web ?? data?.data ?? []
  return Array.isArray(raw) ? raw : []
}

interface FirecrawlScrape {
  markdown?: string
  json?: ProspectExtract
  summary?: string
  metadata?: { title?: string; description?: string; sourceURL?: string; statusCode?: number }
}

const extractionPrompt = `Extrahera företagsinformation för en cykelverkstad på svenska. 
Returnera fälten: company_name, website, email (endast företagsmejl, undvik privata), phone, address, city, services (lista på erbjudna tjänster som "cykelservice", "elcykel", "punktering"), opening_hours (kort textrepresentation).
Om ett fält saknas: lämna det tomt.`

async function firecrawlScrapePage(url: string): Promise<FirecrawlScrape> {
  const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      onlyMainContent: true,
      formats: [
        'markdown',
        'summary',
        {
          type: 'json',
          prompt: extractionPrompt,
          schema: {
            type: 'object',
            properties: {
              company_name: { type: 'string' },
              website: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' },
              city: { type: 'string' },
              services: { type: 'array', items: { type: 'string' } },
              opening_hours: { type: 'string' },
            },
          },
        },
      ],
    }),
  })
  const data = await response.json().catch(() => null) as (FirecrawlScrape & { data?: FirecrawlScrape; error?: string; success?: boolean }) | null
  if (!response.ok) throw new Error(`Firecrawl scrape misslyckades (${response.status}): ${data?.error || response.statusText}`)
  return (data?.data ?? data ?? {}) as FirecrawlScrape
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY saknas – anslut Firecrawl-connectorn först')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('unauthenticated')

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) throw new Error('unauthenticated')
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') throw new Error('forbidden')

    const body = (await req.json().catch(() => ({}))) as RequestBody
    if (!body.city || !ALLOWED_CITIES.has(body.city)) {
      throw new Error(`Stad krävs och måste vara en av: ${[...ALLOWED_CITIES].join(', ')}`)
    }
    const terms = (body.terms && body.terms.length > 0 ? body.terms : DEFAULT_TERMS)
      .map((t) => String(t).trim())
      .filter((t) => t.length > 0)
      .slice(0, 10)
    const perTerm = Math.min(Math.max(1, body.limit_per_term ?? 8), 15)
    const scrapeTop = Math.min(Math.max(1, body.scrape_top ?? 5), 10)

    // Ladda suppression-listan så vi hoppar över kända do-not-contact-domäner.
    const { data: suppression } = await admin.from('contact_suppression').select('contact_type, value')
    const blockedDomains = new Set((suppression || []).filter((r) => r.contact_type === 'domain').map((r) => r.value))
    const blockedEmails = new Set((suppression || []).filter((r) => r.contact_type === 'email').map((r) => r.value))
    const blockedPhones = new Set((suppression || []).filter((r) => r.contact_type === 'phone').map((r) => r.value))

    const stats = { queried: 0, discovered: 0, scraped: 0, inserted: 0, updated: 0, skipped: 0, suppressed: 0, errors: [] as string[] }
    const seenDomains = new Set<string>()

    for (const rawTerm of terms) {
      const term = `${rawTerm} ${body.city}`
      stats.queried += 1
      let results: FirecrawlSearchResult[] = []
      try {
        results = await firecrawlSearch(term, perTerm)
      } catch (searchError) {
        stats.errors.push(`search "${term}": ${(searchError as Error).message}`)
        continue
      }
      stats.discovered += results.length

      // Grupp per domän och scrapa toppen.
      const uniqueResults: FirecrawlSearchResult[] = []
      for (const r of results) {
        const domain = normalizeDomain(r.url)
        if (!domain) continue
        if (seenDomains.has(domain)) continue
        seenDomains.add(domain)
        uniqueResults.push(r)
        if (uniqueResults.length >= scrapeTop) break
      }

      for (const result of uniqueResults) {
        const domain = normalizeDomain(result.url)!
        if (blockedDomains.has(domain)) { stats.suppressed += 1; continue }

        if (body.dry_run) {
          continue
        }

        let scrape: FirecrawlScrape = {}
        try {
          scrape = await firecrawlScrapePage(result.url)
          stats.scraped += 1
        } catch (scrapeError) {
          stats.errors.push(`scrape "${result.url}": ${(scrapeError as Error).message}`)
          continue
        }

        const extract = scrape.json || {}
        const name = extract.company_name || result.title || domain
        const website = extract.website || `https://${domain}`
        const email = normalizeEmail(extract.email || null)
        const phone = normalizePhone(extract.phone || null)

        if (email && blockedEmails.has(email)) { stats.suppressed += 1; continue }
        if (phone && blockedPhones.has(phone)) { stats.suppressed += 1; continue }

        const emailIsBusiness = looksLikeBusinessEmail(email)
        const services = Array.isArray(extract.services) ? extract.services.slice(0, 20) : []
        const detectedCity = (extract.city || body.city) as string
        const score = scoreProspect({
          city: detectedCity,
          targetCity: body.city,
          website,
          email,
          emailIsBusiness,
          services,
          hasActiveSite: !!(scrape.markdown && scrape.markdown.length > 200),
        })

        const normalizedName = normalizeName(name)
        const payload = {
          company_name: name,
          normalized_name: normalizedName,
          website,
          normalized_domain: domain,
          email: emailIsBusiness ? email : null, // Undvik privata mejl per spec – behåll bara publika företagsmejl.
          normalized_email: emailIsBusiness ? email : null,
          phone,
          normalized_phone: phone,
          address: extract.address || null,
          city: body.city,
          services,
          opening_hours: extract.opening_hours || null,
          ai_summary: scrape.summary || null,
          score,
          last_checked_at: new Date().toISOString(),
        }

        // Upsert med dedup på domän – om domän matchar en befintlig rad uppdaterar vi den.
        const { data: existing } = await admin
          .from('workshop_prospects')
          .select('id, status, do_not_contact')
          .or(`normalized_domain.eq.${domain}${phone ? `,normalized_phone.eq.${phone}` : ''}`)
          .limit(1)
          .maybeSingle()

        if (existing?.do_not_contact) { stats.suppressed += 1; continue }

        let prospectId: string | null = null
        if (existing) {
          const { error: updateError } = await admin.from('workshop_prospects').update(payload).eq('id', existing.id)
          if (updateError) {
            stats.errors.push(`update ${domain}: ${updateError.message}`)
            continue
          }
          prospectId = existing.id
          stats.updated += 1
        } else {
          const { data: inserted, error: insertError } = await admin
            .from('workshop_prospects')
            .insert(payload)
            .select('id')
            .maybeSingle()
          if (insertError) {
            stats.errors.push(`insert ${domain}: ${insertError.message}`)
            continue
          }
          prospectId = inserted?.id ?? null
          stats.inserted += 1
        }

        if (prospectId) {
          await admin.from('prospect_sources').insert({
            prospect_id: prospectId,
            source_type: 'firecrawl',
            source_url: result.url,
            search_term: term,
            city: body.city,
            raw_excerpt: (scrape.markdown || result.description || '').slice(0, 2000),
            raw_payload: { title: result.title, description: result.description, extract, metadata: scrape.metadata },
          })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    const status = message === 'unauthenticated' ? 401 : message === 'forbidden' ? 403 : 400
    console.error('prospect-discover', message)
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
