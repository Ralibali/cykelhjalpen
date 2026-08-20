import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { APPROVED_ADMIN_STATUS, publishApprovedBikeRequest } from '../_shared/publish-bike-request.ts'


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
      .select('id, view_token, customer_name, customer_email, bike_type, repair_category, description, area, city, urgency, admin_status')
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

    if (parsed.data.decision === APPROVED_ADMIN_STATUS) {
      await publishApprovedBikeRequest({
        admin,
        supabaseUrl,
        serviceRoleKey,
        requestRow,
      })
    } else {
      const { error: updateError } = await admin
        .from('bike_repair_requests')
        .update({
          admin_status: 'rejected',
          approved_at: null,
          rejected_reason: reason,
        })
        .eq('id', requestRow.id)
      if (updateError) throw updateError

      const customerUrl = `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(requestRow.view_token)}`
      const customerEmail = fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          to: requestRow.customer_email,
          subject: 'Uppdatering om ditt cykelärende',
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111"><h2>Hej ${escapeHtml(requestRow.customer_name)}!</h2><p>Vi kunde tyvärr inte publicera ditt cykelärende.</p><p><strong>Anledning:</strong> ${escapeHtml(reason)}</p><p>Du är välkommen att svara på detta mejl eller kontakta info@cykelhjalpen.se så hjälper vi dig.</p><p><a href="${customerUrl}">Visa ärendet</a></p></div>`,
        }),
      }).then(async (response) => {
        if (!response.ok) console.error('Customer review email failed', response.status, await response.text().catch(() => ''))
      }).catch((error) => console.error('Customer review email failed', error))

      const edgeRuntime = (globalThis as any).EdgeRuntime
      if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(customerEmail)
      else await customerEmail
    }

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
