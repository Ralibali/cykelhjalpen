// Publik edge function för avregistrering. verify_jwt = false.
//
// - GET  ?token=UUID  => returnerar { company_name, city, already_unsubscribed }
//                        (för frontend-sidan /avregistrera/:token att visa detaljer)
// - POST                => markerar prospekt do-not-contact + skriver suppression.
//   Tokenet kan komma från:
//     • URL query string (?token=UUID)  [används av Gmail/Yahoo one-click, RFC 8058]
//     • x-www-form-urlencoded body      [samma one-click, om provider POST:ar body]
//     • application/json body {token}   [används av vår egen frontend]
//
// Tokenet är ogenomskinligt och avslöjar inte prospect-id.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Exporterad för enhetstester.
export const extractToken = async (req: Request): Promise<string | null> => {
  const url = new URL(req.url)
  const qToken = url.searchParams.get('token')
  if (qToken) return qToken

  if (req.method !== 'POST') return null

  const contentType = (req.headers.get('content-type') || '').toLowerCase()

  if (contentType.includes('application/json')) {
    try {
      const body = await req.json() as { token?: string }
      return body?.token ?? null
    } catch {
      return null
    }
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    try {
      const form = await req.formData()
      const token = form.get('token')
      return typeof token === 'string' ? token : null
    } catch {
      return null
    }
  }

  // Fallback: körs t.ex. när Gmail POST:ar body `List-Unsubscribe=One-Click`
  // utan Content-Type. Tokenet ska då sitta i query, men vi försöker läsa body
  // som text ifall någon leverantör bifogar den.
  try {
    const text = await req.text()
    if (!text) return null
    const params = new URLSearchParams(text)
    return params.get('token')
  } catch {
    return null
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405)
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const token = await extractToken(req)

    if (!token || !UUID_RE.test(token)) {
      return jsonResponse({ error: 'ogiltig_token' }, 400)
    }

    const { data: prospect } = await admin
      .from('workshop_prospects')
      .select('id, company_name, city, do_not_contact')
      .eq('unsubscribe_token', token)
      .maybeSingle()

    if (!prospect) return jsonResponse({ error: 'okänd_lank' }, 404)

    if (req.method === 'GET') {
      return jsonResponse({
        ok: true,
        company_name: prospect.company_name,
        city: prospect.city,
        already_unsubscribed: prospect.do_not_contact,
      })
    }

    if (prospect.do_not_contact) {
      return jsonResponse({ ok: true, already_unsubscribed: true })
    }

    // Triggern sync_prospect_suppression sätter status + skriver till suppression för alla normaliserade värden.
    const { error: updErr } = await admin
      .from('workshop_prospects')
      .update({ do_not_contact: true, notes: 'Avregistrerad via publik länk' })
      .eq('id', prospect.id)
    if (updErr) throw updErr

    return jsonResponse({ ok: true, already_unsubscribed: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('prospect-unsubscribe', message)
    return jsonResponse({ error: message }, 400)
  }
}

Deno.serve(handler)
