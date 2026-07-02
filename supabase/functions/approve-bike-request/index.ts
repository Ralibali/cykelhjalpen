import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const ActionSchema = z.object({
  request_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(500).optional().nullable(),
})

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const urgencyLabel = (value: string | null) => ({
  asap: 'Så snart som möjligt',
  this_week: 'Den här veckan',
  flexible: 'Flexibel',
}[value || ''] || value || 'Ej angivet')

const toE164 = (raw: string) => {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('0')) return `+46${digits.slice(1)}`
  return digits
}

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
    if (!authHeader) throw new Error('Ingen inloggning hittades')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error('Backend configuration is missing')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData.user) throw new Error('Du behöver logga in igen')

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (profileError || profile?.role !== 'admin') throw new Error('Du saknar adminbehörighet')

    const parsed = ActionSchema.safeParse(await req.json())
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Ogiltig begäran')
    const { request_id, action, reason } = parsed.data

    const { data: requestRow, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id, view_token, customer_name, customer_email, bike_type, repair_category, description, area, city, urgency, admin_status, preferred_workshop_id')
      .eq('id', request_id)
      .maybeSingle()
    if (requestError) throw requestError
    if (!requestRow) throw new Error('Ärendet hittades inte')

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    if (requestRow.admin_status === newStatus) {
      return new Response(JSON.stringify({ success: true, status: newStatus, already_applied: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await admin
      .from('bike_repair_requests')
      .update({
        admin_status: newStatus,
        approved_at: action === 'approve' ? new Date().toISOString() : null,
        rejected_reason: action === 'reject' ? (reason || null) : null,
      })
      .eq('id', request_id)
    if (updateError) throw updateError

    const sendEmail = async (to: string, subject: string, html: string) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ to, subject, html }),
      })
      if (!response.ok) {
        throw new Error(`E-postfel ${response.status}: ${(await response.text().catch(() => '')).slice(0, 160)}`)
      }
    }

    const requestUrl = requestRow.view_token
      ? `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(requestRow.view_token)}`
      : 'https://cykelhjalpen.se/'
    const safeName = escapeHtml(requestRow.customer_name)
    const safeBikeType = escapeHtml(requestRow.bike_type)
    const safeCategory = escapeHtml(requestRow.repair_category)
    const safeReason = escapeHtml(reason)

    const customerEmail = sendEmail(
      requestRow.customer_email,
      action === 'approve'
        ? 'Ditt cykelärende är godkänt och skickat till verkstäder'
        : 'Vi kunde tyvärr inte publicera ditt cykelärende',
      action === 'approve'
        ? `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 16px">Hej ${safeName}!</h2>
            <p>Ditt ärende om <strong>${safeCategory}</strong> för din ${safeBikeType} är nu godkänt.</p>
            <p>Det har skickats till anslutna cykelverkstäder i ${escapeHtml(requestRow.city || 'Linköping')}. Du får besked när en verkstad lämnar offert.</p>
            <p style="margin-top:24px"><a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Följ ditt ärende</a></p>
          </div>
        `
        : `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 16px">Hej ${safeName}!</h2>
            <p>Vi kunde tyvärr inte publicera ditt ärende om <strong>${safeCategory}</strong>.</p>
            ${reason ? `<p><strong>Anledning:</strong> ${safeReason}</p>` : ''}
            <p>Du är välkommen att justera uppgifterna och skicka in en ny förfrågan.</p>
          </div>
        `,
    ).catch((error) => console.error('Customer status email failed', error))

    let workshopEmailResults: PromiseSettledResult<void>[] = []
    let notifiedWorkshops = 0
    let smsSent = 0

    if (action === 'approve') {
      const city = requestRow.city || 'Linköping'
      const { data: workshops, error: workshopsError } = await admin
        .from('workshops')
        .select('email, company_name, phone, sms_notifications')
        .eq('approved', true)
        .eq('city', city)
      if (workshopsError) throw workshopsError

      notifiedWorkshops = workshops?.length || 0
      const description = requestRow.description.length > 300
        ? `${requestRow.description.slice(0, 300)}…`
        : requestRow.description
      const dashboardUrl = 'https://cykelhjalpen.se/dashboard/verkstad/arenden'

      workshopEmailResults = await Promise.allSettled((workshops || []).map((workshop) => sendEmail(
        workshop.email,
        `Nytt godkänt cykelärende i ${city} – ${requestRow.repair_category}`,
        `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 16px">Nytt cykelärende i ${escapeHtml(city)}</h2>
            <p>Hej ${escapeHtml(workshop.company_name)}, en kund söker hjälp:</p>
            <table style="border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:4px 12px 4px 0;color:#555">Cykel:</td><td><strong>${safeBikeType}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#555">Problem:</td><td><strong>${safeCategory}</strong></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#555">När:</td><td>${escapeHtml(urgencyLabel(requestRow.urgency))}</td></tr>
              ${requestRow.area ? `<tr><td style="padding:4px 12px 4px 0;color:#555">Område:</td><td>${escapeHtml(requestRow.area)}</td></tr>` : ''}
            </table>
            <p style="background:#f5f5f5;padding:12px;border-radius:6px">${escapeHtml(description)}</p>
            <p style="margin-top:24px"><a href="${dashboardUrl}" style="display:inline-block;background:#4338CA;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Öppna ärendet och lämna offert</a></p>
          </div>
        `,
      )))

      const elksUser = Deno.env.get('ELKS_API_USERNAME')
      const elksPassword = Deno.env.get('ELKS_API_PASSWORD')
      if (elksUser && elksPassword) {
        const recipients = (workshops || []).filter((workshop) => workshop.sms_notifications && workshop.phone)
        const auth = btoa(`${elksUser}:${elksPassword}`)
        const message = `Nytt godkänt cykelärende i ${city}: ${requestRow.repair_category}. Svara i verkstadsvyn: cykelhjalpen.se/dashboard/verkstad/arenden`
        const smsResults = await Promise.allSettled(recipients.map(async (workshop) => {
          const response = await fetch('https://api.46elks.com/a1/sms', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              from: 'CykelHjalp',
              to: toE164(workshop.phone || ''),
              message,
            }),
          })
          if (!response.ok) throw new Error(`SMS-fel ${response.status}`)
        }))
        smsSent = smsResults.filter((result) => result.status === 'fulfilled').length
      }
    }

    await customerEmail

    const { error: auditError } = await admin.from('audit_log').insert({
      admin_id: userData.user.id,
      action: action === 'approve' ? 'bike_request_approved' : 'bike_request_rejected',
      target_type: 'bike_repair_request',
      target_id: request_id,
      details: {
        reason: reason || null,
        workshops_found: notifiedWorkshops,
        workshop_emails_sent: workshopEmailResults.filter((result) => result.status === 'fulfilled').length,
        sms_sent: smsSent,
      },
    })
    if (auditError) console.error('Audit log failed', auditError)

    return new Response(JSON.stringify({
      success: true,
      status: newStatus,
      workshops_notified: notifiedWorkshops,
      workshop_emails_sent: workshopEmailResults.filter((result) => result.status === 'fulfilled').length,
      sms_sent: smsSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('approve-bike-request', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
