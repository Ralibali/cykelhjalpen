import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const BodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_password'),
    user_id: z.string().uuid().optional(),
    workshop_id: z.string().uuid().optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(72),
  }),
  z.object({
    action: z.literal('delete_response'),
    response_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('create_response'),
    request_id: z.string().uuid(),
    workshop_id: z.string().uuid(),
    message: z.string().trim().min(5).max(2000),
    estimated_price_min: z.number().int().min(0).max(100000).nullable().optional(),
    estimated_price_max: z.number().int().min(0).max(100000).nullable().optional(),
    estimated_time: z.string().trim().max(120).nullable().optional(),
    can_pickup: z.boolean().optional(),
  }),
])

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.' }, 500, corsHeaders)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Du behöver logga in.' }, 401, corsHeaders)

    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
    if (userError || !userData.user) return json({ error: 'Du behöver logga in igen.' }, 401, corsHeaders)

    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') return json({ error: 'Du saknar adminbehörighet.' }, 403, corsHeaders)

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Ogiltig begäran.' }, 400, corsHeaders)
    const payload = parsed.data

    if (payload.action === 'set_password') {
      let targetUserId = payload.user_id ?? null

      if (!targetUserId && payload.workshop_id) {
        const { data: workshop } = await admin
          .from('workshops').select('user_id').eq('id', payload.workshop_id).maybeSingle()
        targetUserId = workshop?.user_id ?? null
      }

      if (!targetUserId && payload.email) {
        const { data: profileRow } = await admin
          .from('profiles').select('id').ilike('email', payload.email).maybeSingle()
        targetUserId = profileRow?.id ?? null
      }

      if (!targetUserId) return json({ error: 'Hittade ingen användare att uppdatera.' }, 404, corsHeaders)

      const { error } = await admin.auth.admin.updateUserById(targetUserId, { password: payload.password })
      if (error) return json({ error: error.message }, 400, corsHeaders)

      await admin.from('audit_log').insert({
        admin_id: userData.user.id,
        action: 'password_reset_by_admin',
        target_type: 'user',
        target_id: targetUserId,
        details: { workshop_id: payload.workshop_id ?? null },
      })

      return json({ success: true, user_id: targetUserId }, 200, corsHeaders)
    }

    if (payload.action === 'delete_response') {
      const { data: response } = await admin
        .from('workshop_responses')
        .select('id, request_id, workshop_id, status, paid')
        .eq('id', payload.response_id)
        .maybeSingle()
      if (!response) return json({ error: 'Offerten hittades inte.' }, 404, corsHeaders)

      await admin.from('lead_charges').delete().eq('response_id', payload.response_id)
      const { error } = await admin.from('workshop_responses').delete().eq('id', payload.response_id)
      if (error) return json({ error: error.message }, 400, corsHeaders)

      await admin.from('audit_log').insert({
        admin_id: userData.user.id,
        action: 'bike_response_deleted',
        target_type: 'workshop_response',
        target_id: payload.response_id,
        details: { request_id: response.request_id, workshop_id: response.workshop_id, was_paid: response.paid },
      })

      return json({ success: true }, 200, corsHeaders)
    }

    // create_response – manuell offert som admin lägger in åt en verkstad
    const { data: request } = await admin
      .from('bike_repair_requests').select('id, status').eq('id', payload.request_id).maybeSingle()
    if (!request) return json({ error: 'Ärendet hittades inte.' }, 404, corsHeaders)

    const { data: workshop } = await admin
      .from('workshops').select('id, company_name').eq('id', payload.workshop_id).maybeSingle()
    if (!workshop) return json({ error: 'Verkstaden hittades inte.' }, 404, corsHeaders)

    const { data: created, error: insertError } = await admin
      .from('workshop_responses')
      .insert({
        request_id: payload.request_id,
        workshop_id: payload.workshop_id,
        message: payload.message,
        estimated_price_min: payload.estimated_price_min ?? null,
        estimated_price_max: payload.estimated_price_max ?? null,
        estimated_time: payload.estimated_time || null,
        can_pickup: payload.can_pickup ?? false,
        status: 'sent',
        paid: false,
        used_free_lead: false,
      })
      .select('id')
      .single()

    if (insertError) {
      const message = insertError.message?.includes('bike_request_full')
        ? 'Ärendet har redan tre skickade offerter.'
        : insertError.message
      return json({ error: message }, 400, corsHeaders)
    }

    await admin.from('audit_log').insert({
      admin_id: userData.user.id,
      action: 'bike_response_created_by_admin',
      target_type: 'workshop_response',
      target_id: created.id,
      details: { request_id: payload.request_id, workshop_id: payload.workshop_id },
    })

    return json({ success: true, response_id: created.id }, 200, corsHeaders)
  } catch (error) {
    console.error('admin-tools error', error)
    return json({ error: error instanceof Error ? error.message : 'Något gick fel.' }, 500, corsHeaders)
  }
})
