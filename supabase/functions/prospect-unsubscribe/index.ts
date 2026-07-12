// Publik edge function för avregistrering. verify_jwt = false.
// GET /?token=... => returnerar { company_name, city } (för att sidan ska kunna visa något)
// POST { token } => markerar prospektet do-not-contact + lägger e-post/domän i suppression.
// Tokenet är ogenomskinligt och avslöjar inte prospect-id.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    let token: string | null = null

    if (req.method === 'GET') {
      const url = new URL(req.url)
      token = url.searchParams.get('token')
    } else if (req.method === 'POST') {
      const body = await req.json().catch(() => ({})) as { token?: string }
      token = body?.token ?? null
    } else {
      return new Response(JSON.stringify({ error: 'method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!token || !UUID_RE.test(token)) {
      return new Response(JSON.stringify({ error: 'ogiltig_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: prospect } = await admin
      .from('workshop_prospects')
      .select('id, company_name, city, do_not_contact, normalized_email, normalized_domain, normalized_phone')
      .eq('unsubscribe_token', token)
      .maybeSingle()

    if (!prospect) {
      return new Response(JSON.stringify({ error: 'okänd_lank' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        ok: true,
        company_name: prospect.company_name,
        city: prospect.city,
        already_unsubscribed: prospect.do_not_contact,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (prospect.do_not_contact) {
      return new Response(JSON.stringify({ ok: true, already_unsubscribed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Triggern sync_prospect_suppression sätter status + skriver till suppression för alla normaliserade värden.
    const { error: updErr } = await admin
      .from('workshop_prospects')
      .update({ do_not_contact: true, notes: 'Avregistrerad via publik länk' })
      .eq('id', prospect.id)
    if (updErr) throw updErr

    return new Response(JSON.stringify({ ok: true, already_unsubscribed: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('prospect-unsubscribe', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
