import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const BodySchema = z.object({
  workshop_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional().nullable(),
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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Backend konfiguration saknas.' }, 500, corsHeaders)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Ingen auktorisation')

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !userData.user) throw new Error('Ogiltig token')

    // Kontrollera att användaren är admin
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return json({ error: 'Endast admin kan granska verkstäder.' }, 403, corsHeaders)
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message || 'Ogiltig data.' }, 400, corsHeaders)
    }

    const { workshop_id, action, reason } = parsed.data

    const { data: workshop, error: workshopError } = await adminClient
      .from('workshops')
      .select('id, company_name, email, user_id, approved, free_leads_remaining')
      .eq('id', workshop_id)
      .single()

    if (workshopError || !workshop) {
      return json({ error: 'Verkstaden hittades inte.' }, 404, corsHeaders)
    }

    if (action === 'approve') {
      const { error: updateError } = await adminClient
        .from('workshops')
        .update({ approved: true, reviewed_at: new Date().toISOString() })
        .eq('id', workshop_id)

      if (updateError) throw updateError

      // NYTT: Skicka godkännandemailsom nämner gratis leads
      try {
        const freeLeads = workshop.free_leads_remaining ?? 2
        const emailTask = fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            to: workshop.email,
            subject: `Din verkstad är godkänd – välkommen till Cykelhjälpen!`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
              <h2 style="color:#157A6E">🎉 Din verkstad är godkänd!</h2>
              <p>Hej ${escapeHtml(workshop.company_name)}!</p>
              <p>Vi har granskat och <strong>godkänt</strong> din verkstad på Cykelhjälpen. Du kan nu börja ta emot och svara på kundförfrågningar.</p>
              <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin:20px 0">
                <h3 style="margin-top:0;color:#166534">Du har ${freeLeads} gratis leads kvar</h3>
                <p style="margin-bottom:0">Svara på förfrågningar helt utan kostnad. När dina gratis leads är slut kan du enkelt köpa fler direkt i din dashboard.</p>
              </div>
              <p><a href="https://cykelhjalpen.se/dashboard/verkstad" style="display:inline-block;background:#157A6E;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700">Gå till dashboard</a></p>
              <p style="margin-top:24px;color:#666;font-size:14px">Med vänliga hälsningar,<br>Cykelhjälpen-teamet</p>
            </div>`,
          }),
        })

        const edgeRuntime = (globalThis as any).EdgeRuntime
        if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(emailTask)
        else await emailTask
      } catch (emailErr) {
        console.error('Approval email failed', emailErr)
      }

      return json({ success: true, message: 'Verkstaden har godkänts.', approved: true }, 200, corsHeaders)
    } else {
      const { error: updateError } = await adminClient
        .from('workshops')
        .update({ approved: false, rejected_reason: reason, reviewed_at: new Date().toISOString() })
        .eq('id', workshop_id)

      if (updateError) throw updateError

      // Skicka avslagsmail
      try {
        const emailTask = fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            to: workshop.email,
            subject: `Din verkstadsansökan har avslagits`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
              <h2 style="color:#dc2626">Din ansökan har avslagits</h2>
              <p>Hej ${escapeHtml(workshop.company_name)}!</p>
              <p>Vi har tyvärr valt att inte godkänna din verkstad på Cykelhjälpen just nu.</p>
              ${reason ? `<p><strong>Anledning:</strong> ${escapeHtml(reason)}</p>` : ''}
              <p>Har du frågor eller vill diskutera beslutet? Svara på detta mail.</p>
              <p style="margin-top:24px;color:#666;font-size:14px">Med vänliga hälsningar,<br>Cykelhjälpen-teamet</p>
            </div>`,
          }),
        })

        const edgeRuntime = (globalThis as any).EdgeRuntime
        if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(emailTask)
        else await emailTask
      } catch (emailErr) {
        console.error('Rejection email failed', emailErr)
      }

      return json({ success: true, message: 'Verkstaden har avslagits.', approved: false }, 200, corsHeaders)
    }
  } catch (error) {
    console.error('review-workshop error', error)
    return json({ error: 'Något gick fel vid granskningen.' }, 500, corsHeaders)
  }
})
