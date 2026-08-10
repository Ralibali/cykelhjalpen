import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const BodySchema = z.object({ request_id: z.string().uuid() })

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Du behöver logga in.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.' }, 500)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
    if (userError || !userData.user) return json({ error: 'Du behöver logga in igen.' }, 401)

    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') return json({ error: 'Du saknar adminbehörighet.' }, 403)

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: 'Ogiltig begäran.' }, 400)

    const { data: request } = await admin
      .from('bike_repair_requests')
      .select('id, bike_type, repair_category, description, city, area, admin_status, created_at')
      .eq('id', parsed.data.request_id)
      .maybeSingle()
    if (!request) return json({ error: 'Ärendet hittades inte.' }, 404)
    if (request.admin_status !== 'approved') return json({ error: 'Ärendet är inte godkänt ännu.' }, 400)

    const { data: workshops } = await admin
      .from('workshops')
      .select('id, email, company_name')
      .eq('approved', true)
      .eq('city', request.city)

    if (!workshops || workshops.length === 0) return json({ error: `Inga godkända verkstäder i ${request.city}.` }, 404)

    const description = request.description.length > 300 ? `${request.description.slice(0, 300)}…` : request.description
    const dashboardUrl = 'https://cykelhjalpen.se/dashboard/verkstad/arenden'

    const results = await Promise.allSettled(workshops.map(async (workshop) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          to: workshop.email,
          subject: `Påminnelse: kund väntar fortfarande på offert i ${request.city}`,
          html: `
            <h2 style="margin:0 0 16px">En kund väntar på svar i ${escapeHtml(request.city)}</h2>
            <p>Hej ${escapeHtml(workshop.company_name)}, det här ärendet har fortfarande inga offerter:</p>
            <table style="border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:4px 12px 4px 0;color:#555">Cykel:</td><td><strong>${escapeHtml(request.bike_type)}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#555">Problem:</td><td><strong>${escapeHtml(request.repair_category)}</strong></td></tr>
              ${request.area ? `<tr><td style="padding:4px 12px 4px 0;color:#555">Område:</td><td>${escapeHtml(request.area)}</td></tr>` : ''}
            </table>
            <p style="background:#f5f5f5;padding:12px;border-radius:6px">${escapeHtml(description)}</p>
            <p>Att lämna offert är gratis – du betalar bara om kunden väljer dig.</p>
            <p style="margin-top:24px"><a href="${dashboardUrl}" style="display:inline-block;background:#4338CA;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Lämna offert nu</a></p>
          `,
        }),
      })
      if (!response.ok) throw new Error(`E-postfel ${response.status}`)
    }))

    const sent = results.filter((r) => r.status === 'fulfilled').length

    await admin.from('audit_log').insert({
      admin_id: userData.user.id,
      action: 'bike_request_nudged',
      target_type: 'bike_repair_request',
      target_id: request.id,
      details: { city: request.city, workshops: workshops.length, emails_sent: sent },
    })

    return json({ success: true, workshops: workshops.length, emails_sent: sent })
  } catch (error) {
    console.error('nudge-workshops', error)
    return json({ error: error instanceof Error ? error.message : 'Något gick fel.' }, 500)
  }
})
