// V2 S4 — ghosted-lead claim (contract docs/v2/CONTRACTS.md §3.4).
// Workshop JWT required. A claim is allowed when the response is won, settled
// (card payment or free lead/credit) and the win is at least 7 days old.
// Crediting itself is an admin action on v2_ghosted_lead_claims (§2.2).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'

const BodySchema = z.object({
  response_id: z.string().uuid(),
  customer_unreachable_since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  evidence_note: z.string().max(1000).optional(),
})

const MIN_DAYS_SINCE_WIN = 7

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) })
  if (req.method !== 'POST') {
    return json(req, 405, { error: 'Metoden stöds inte.', code: 'method_not_allowed' })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(req, 401, { error: 'Du behöver logga in.', code: 'unauthorized' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json(req, 500, { error: 'Backend configuration is missing', code: 'config' })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData.user) {
      return json(req, 401, { error: 'Du behöver logga in igen.', code: 'unauthorized' })
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return json(req, 400, { error: 'Ogiltig begäran.', code: 'invalid_body' })

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, approved, city')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop?.approved) {
      return json(req, 403, { error: 'Verkstaden är inte godkänd ännu.', code: 'not_approved' })
    }

    const { data: response, error: responseError } = await admin
      .from('workshop_responses')
      .select('id, request_id, workshop_id, status, paid, used_free_lead, updated_at, ghosted_claim_status')
      .eq('id', parsed.data.response_id)
      .maybeSingle()
    if (responseError) throw responseError
    if (!response || response.workshop_id !== workshop.id) {
      return json(req, 404, { error: 'Offerten hittades inte.', code: 'not_found' })
    }
    if (response.status !== 'won') {
      return json(req, 409, { error: 'Kunden har inte valt er för det här ärendet.', code: 'not_won' })
    }
    // Settled = card payment OR free lead/credit (contract glossary).
    const settled = Boolean(response.paid) || Boolean(response.used_free_lead)
    if (!settled) {
      return json(req, 409, { error: 'Vinsten är inte reglerad ännu.', code: 'not_settled' })
    }

    const wonAt = new Date(response.updated_at)
    const daysSinceWin = (Date.now() - wonAt.getTime()) / 86_400_000
    if (daysSinceWin < MIN_DAYS_SINCE_WIN) {
      return json(req, 409, {
        error: `Det går att rapportera en spårlös kund tidigast ${MIN_DAYS_SINCE_WIN} dagar efter vinsten.`,
        code: 'too_early',
      })
    }
    if (response.ghosted_claim_status && response.ghosted_claim_status !== 'none') {
      return json(req, 409, { error: 'En anmälan finns redan för det här ärendet.', code: 'duplicate_claim' })
    }

    const unreachableSince = new Date(parsed.data.customer_unreachable_since)
    if (Number.isNaN(unreachableSince.getTime()) || unreachableSince.getTime() > Date.now()) {
      return json(req, 400, { error: 'Ogiltigt datum.', code: 'invalid_date' })
    }

    const { data: claim, error: claimError } = await admin
      .from('v2_ghosted_lead_claims')
      .insert({
        response_id: response.id,
        workshop_id: workshop.id,
        status: 'pending',
        customer_unreachable_since: parsed.data.customer_unreachable_since,
        evidence_note: parsed.data.evidence_note?.trim() || null,
      })
      .select('id')
      .single()
    if (claimError) {
      if (claimError.message?.includes('duplicate') || claimError.code === '23505') {
        return json(req, 409, { error: 'En anmälan finns redan för det här ärendet.', code: 'duplicate_claim' })
      }
      throw claimError
    }

    // Quick-read mirror on the response (source of truth stays the claim row).
    await admin
      .from('workshop_responses')
      .update({ ghosted_claim_status: 'claimed' })
      .eq('id', response.id)
      .eq('workshop_id', workshop.id)

    await emitDomainEvent(admin, {
      eventName: 'ghosted.claimed',
      actorType: 'workshop',
      actorId: userData.user.id,
      requestId: response.request_id,
      workshopId: workshop.id,
      responseId: response.id,
      payload: { days_since_win: Math.floor(daysSinceWin) },
    })

    return json(req, 200, { claim_id: claim.id, status: 'pending' })
  } catch (error) {
    console.error('v2-claim-ghosted-lead failed', error)
    return json(req, 500, { error: 'Något gick fel.', code: 'internal' })
  }
})
