import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const BodySchema = z.object({
  workshop_id: z.string().uuid(),
  approved: z.boolean(),
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
    if (!parsed.success) throw new Error('Ogiltigt verkstadsbeslut')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData.user) throw new Error('Du behöver logga in igen')

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: isAdmin, error: roleError } = await admin.rpc('is_admin', { _user_id: userData.user.id })
    if (roleError) throw roleError
    if (!isAdmin) throw new Error('Du saknar administratörsbehörighet')

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, user_id, company_name, email, city, approved')
      .eq('id', parsed.data.workshop_id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop) throw new Error('Verkstaden hittades inte')

    if (workshop.approved === parsed.data.approved) {
      return new Response(JSON.stringify({ success: true, unchanged: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    const { error: updateError } = await admin
      .from('workshops')
      .update({ approved: parsed.data.approved })
      .eq('id', workshop.id)
    if (updateError) throw updateError

    const { error: auditError } = await admin.from('audit_log').insert({
      admin_id: userData.user.id,
      action: parsed.data.approved ? 'workshop_approved' : 'workshop_deactivated',
      target_type: 'workshop',
      target_id: workshop.id,
      details: { company_name: workshop.company_name, city: workshop.city },
    })
    if (auditError) console.error('Could not write workshop audit log', auditError)

    const { error: notificationError } = await admin.from('notifications').insert({
      user_id: workshop.user_id,
      title: parsed.data.approved ? 'Din verkstad är godkänd' : 'Din verkstad är pausad',
      message: parsed.data.approved
        ? `Ni kan nu svara på cykelärenden i ${workshop.city}.`
        : 'Kontakta Cykelhjälpen om du vill återaktivera kontot.',
      type: 'workshop_review',
      link: '/dashboard/verkstad',
    })
    if (notificationError) console.error('Could not create workshop review notification', notificationError)

    const emailTask = fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        to: workshop.email,
        subject: parsed.data.approved ? 'Din verkstad är godkänd på Cykelhjälpen' : 'Din verkstad är tillfälligt pausad',
        html: parsed.data.approved
          ? `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111"><h2>Välkommen ${escapeHtml(workshop.company_name)}!</h2><p>Er verkstad är nu godkänd och kan svara på cykelärenden i <strong>${escapeHtml(workshop.city)}</strong>.</p><p><a href="https://cykelhjalpen.se/dashboard/verkstad" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Öppna verkstadsvyn</a></p></div>`
          : `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111"><h2>Hej ${escapeHtml(workshop.company_name)}</h2><p>Er åtkomst till nya cykelärenden har tillfälligt pausats.</p><p>Kontakta info@cykelhjalpen.se om du har frågor eller vill återaktivera kontot.</p></div>`,
      }),
    }).then(async (response) => {
      if (!response.ok) console.error('Workshop review email failed', response.status, await response.text().catch(() => ''))
    }).catch((error) => console.error('Workshop review email failed', error))

    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(emailTask)
    else await emailTask

    return new Response(JSON.stringify({ success: true, approved: parsed.data.approved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('review-workshop', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
