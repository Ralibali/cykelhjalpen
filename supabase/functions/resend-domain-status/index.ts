// Admin-only status för Resend-avsändaren. Exponerar aldrig API-nyckeln.
// Returnerar om nyckeln finns och om `cykelhjalpen.se` är verifierad hos Resend.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const REQUIRED_DOMAIN = 'cykelhjalpen.se'

interface ResendDomain {
  id: string
  name: string
  status?: string
  region?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('unauthenticated')

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) throw new Error('unauthenticated')
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') throw new Error('forbidden')

    const configured = Boolean(LOVABLE_API_KEY && RESEND_API_KEY)
    const result: {
      configured: boolean
      required_domain: string
      domain_status: 'unknown' | 'verified' | 'pending' | 'missing' | 'error'
      domain_message: string | null
      from: string
      reply_to: string
    } = {
      configured,
      required_domain: REQUIRED_DOMAIN,
      domain_status: 'unknown',
      domain_message: null,
      from: 'Christoffer på Cykelhjalpen.se <info@cykelhjalpen.se>',
      reply_to: 'info@cykelhjalpen.se',
    }

    if (!configured) {
      result.domain_status = 'error'
      result.domain_message = 'Ingen Resend-nyckel hittad – anslut Resend-connectorn.'
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    try {
      const resendRes = await fetch('https://connector-gateway.lovable.dev/resend/domains', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY!,
        },
      })
      if (!resendRes.ok) {
        const errText = await resendRes.text()
        result.domain_status = 'error'
        result.domain_message = `Resend svarade ${resendRes.status}: ${errText.slice(0, 200)}`
      } else {
        const body = await resendRes.json() as { data?: ResendDomain[] }
        const domains = body?.data || []
        const match = domains.find((d) => (d.name || '').toLowerCase() === REQUIRED_DOMAIN)
        if (!match) {
          result.domain_status = 'missing'
          result.domain_message = `Domänen ${REQUIRED_DOMAIN} är inte tillagd i Resend.`
        } else if ((match.status || '').toLowerCase() === 'verified') {
          result.domain_status = 'verified'
          result.domain_message = `Domänen ${REQUIRED_DOMAIN} är verifierad (${match.region || 'okänd region'}).`
        } else {
          result.domain_status = 'pending'
          result.domain_message = `Domänen ${REQUIRED_DOMAIN} har status "${match.status || 'okänt'}" – DNS/verifiering ej klar.`
        }
      }
    } catch (fetchError) {
      result.domain_status = 'error'
      result.domain_message = `Kunde inte kontakta Resend: ${(fetchError as Error).message}`
    }

    return new Response(JSON.stringify(result), {
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
