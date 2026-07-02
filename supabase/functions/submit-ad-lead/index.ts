import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const CITIES = ['Linköping', 'Norrköping', 'Uppsala', 'Lund'] as const

const BodySchema = z.object({
  workshop_slug: z.string().trim().min(1).max(120),
  customer_name: z.string().trim().min(2).max(80),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().min(6).max(40),
  description: z.string().trim().min(10).max(2000),
  repair_category: z.string().trim().min(1).max(80).optional(),
  bike_type: z.string().trim().min(1).max(80).optional(),
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
      return new Response(JSON.stringify({ error: 'Säkerhetskontrollen är inte konfigurerad.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ip = req.headers.get('cf-connecting-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: body.turnstile_token, remoteip: ip }),
    })
    const verification = await verifyResponse.json()
    if (!verification.success) {
      return new Response(JSON.stringify({ error: 'Säkerhetskontrollen misslyckades. Försök igen.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Backend configuration is missing')

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('id, company_name, email, phone, city, sms_notifications')
      .eq('slug', body.workshop_slug)
      .eq('approved', true)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop) throw new Error('Verkstaden hittades inte eller är inte godkänd.')
    if (!(CITIES as readonly string[]).includes(workshop.city)) {
      throw new Error('Verkstadens stad stöds inte.')
    }

    const { data, error } = await supabase.rpc('submit_bike_repair_request', {
      p_bike_type: body.bike_type || 'Cykel',
      p_repair_category: body.repair_category || 'Övrigt',
      p_description: body.description,
      p_area: null,
      p_postcode: null,
      p_urgency: 'asap',
      p_can_drop_off: true,
      p_wants_pickup: false,
      p_customer_name: body.customer_name,
      p_customer_email: body.customer_email,
      p_customer_phone: body.customer_phone,
      p_city: workshop.city,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.id || !row?.view_token) throw new Error('Ärendet skapades utan nödvändiga uppgifter')

    // Attach preferred workshop so only that workshop is notified on admin approval
    await supabase
      .from('bike_repair_requests')
      .update({ preferred_workshop_id: workshop.id })
      .eq('id', row.id)

    const requestUrl = `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(row.view_token)}`
    const sendEmail = (to: string, subject: string, html: string) => fetch(
      `${supabaseUrl}/functions/v1/send-transactional-email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ to, subject, html }),
      },
    ).catch((err) => console.error('email failed', err))

    const customerTask = sendEmail(
      body.customer_email,
      `Tack! Vi kopplar dig med ${workshop.company_name} i ${workshop.city}`,
      `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
          <h2>Tack ${escapeHtml(body.customer_name)}!</h2>
          <p>Vi har tagit emot din förfrågan och kopplar dig direkt med <strong>${escapeHtml(workshop.company_name)}</strong> i ${escapeHtml(workshop.city)}.</p>
          <p>Så snart förfrågan granskats får verkstaden dina uppgifter och kontaktar dig med en offert.</p>
          <p><a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Följ ditt ärende</a></p>
        </div>`,
    )

    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(customerTask)
    else await customerTask

    return new Response(JSON.stringify({ id: row.id, view_token: row.view_token, request_url: requestUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('submit-ad-lead error', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Serverfel' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
