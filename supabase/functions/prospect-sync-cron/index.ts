// Schemalagd synkfunktion för prospects. Kan köras manuellt av admin idag och
// senare tidsstyras via pg_cron. AKTIVERAR INGEN automatisk extern kontakt –
// den anropar bara prospect-discover för varje stad i tur och ordning.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const CITIES = ['Linköping', 'Norrköping', 'Uppsala', 'Lund']
const TERMS = ['cykelverkstad', 'cykelservice', 'elcykelservice', 'cykelreparation']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('unauthenticated')
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) throw new Error('unauthenticated')
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') throw new Error('forbidden')

    const results: Record<string, unknown> = {}
    for (const city of CITIES) {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/prospect-discover`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ city, terms: TERMS, limit_per_term: 6, scrape_top: 4 }),
      })
      const body = await response.json().catch(() => ({}))
      results[city] = { status: response.status, ...body }
    }

    return new Response(JSON.stringify({ ok: true, ran_at: new Date().toISOString(), results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    const status = message === 'unauthenticated' ? 401 : message === 'forbidden' ? 403 : 400
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
