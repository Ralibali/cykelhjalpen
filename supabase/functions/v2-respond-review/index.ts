// v2-respond-review (S3) — verkstaden svarar på en recension om sitt uppdrag.
// Contract: docs/v2/CONTRACTS.md §3.3. Svaret modereras genom att det bara
// kan sättas på recensioner i synliga tillstånd (published/flagged) och
// försvinner från publika ytor om recensionen flaggas/rejectas (I3).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { workshopCanRespond } from '../_shared/v2/outcome-lifecycle.ts'

const BodySchema = z.object({
  review_id: z.string().uuid(),
  response: z.string().min(1).max(2000),
})

Deno.serve(async (req) => {
  const headers = { ...corsFor(req), 'Content-Type': 'application/json' }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Du behöver logga in' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.' }, 500)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData.user) return json({ error: 'Du behöver logga in igen' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    if (!(await v2FlagEnabled(admin, 'v2.reviews.verified_reviews'))) {
      return json({ error: 'Funktionen är inte aktiverad ännu.' }, 403)
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: 'Ogiltig data.' }, 400)

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, approved')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop?.approved) return json({ error: 'Verkstaden är inte godkänd ännu.' }, 403)

    const { data: review } = await admin
      .from('v2_reviews')
      .select('id, workshop_id, state')
      .eq('id', parsed.data.review_id)
      .maybeSingle()
    if (!review || review.workshop_id !== workshop.id) {
      return json({ error: 'Recensionen hittades inte.' }, 404)
    }
    if (!workshopCanRespond(review.state as never)) {
      return json({ error: 'Det går inte att svara på recensionen i nuvarande läge.' }, 409)
    }

    const respondedAt = new Date().toISOString()
    const { data: updated, error: updateError } = await admin
      .from('v2_reviews')
      .update({
        workshop_response: parsed.data.response.trim(),
        workshop_responded_at: respondedAt,
        updated_at: respondedAt,
      })
      .eq('id', review.id)
      .select('id, workshop_responded_at')
      .single()
    if (updateError) throw updateError

    return json({ review_id: updated.id, workshop_responded_at: updated.workshop_responded_at })
  } catch (error) {
    console.error('v2-respond-review', error)
    return json({ error: 'Kunde inte spara svaret just nu.' }, 500)
  }
})
