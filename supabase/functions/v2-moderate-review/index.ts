// v2-moderate-review (S3, admin) — publicera/flagga/avvisa/ta bort.
// Contract: docs/v2/CONTRACTS.md §3.3. 'publish' kräver att kopplat outcome
// är 'completed' (I5: aldrig publicera utan completion evidence). Aggregerade
// stats uppdateras automatiskt av triggern v2_reviews_stats_refresh.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import {
  V2_MODERATION_ACTIONS,
  applyModeration,
  type V2ModerationAction,
  type V2ReviewState,
} from '../_shared/v2/outcome-lifecycle.ts'

const BodySchema = z.object({
  review_id: z.string().uuid(),
  action: z.enum(V2_MODERATION_ACTIONS),
  note: z.string().max(2000).optional(),
})

Deno.serve(async (req) => {
  const headers = { ...corsFor(req), 'Content-Type': 'application/json' }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Ingen auktorisation' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.' }, 500)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return json({ error: 'Ogiltig token' }, 401)

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()
    if (profile?.role !== 'admin') {
      return json({ error: 'Endast admin kan moderera recensioner.' }, 403)
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: 'Ogiltig data.' }, 400)
    const input = parsed.data

    const { data: review } = await admin
      .from('v2_reviews')
      .select('id, state, v2_job_outcomes(state)')
      .eq('id', input.review_id)
      .maybeSingle()
    if (!review) return json({ error: 'Recensionen hittades inte.' }, 404)

    const outcomeState = (review as { v2_job_outcomes?: { state: string } | null }).v2_job_outcomes?.state
    const transition = applyModeration(
      review.state as V2ReviewState,
      input.action as V2ModerationAction,
      outcomeState === 'completed',
    )
    if (!transition.changed) {
      return json({ error: 'Åtgärden är inte tillåten i recensionens nuvarande läge.' }, 409)
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await admin
      .from('v2_reviews')
      .update({
        state: transition.state,
        moderated_by: userData.user.id,
        moderated_at: now,
        moderation_note: input.note ?? null,
        updated_at: now,
      })
      .eq('id', review.id)
      .select('id, state')
      .single()
    if (updateError) throw updateError

    return json({ review_id: updated.id, state: updated.state })
  } catch (error) {
    console.error('v2-moderate-review', error)
    return json({ error: 'Kunde inte moderera recensionen just nu.' }, 500)
  }
})
