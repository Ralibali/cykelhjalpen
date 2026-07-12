import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const BodySchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().max(500).optional().nullable(),
})

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metoden stöds inte.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Du behöver logga in')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error('Backend configuration is missing')

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) throw new Error('Ogiltigt granskningsbeslut')

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData.user) throw new Error('Du behöver logga in igen')

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: isAdmin, error: roleError } = await admin.rpc('is_admin', { _user_id: userData.user.id })
    if (roleError) throw roleError
    if (!isAdmin) throw new Error('Du saknar administratörsbehörighet')

    const { data: requestRow, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id, view_token, customer_name, customer_email, bike_type, repair_category, city, admin_status')
      .eq('id', parsed.data.request_id)
      .maybeSingle()
    if (requestError) throw requestError
    if (!requestRow) throw new Error('Ärendet hittades inte')

    const reason = parsed.data.decision === 'rejected'
      ? parsed.data.reason?.trim() || 'Ärendet kunde inte publiceras i sin nuvarande form.'
      : null

    if (requestRow.admin_status === parsed.data.decision) {
      return new Response(JSON.stringify({ success: true, unchanged: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    const { error: updateError } = await admin
      .from('bike_repair_requests')
      .update({
        admin_status: parsed.data.decision,
        approved_at: parsed.data.decision === 'approved' ? new Date().toISOString() : null,
        rejected_reason: reason,
      })
      .eq('id', requestRow.id)
    if (updateError) throw updateError

    const { error: auditError } = await admin.from('audit_log').insert({
      admin_id: userData.user.id,
      action: `bike_request_${parsed.data.decision}`,
      target_type: 'bike_repair_request',
      target_id: requestRow.id,
      details: {
        city: requestRow.city,
        repair_category: requestRow.repair_category,
        reason,
      },
    })
    if (auditError) console.error('Could not write bike request audit log', auditError)

    const customerUrl = `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(requestRow.view_token)}`
    const customerEmail = fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        to: requestRow.customer_email,
        subject: parsed.data.decision === 'approved'
          ? `Ditt cykelärende i ${requestRow.city} är publicerat`
          : 'Uppdatering om ditt cykelärende',
        html: parsed.data.decision === 'approved'
          ? `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111"><h2>Hej ${escapeHtml(requestRow.customer_name)}!</h2><p>Ditt ärende om <strong>${escapeHtml(requestRow.repair_category)}</strong> är nu godkänt och synligt för anslutna verkstäder i <strong>${escapeHtml(requestRow.city)}</strong>.</p><p><a href="${customerUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Följ ärendet</a></p></div>`
          : `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111"><h2>Hej ${escapeHtml(requestRow.customer_name)}!</h2><p>Vi kunde tyvärr inte publicera ditt cykelärende.</p><p><strong>Anledning:</strong> ${escapeHtml(reason)}</p><p>Du är välkommen att svara på detta mejl eller kontakta info@cykelhjalpen.se så hjälper vi dig.</p><p><a href="${customerUrl}">Visa ärendet</a></p></div>`,
      }),
    }).then(async (response) => {
      if (!response.ok) console.error('Customer review email failed', response.status, await response.text().catch(() => ''))
    }).catch((error) => console.error('Customer review email failed', error))

    const backgroundTasks: Promise<unknown>[] = [customerEmail]

    if (parsed.data.decision === 'approved') {
      const { data: workshops, error: workshopsError } = await admin
        .from('workshops')
        .select('id, user_id, company_name, email')
        .eq('approved', true)
        .eq('city', requestRow.city)
      if (workshopsError) throw workshopsError

      if ((workshops || []).length > 0) {
        const notifications = (workshops || []).map((workshop) => ({
          user_id: workshop.user_id,
          title: 'Nytt cykelärende i din stad',
          message: `${requestRow.bike_type} · ${requestRow.repair_category}`,
          type: 'bike_request',
          link: '/dashboard/verkstad/arenden',
        }))
        const { error: notificationError } = await admin.from('notifications').insert(notifications)
        if (notificationError) console.error('Could not create workshop notifications', notificationError)

        for (const workshop of workshops || []) {
          if (!workshop.email) continue
          backgroundTasks.push(fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              to: workshop.email,
              subject: `Nytt cykelärende i ${requestRow.city} – ${requestRow.repair_category}`,
              html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111"><h2>Hej ${escapeHtml(workshop.company_name)}!</h2><p>Ett nytt ärende för <strong>${escapeHtml(requestRow.bike_type)}</strong> inom <strong>${escapeHtml(requestRow.repair_category)}</strong> finns nu i ${escapeHtml(requestRow.city)}.</p><p><a href="https://cykelhjalpen.se/dashboard/verkstad/arenden" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Visa ärendet</a></p></div>`,
            }),
          }).then(async (response) => {
            if (!response.ok) console.error('Workshop request email failed', workshop.id, response.status)
          }).catch((error) => console.error('Workshop request email failed', workshop.id, error)))
        }
      }
    }

    const allTasks = Promise.allSettled(backgroundTasks)
    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(allTasks)
    else await allTasks

    return new Response(JSON.stringify({ success: true, status: parsed.data.decision }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('review-bike-request', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
