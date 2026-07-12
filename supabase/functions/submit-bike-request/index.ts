import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { notifyAdminsOfPendingRequest } from '../_shared/notifications.ts'


const CITIES = ['Linköping', 'Norrköping', 'Uppsala', 'Lund'] as const
const BIKE_TYPES = ['Vanlig cykel', 'Elcykel', 'Mountainbike', 'Racercykel', 'Lådcykel', 'Barncykel', 'Annat'] as const
const REPAIR_CATEGORIES = [
  'Punktering / däckbyte',
  'Bromsar',
  'Växlar / kedja',
  'Service / genomgång',
  'Elcykel-problem',
  'Hjul / ekrar',
  'Lyse / elektronik',
  'Annat',
] as const
const URGENCIES = ['asap', 'this_week', 'flexible'] as const

const BodySchema = z.object({
  bike_type: z.enum(BIKE_TYPES),
  repair_category: z.enum(REPAIR_CATEGORIES),
  description: z.string().trim().min(10).max(2000),
  area: z.string().trim().max(80).optional().nullable(),
  postcode: z.string().trim().max(10).refine((value) => !value || /^\d{3}\s?\d{2}$/.test(value), 'invalid postcode').optional().nullable(),
  urgency: z.enum(URGENCIES),
  can_drop_off: z.boolean(),
  wants_pickup: z.boolean(),
  customer_name: z.string().trim().min(2).max(80),
  customer_email: z.string().trim().toLowerCase().email().max(160),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  city: z.enum(CITIES),
  turnstile_token: z.string().min(10).max(4096),
}).refine((value) => value.can_drop_off || value.wants_pickup, {
  message: 'dropoff_or_pickup_required',
  path: ['can_drop_off'],
})

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const allowedTurnstileHostname = (hostname: unknown) => {
  if (typeof hostname !== 'string' || !hostname) return true
  const normalized = hostname.toLowerCase()
  return normalized === 'cykelhjalpen.se'
    || normalized === 'www.cykelhjalpen.se'
    || normalized === 'localhost'
    || normalized.endsWith('.lovable.app')
}

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
    if (!verifyResponse.ok) throw new Error('Turnstile verification service unavailable')
    const verification = await verifyResponse.json()

    if (!verification.success
      || (verification.action && verification.action !== 'submit_bike_request')
      || !allowedTurnstileHostname(verification.hostname)) {
      return new Response(JSON.stringify({ error: 'Säkerhetskontrollen gick ut eller misslyckades. Bekräfta den igen och försök på nytt.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Backend configuration is missing')

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data, error } = await supabase.rpc('submit_bike_repair_request', {
      p_bike_type: body.bike_type,
      p_repair_category: body.repair_category,
      p_description: body.description,
      p_area: body.area || null,
      p_postcode: body.postcode ? body.postcode.replace(/\s/g, '') : null,
      p_urgency: body.urgency,
      p_can_drop_off: body.can_drop_off,
      p_wants_pickup: body.wants_pickup,
      p_customer_name: body.customer_name,
      p_customer_email: body.customer_email,
      p_customer_phone: body.customer_phone || null,
      p_city: body.city,
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
        subject: `Vi har tagit emot ditt cykelärende i ${body.city} – ${body.repair_category}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 16px">Tack ${escapeHtml(body.customer_name)}!</h2>
            <p>Vi har tagit emot din förfrågan om <strong>${escapeHtml(body.repair_category)}</strong> för din ${escapeHtml(body.bike_type)} i <strong>${escapeHtml(body.city)}</strong>.</p>
            <p>Ärendet granskas innan det skickas vidare till anslutna verkstäder i den valda staden. Du får besked när granskningen är klar.</p>
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

    // In-app notification till admins så nya ärenden syns i klockan utan polling.
    const adminNotifyTask = notifyAdminsOfPendingRequest(supabase, {
      city: body.city,
      repair_category: body.repair_category,
    }).catch((notifyError) => console.error('Admin notification insert failed', notifyError))

    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(customerEmailTask)
      edgeRuntime.waitUntil(adminNotifyTask)
    } else {
      await Promise.all([customerEmailTask, adminNotifyTask])
    }

    return new Response(JSON.stringify(row), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('submit-bike-request error', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Serverfel' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
