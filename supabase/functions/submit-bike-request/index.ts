import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { notifyAdminsOfPendingRequest } from '../_shared/notifications.ts'
import { sendAdminAlert } from '../_shared/admin-alert.ts'
import { cityHasActiveWorkshop, publishApprovedBikeRequest } from '../_shared/publish-bike-request.ts'


const CITIES = ['Linköping', 'Norrköping', 'Uppsala', 'Lund'] as const
const BIKE_TYPES = ['Vanlig cykel', 'Elcykel', 'Elsparkcykel', 'Mountainbike', 'Racercykel', 'Lådcykel', 'Barncykel', 'Annat'] as const
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
  customer_language: z.enum(['sv', 'en']).optional().default('sv'),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Du måste godkänna användarvillkoren för att skicka förfrågan.' }),
  }),
  // V2 S8: frivillig opt-in för servicepåminnelser (default false = ej samlad).
  reminder_opt_in: z.boolean().optional().default(false),
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

    // Hostname-blockering borttagen 2026-07-30: den falsk-positivt avvisade äkta
    // användare på förhandsvisnings- och tunneldomäner. Token är single-use,
    // kortlivad och validerad mot vår hemliga nyckel; action-kollen kvarstår.
    if (verification.hostname && !allowedTurnstileHostname(verification.hostname)) {
      console.warn(`Turnstile-token utfärdad på ovanlig domän: ${verification.hostname}`)
    }

    if (!verification.success
      || (verification.action && verification.action !== 'submit_bike_request')) {
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
      p_customer_language: body.customer_language ?? 'sv',
    })
    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    if (!row?.id || !row?.view_token) throw new Error('Ärendet skapades utan nödvändiga uppgifter')

    // Juridisk spårning av villkorsgodkännande (kundvillkor, version 2026-07-30).
    // Misslyckas loggningen ska ärendet ändå gå iväg – därför skyddas den i try/catch.
    const termsVersion = '2026-07-30'
    try {
      const now = new Date().toISOString()
      const requestId = (row as { id?: string } | null)?.id
      if (requestId) {
        await supabase
          .from('bike_repair_requests')
          .update({ customer_terms_accepted_at: now, customer_terms_version: termsVersion })
          .eq('id', requestId)
        const clientIp = req.headers.get('cf-connecting-ip')
          || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || null
        await supabase.rpc('log_terms_acceptance', {
          p_user_id: null,
          p_entity_type: 'customer',
          p_entity_id: requestId,
          p_terms_type: 'customer',
          p_terms_version: termsVersion,
          p_ip_address: clientIp,
          p_user_agent: req.headers.get('user-agent') || null,
        })
      }
    } catch (termsError) {
      console.error('Customer terms tracking failed', termsError)
    }

    // V2 S8: lagra samtycke för servicepåminnelser när kunden kryssat i rutan.
    // Skyddad i try/catch – samtyckeslagring får aldrig stoppa själva ärendet.
    if (body.reminder_opt_in) {
      try {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.customer_email))
        const subjectKey = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
        await supabase.from('v2_retention_contacts').upsert({
          subject_type: 'customer',
          subject_key: subjectKey,
          consent_basis: 'marketing_consent',
          consent_at: new Date().toISOString(),
          unsubscribed_at: null,
          lifecycle_stage: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'subject_type,subject_key' })
      } catch (consentError) {
        console.error('Reminder opt-in storage failed', consentError)
      }
    }

    let autoApproved = false
    try {
      // Same eligibility as admin-health: approved workshop + quote in last 30 days, exact city.
      if (await cityHasActiveWorkshop(supabase, body.city)) {
        await publishApprovedBikeRequest({
          admin: supabase,
          supabaseUrl,
          serviceRoleKey,
          requestRow: {
            id: row.id,
            view_token: row.view_token,
            customer_name: body.customer_name,
            customer_email: body.customer_email,
            bike_type: body.bike_type,
            repair_category: body.repair_category,
            description: body.description,
            area: body.area || null,
            city: body.city,
            urgency: body.urgency,
            admin_status: 'pending_approval',
          },
        })
        autoApproved = true
      }
    } catch (autoApproveError) {
      console.error('Auto-approve failed; leaving request pending for manual admin', autoApproveError)
    }

    const backgroundTasks: Promise<unknown>[] = []

    if (!autoApproved) {
      const requestUrl = `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(row.view_token)}`
      backgroundTasks.push(fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
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
      }).catch((emailError) => console.error('Customer confirmation email failed', emailError)))

      backgroundTasks.push(notifyAdminsOfPendingRequest(supabase, {
        city: body.city,
        repair_category: body.repair_category,
        request_id: (row as { id?: string } | null)?.id,
      }).catch((notifyError) => console.error('Admin notification insert failed', notifyError)))

      backgroundTasks.push(sendAdminAlert({
        supabaseUrl,
        serviceRoleKey,
        subject: `Nytt cykelärende i ${body.city} – ${body.repair_category}`,
        heading: 'Nytt ärende väntar på granskning',
        rows: [
          ['Stad', body.city],
          ['Problem', body.repair_category],
          ['Cykeltyp', body.bike_type],
          ['Beskrivning', body.description],
          ['Kund', body.customer_name],
          ['E-post', body.customer_email],
          ['Telefon', body.customer_phone],
          ['Område', body.area],
        ],
        ctaUrl: 'https://cykelhjalpen.se/admin/cykelarenden',
        ctaLabel: 'Granska ärendet',
      }))
    }

    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (backgroundTasks.length > 0) {
      if (edgeRuntime?.waitUntil) {
        for (const task of backgroundTasks) edgeRuntime.waitUntil(task)
      } else {
        await Promise.all(backgroundTasks)
      }
    }

    return new Response(JSON.stringify({
      ...row,
      admin_status: autoApproved ? 'approved' : 'pending_approval',
      auto_approved: autoApproved,
    }), {
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
