import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

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

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metoden stöds inte.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const body = parsed.data

    const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (!secret) {
      console.error('TURNSTILE_SECRET_KEY is missing')
      return new Response(JSON.stringify({ error: 'Säkerhetskontrollen är inte konfigurerad just nu.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ip = req.headers.get('cf-connecting-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || ''
    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: body.turnstile_token,
        remoteip: ip,
      }),
    })
    const verification = await verifyResponse.json()

    if (!verification.success || (verification.action && verification.action !== 'submit_bike_request')) {
      return new Response(JSON.stringify({ error: 'Säkerhetskontrollen gick ut eller misslyckades. Bekräfta den igen och försök på nytt.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Backend configuration is missing')

    const supabase = createClient(supabaseUrl, serviceRoleKey)
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
    if (!row?.id || !row?.view_token) throw new Error('Ärendet skapades utan nödvändiga uppgifter')

    const requestUrl = `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(row.view_token)}`
    const customerEmailTask = fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: body.customer_email,
        subject: `Vi har tagit emot ditt cykelärende – ${body.repair_category}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 16px">Tack ${escapeHtml(body.customer_name)}!</h2>
            <p>Vi har tagit emot din förfrågan om <strong>${escapeHtml(body.repair_category)}</strong> för din ${escapeHtml(body.bike_type)}.</p>
            <p>Ärendet granskas innan det skickas vidare till anslutna verkstäder. Du får besked när granskningen är klar.</p>
            <p style="margin-top:24px">
              <a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">
                Följ ditt ärende
              </a>
            </p>
            <p style="color:#666;font-size:13px;margin-top:24px">Spara mejlet. Länken är personlig och fungerar utan konto.</p>
          </div>
        `,
      }),
    }).then(async (response) => {
      if (!response.ok) console.error('Customer confirmation email failed', response.status, await response.text().catch(() => ''))
    }).catch((emailError) => console.error('Customer confirmation email failed', emailError))

    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(customerEmailTask)
    else await customerEmailTask

    return new Response(JSON.stringify(row), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('submit-bike-request error', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Serverfel' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
