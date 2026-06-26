import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const SERVICES = [
  'Punktering',
  'Bromsservice',
  'Växelservice',
  'Komplett service',
  'Elcykelservice',
  'Hjulbygge',
  'Mobil reparation',
] as const

const CITIES = ['Linköping', 'Norrköping', 'Uppsala', 'Lund'] as const

const BodySchema = z.object({
  company_name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(128),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(240).optional().nullable(),
  website: z.string().trim().max(300).optional().nullable(),
  city: z.enum(CITIES),
  services: z.array(z.enum(SERVICES)).max(SERVICES.length).default([]),
  terms_accepted: z.literal(true),
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
    console.error('register-workshop missing backend secrets')
    return json({ error: 'Registreringen är inte korrekt konfigurerad just nu.' }, 500, corsHeaders)
  }

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message || 'Kontrollera uppgifterna.' }, 400, corsHeaders)
    }

    const body = parsed.data
    const email = body.email.toLowerCase()
    const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const requestOrigin = req.headers.get('origin') ?? ''
    const allowedOrigin = /^(https:\/\/(www\.)?cykelhjalpen\.se|http:\/\/localhost(:\d+)?)$/i.test(requestOrigin)
      ? requestOrigin
      : 'https://cykelhjalpen.se'

    const { data: authData, error: authError } = await publicClient.auth.signUp({
      email,
      password: body.password,
      options: {
        emailRedirectTo: `${allowedOrigin}/dashboard/verkstad`,
        data: {
          role: 'supplier',
          full_name: body.company_name,
          company_name: body.company_name,
          account_type: 'workshop',
          city: body.city,
        },
      },
    })

    if (authError) {
      const alreadyExists = authError.message.toLowerCase().includes('already')
      return json({
        error: alreadyExists
          ? 'Det finns redan ett konto med den e-postadressen. Logga in istället.'
          : authError.message,
      }, 400, corsHeaders)
    }

    const user = authData.user
    if (!user?.id) return json({ error: 'Kunde inte skapa kontot.' }, 500, corsHeaders)

    if (Array.isArray(user.identities) && user.identities.length === 0) {
      return json({ error: 'Det finns redan ett konto med den e-postadressen. Logga in istället.' }, 409, corsHeaders)
    }

    const normalizedWebsite = body.website
      ? (/^https?:\/\//i.test(body.website) ? body.website : `https://${body.website}`)
      : null

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: user.id,
      role: 'supplier',
      full_name: body.company_name,
      email,
      company_name: body.company_name,
      city: body.city,
      phone: body.phone || null,
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(user.id)
      console.error('register-workshop profile error', profileError)
      return json({ error: 'Kunde inte skapa verkstadsprofilen. Försök igen.' }, 400, corsHeaders)
    }

    const { error: workshopError } = await adminClient.from('workshops').insert({
      user_id: user.id,
      company_name: body.company_name,
      email,
      phone: body.phone || null,
      address: body.address || null,
      website: normalizedWebsite,
      services: body.services,
      city: body.city,
    })

    if (workshopError) {
      await adminClient.auth.admin.deleteUser(user.id)
      console.error('register-workshop workshop error', workshopError)
      return json({ error: 'Kunde inte spara verkstaden. Försök igen.' }, 400, corsHeaders)
    }

    return json({
      userId: user.id,
      session: authData.session,
      needsEmailConfirmation: !authData.session,
      city: body.city,
    }, 200, corsHeaders)
  } catch (error) {
    console.error('register-workshop error', error)
    return json({ error: 'Något gick fel vid registreringen. Försök igen.' }, 500, corsHeaders)
  }
})
