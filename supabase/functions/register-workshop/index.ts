import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'

const SERVICES = [
  'Punktering',
  'Bromsservice',
  'Växelservice',
  'Komplett service',
  'Elcykelservice',
  'Elsparkcykelservice',
  'Hjulbygge',
  'Mobil reparation',
] as const

const CITIES = ['Linköping', 'Norrköping', 'Uppsala', 'Lund'] as const

const BodySchema = z.object({
  company_name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  password: z.string().min(8, 'Lösenordet måste vara minst åtta tecken.').max(128),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(240).optional().nullable(),
  website: z.string().trim().max(300).optional().nullable(),
  city: z.enum(CITIES),
  services: z.array(z.enum(SERVICES)).max(SERVICES.length).default([]),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Du måste godkänna plattformsavtalet för att registrera dig.' })
  }),
  dpa_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Du måste godkänna personuppgiftsbiträdesavtalet (GDPR).' })
  }),
  marketing_accepted: z.boolean().optional().default(false),
  turnstile_token: z.string().min(10, 'Bekräfta säkerhetskontrollen innan du registrerar verkstaden.').max(4096),
})

const json = (body: unknown, status: number, headers: Record<string, string>) => new Response(
  JSON.stringify(body),
  { status, headers: { ...headers, 'Content-Type': 'application/json' } },
)

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

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

    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (!turnstileSecret) {
      console.error('register-workshop: TURNSTILE_SECRET_KEY is missing')
      return json({ error: 'Säkerhetskontrollen är inte konfigurerad just nu.' }, 500, corsHeaders)
    }
    const remoteip = req.headers.get('cf-connecting-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || ''
    const turnstileResult = await verifyTurnstile({
      secret: turnstileSecret,
      token: body.turnstile_token,
      expectedAction: 'register_workshop',
      remoteip,
    })
    if (!turnstileResult.ok) {
      return json({ error: turnstileResult.error }, turnstileResult.status, corsHeaders)
    }

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

    const now = new Date().toISOString()
    const termsVersion = '2026-07-30'

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
      free_leads_remaining: 2,
      terms_accepted_at: now,
      terms_version: termsVersion,
      dpa_accepted_at: now,
    })

    if (workshopError) {
      await adminClient.auth.admin.deleteUser(user.id)
      console.error('register-workshop workshop error', workshopError)
      return json({ error: 'Kunde inte spara verkstaden. Försök igen.' }, 400, corsHeaders)
    }

    // Logga villkorsgodkännande i audit trail
    try {
      const clientIp = req.headers.get('cf-connecting-ip')
        || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || null
      const userAgent = req.headers.get('user-agent') || null

      await adminClient.rpc('log_terms_acceptance', {
        p_user_id: user.id,
        p_entity_type: 'workshop',
        p_entity_id: user.id,
        p_terms_type: 'workshop',
        p_terms_version: termsVersion,
        p_ip_address: clientIp,
        p_user_agent: userAgent,
      })

      await adminClient.rpc('log_terms_acceptance', {
        p_user_id: user.id,
        p_entity_type: 'workshop',
        p_entity_id: user.id,
        p_terms_type: 'dpa',
        p_terms_version: termsVersion,
        p_ip_address: clientIp,
        p_user_agent: userAgent,
      })
    } catch (auditErr) {
      console.error('Terms audit logging failed', auditErr)
    }

    // Välkomstmail med juridisk info
    try {
      const emailTask = fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          to: email,
          subject: `Välkommen till Cykelhjälpen, ${escapeHtml(body.company_name)}!`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h2 style="color:#157A6E">Välkommen till Cykelhjälpen!</h2>
            <p>Hej ${escapeHtml(body.company_name)}!</p>
            <p>Tack för att du registrerade din verkstad hos oss.</p>
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin:20px 0">
              <h3 style="margin-top:0;color:#166534">🎁 2 gratis leads väntar på dig</h3>
              <p style="margin-bottom:0">Som ny verkstad får du <strong>2 gratis leads</strong> att svara på helt utan kostnad. Efter det är priset 50 kr per offert.</p>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:20px 0">
              <h3 style="margin-top:0;color:#1e40af">📋 Viktigt att komma ihåg</h3>
              <ul style="margin-bottom:0;padding-left:20px">
                <li>Offerten du skickar ska <strong>gälla det problem kunden beskrivit</strong> – avviker felet ska kunden alltid informeras och godkänna det nya priset först.</li>
                <li>Du måste inhämta kundens godkännande innan du påbörjar arbete som väsentligt avviker från offerten (Konsumenttjänstlagen 32 §).</li>
                <li>Vi är en förmedlare – du ansvarar själv för ditt arbete och din prissättning.</li>
              </ul>
            </div>
            <p><strong>Nästa steg:</strong></p>
            <ul>
              <li>Bekräfta din e-postadress</li>
              <li>Vänta på att vårt team godkänner din verkstad</li>
              <li>Börja ta emot och svara på förfrågningar</li>
            </ul>
            <p>Har du frågor? Svara på detta mail så hjälper vi dig.</p>
            <p style="margin-top:24px;color:#666;font-size:14px">Med vänliga hälsningar,<br>Cykelhjälpen-teamet</p>
          </div>`,
        }),
      })

      const edgeRuntime = (globalThis as any).EdgeRuntime
      if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(emailTask)
      else await emailTask
    } catch (emailErr) {
      console.error('Welcome email failed', emailErr)
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
