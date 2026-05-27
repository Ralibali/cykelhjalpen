import { corsFor } from '../_shared/cors.ts'

Deno.serve((req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const siteKey = Deno.env.get('TURNSTILE_SITE_KEY') ?? ''
  return new Response(JSON.stringify({ siteKey }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})
