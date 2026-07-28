import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const REPAIR_CATEGORIES = [
  'Punktering',
  'Bromsproblem',
  'Växelproblem',
  'Kedja',
  'Lager/hjul',
  'Styre/sadel',
  'Elcykel – batteri/motor',
  'Okänt fel / övrigt',
] as const

const BodySchema = z.object({
  customer_name: z.string().trim().min(1).max(120),
  customer_email: z.string().trim().email().max(254),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  city: z.enum(['Linköping', 'Norrköping', 'Uppsala', 'Lund']),
  repair_category: z.enum(REPAIR_CATEGORIES),
  description: z.string().trim().min(10, 'Beskriv felet mer utförligt.').max(2000),
  preferred_date: z.string().optional().nullable(),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Du måste godkänna användarvillkoren för att skicka förfrågan.' })
  }),
  turnstile_token: z.string().min(10).max(4096),
})

const json = (body: unknown, status: number, headers: Record<string, string>) => new Response(
  JSON.stringify(body),
  { status, headers: { ...headers, 'Content-Type': 'application/json' } },
)

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Backend konfiguration saknas.' }, 500, corsHeaders)
  }

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message || 'Kontrollera uppgifterna.' }, 400, corsHeaders)
    }

    const body = parsed.data
    const email = body.customer_email.toLowerCase()
    const now = new Date().toISOString()
    const termsVersion = '2026-07-28'

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    // Skapa view_token för kunden
    const viewToken = crypto.randomUUID()

    const { data: requestData, error: requestError } = await adminClient
      .from('bike_repair_requests')
      .insert({
        customer_name: body.customer_name,
        customer_email: email,
        customer_phone: body.customer_phone || null,
        city: body.city,
        repair_category: body.repair_category,
        description: body.description,
        preferred_date: body.preferred_date || null,
        view_token: viewToken,
        status: 'open',
        customer_terms_accepted_at: now,
        customer_terms_version: termsVersion,
      })
      .select('id')
      .single()

    if (requestError) throw requestError

    // Logga villkorsgodkännande
    try {
      const clientIp = req.headers.get('cf-connecting-ip')
        || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || null
      const userAgent = req.headers.get('user-agent') || null

      await adminClient.rpc('log_terms_acceptance', {
        p_user_id: null,
        p_entity_type: 'customer',
        p_entity_id: requestData.id,
        p_terms_type: 'customer',
        p_terms_version: termsVersion,
        p_ip_address: clientIp,
        p_user_agent: userAgent,
      })
    } catch (auditErr) {
      console.error('Customer terms audit logging failed', auditErr)
    }

    // Notifiera matchande verkstäder (befintlig logik behålls)
    // ... här skulle din befintliga notifieringslogik ligga ...

    return json({
      success: true,
      requestId: requestData.id,
      viewToken,
      message: 'Din förfrågan har skickats. Verkstäder kommer att kontakta dig med offerter.',
    }, 200, corsHeaders)

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Okänt fel'
    console.error('submit-bike-request error', msg)
    return json({ error: msg }, 500, corsHeaders)
  }
})
