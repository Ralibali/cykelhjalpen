// V2 admin entitlement override (contract §3.8). Admins grant/revoke plan
// entitlements manually — without Stripe. Every change is audit-logged in
// v2_entitlement_overrides (granted_by + reason + created_at; revokes keep
// the row with value=false instead of deleting, so the trail survives).
//
// Overrides take effect through the entitlement resolver only when the
// v2.subscriptions.enabled flag is on; with the flag OFF they are inert rows.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { isV2EntitlementKey } from '../_shared/v2/config-schema.ts'

const BodySchema = z.object({
  workshop_id: z.string().uuid(),
  entitlement_key: z.string().trim().min(1).max(80),
  // omitted → grant true; false/null → revoke (audit row kept)
  value: z.unknown().optional(),
  expires_at: z.string().datetime({ offset: true }).nullish(),
  reason: z.string().trim().min(3).max(500),
})

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.', code: 'method_not_allowed' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.', code: 'config_missing' }, 500, corsHeaders)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Du behöver logga in.', code: 'unauthorized' }, 401, corsHeaders)

    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
    if (userError || !userData.user) return json({ error: 'Du behöver logga in igen.', code: 'unauthorized' }, 401, corsHeaders)

    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') return json({ error: 'Du saknar adminbehörighet.', code: 'forbidden' }, 403, corsHeaders)

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Ogiltig begäran.', code: 'invalid_request' }, 400, corsHeaders)
    const payload = parsed.data

    if (!isV2EntitlementKey(payload.entitlement_key)) {
      return json({ error: 'Okänd entitlement-nyckel.', code: 'invalid_entitlement_key' }, 400, corsHeaders)
    }

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id')
      .eq('id', payload.workshop_id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop) return json({ error: 'Verkstaden hittades inte.', code: 'workshop_not_found' }, 404, corsHeaders)

    const grantValue = payload.value === undefined ? true : payload.value

    const { data: row, error: upsertError } = await admin
      .from('v2_entitlement_overrides')
      .upsert(
        {
          workshop_id: payload.workshop_id,
          entitlement_key: payload.entitlement_key,
          value: grantValue as never,
          expires_at: payload.expires_at ?? null,
          granted_by: userData.user.id,
          reason: payload.reason,
        },
        { onConflict: 'workshop_id,entitlement_key' },
      )
      .select('id')
      .single()
    if (upsertError) throw upsertError

    return json({ override_id: (row as { id: string }).id }, 200, corsHeaders)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('v2-admin-entitlement-override', message)
    return json({ error: message, code: 'internal_error' }, 500, corsHeaders)
  }
})
