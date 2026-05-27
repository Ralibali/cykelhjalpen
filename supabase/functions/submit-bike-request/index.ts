import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const BodySchema = z.object({
  bike_type: z.string().min(1).max(80),
  repair_category: z.string().min(1).max(80),
  description: z.string().trim().min(10).max(2000),
  area: z.string().trim().max(80).optional().nullable(),
  postcode: z.string().trim().max(10).optional().nullable(),
  urgency: z.string().min(1).max(40),
  can_drop_off: z.boolean(),
  wants_pickup: z.boolean(),
  customer_name: z.string().trim().min(2).max(80),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(80).optional().default('Linköping'),
  turnstile_token: z.string().min(10).max(4096),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const json = await req.json()
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const body = parsed.data

    // Verify Turnstile
    const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Turnstile not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: body.turnstile_token, remoteip: ip }),
    })
    const verify = await verifyRes.json()
    if (!verify.success) {
      return new Response(JSON.stringify({ error: 'Turnstile-verifiering misslyckades' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await supabase.rpc('submit_bike_repair_request', {
      p_bike_type: body.bike_type,
      p_repair_category: body.repair_category,
      p_description: body.description,
      p_area: body.area ?? null,
      p_postcode: body.postcode ?? null,
      p_urgency: body.urgency,
      p_can_drop_off: body.can_drop_off,
      p_wants_pickup: body.wants_pickup,
      p_customer_name: body.customer_name,
      p_customer_email: body.customer_email,
      p_customer_phone: body.customer_phone ?? null,
      p_city: body.city ?? 'Linköping',
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return new Response(JSON.stringify(row), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
