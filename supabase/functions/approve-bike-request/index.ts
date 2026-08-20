import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { APPROVED_ADMIN_STATUS, publishApprovedBikeRequest } from '../_shared/publish-bike-request.ts'


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

    const newStatus = action === 'approve' ? APPROVED_ADMIN_STATUS : 'rejected'
    if (requestRow.admin_status === newStatus) {
      return new Response(JSON.stringify({ success: true, status: newStatus, already_applied: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let notifiedWorkshops = 0
    let workshopEmailsSent = 0
    let smsSent = 0

    if (action === 'approve') {
      const published = await publishApprovedBikeRequest({
        admin,
        supabaseUrl,
        serviceRoleKey,
        requestRow,
      })
      notifiedWorkshops = published.workshops_notified
      workshopEmailsSent = published.workshop_emails_sent
      smsSent = published.sms_sent
    } else {
      const { error: updateError } = await admin
        .from('bike_repair_requests')
        .update({
          admin_status: 'rejected',
          approved_at: null,
          rejected_reason: reason || null,
        })
        .eq('id', request_id)
      if (updateError) throw updateError

      const requestUrl = requestRow.view_token
        ? `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(requestRow.view_token)}`
        : 'https://cykelhjalpen.se/'
      const safeName = escapeHtml(requestRow.customer_name)
      const safeCategory = escapeHtml(requestRow.repair_category)
      const safeReason = escapeHtml(reason)

      await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          to: requestRow.customer_email,
          subject: 'Vi kunde tyvärr inte publicera ditt cykelärende',
          html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 16px">Hej ${safeName}!</h2>
            <p>Vi kunde tyvärr inte publicera ditt ärende om <strong>${safeCategory}</strong>.</p>
            ${reason ? `<p><strong>Anledning:</strong> ${safeReason}</p>` : ''}
            <p>Du är välkommen att justera uppgifterna och skicka in en ny förfrågan.</p>
            <p style="margin-top:24px"><a href="${requestUrl}">Visa ärendet</a></p>
          </div>
        `,
        }),
      }).catch((error) => console.error('Customer status email failed', error))
    }

    const { error: auditError } = await admin.from('audit_log').insert({
      admin_id: userData.user.id,
      action: action === 'approve' ? 'bike_request_approved' : 'bike_request_rejected',
      target_type: 'bike_repair_request',
      target_id: request_id,
      details: {
        reason: reason || null,
        workshops_found: notifiedWorkshops,
        workshop_emails_sent: workshopEmailsSent,
        sms_sent: smsSent,
      },
    })
    if (auditError) console.error('Audit log failed', auditError)

    return new Response(JSON.stringify({
      success: true,
      status: newStatus,
      workshops_notified: notifiedWorkshops,
      workshop_emails_sent: workshopEmailsSent,
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
