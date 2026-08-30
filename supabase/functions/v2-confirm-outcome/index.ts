// v2-confirm-outcome (S3) — kunden bekräftar utfallet via sin token-länk.
// Contract: docs/v2/CONTRACTS.md §3.3. Kunder är kontolösa: åtkomst sker
// enbart via view_token (aldrig RLS, §6.4).
//
// Kundens 'completed' är completion evidence → outcome blir 'completed' och
// en eventuellt inskickad ('submitted') recension befordras till
// 'verified' → 'published' (moderation auto-pass, §2.3).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import {
  V2_CUSTOMER_CONFIRMATIONS,
  applyCustomerConfirm,
  reviewEligible,
  reviewStateOnCompletion,
  type V2CustomerConfirmation,
  type V2ReviewState,
} from '../_shared/v2/outcome-lifecycle.ts'

const BodySchema = z.object({
  token: z.string().uuid(),
  outcome: z.enum(V2_CUSTOMER_CONFIRMATIONS),
  final_price_sek: z.number().int().min(0).max(1_000_000).optional(),
  note: z.string().max(2000).optional(),
})

/** Befordra 'submitted' recensioner när utfallet når 'completed'. */
async function promoteReviewsOnCompletion(
  admin: ReturnType<typeof createClient>,
  outcomeId: string,
  ctx: { requestId: string; workshopId: string; citySlug: string | null },
) {
  const { data: submitted } = await admin
    .from('v2_reviews')
    .select('id, state')
    .eq('outcome_id', outcomeId)
    .eq('state', 'submitted')

  for (const review of submitted ?? []) {
    const next = reviewStateOnCompletion(review.state as V2ReviewState)
    if (next === review.state) continue
    const { error } = await admin
      .from('v2_reviews')
      .update({ state: next, updated_at: new Date().toISOString() })
      .eq('id', review.id)
      .eq('state', review.state)
    if (error) continue
    await emitDomainEvent(admin, {
      eventName: 'review.verified',
      actorType: 'system',
      citySlug: ctx.citySlug,
      requestId: ctx.requestId,
      workshopId: ctx.workshopId,
      payload: { review_id: review.id },
    })
    if (next === 'published') {
      await emitDomainEvent(admin, {
        eventName: 'review.published',
        actorType: 'system',
        citySlug: ctx.citySlug,
        requestId: ctx.requestId,
        workshopId: ctx.workshopId,
        payload: { review_id: review.id },
      })
    }
  }
}

Deno.serve(async (req) => {
  const headers = { ...corsFor(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405)

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: 'Ogiltig data.' }, 400)
    const input = parsed.data

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.' }, 500)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    if (!(await v2FlagEnabled(admin, 'v2.reviews.outcome_lifecycle'))) {
      return json({ error: 'Funktionen är inte aktiverad ännu.' }, 403)
    }

    const { data: request, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id, city')
      .eq('view_token', input.token)
      .maybeSingle()
    if (requestError) throw requestError
    if (!request) return json({ error: 'Ärendet hittades inte.' }, 404)

    // Utfall kräver en vinnare vars vinst är reglerad (kontakt upprättad).
    const { data: winner } = await admin
      .from('workshop_responses')
      .select('id, workshop_id')
      .eq('request_id', request.id)
      .eq('status', 'won')
      .eq('paid', true)
      .maybeSingle()
    if (!winner) {
      return json({ error: 'Ingen reglerad vinnare finns för ärendet ännu.' }, 409)
    }

    const { data: created } = await admin
      .from('v2_job_outcomes')
      .upsert(
        { request_id: request.id, response_id: winner.id, workshop_id: winner.workshop_id },
        { onConflict: 'response_id', ignoreDuplicates: true },
      )
      .select('id, state, completion_evidence')
      .maybeSingle()

    const { data: current } = created
      ? { data: created }
      : await admin
          .from('v2_job_outcomes')
          .select('id, state, completion_evidence')
          .eq('response_id', winner.id)
          .maybeSingle()
    if (!current) throw new Error('outcome_missing')

    const now = new Date().toISOString()
    const transition = applyCustomerConfirm(current.state as never, input.outcome as V2CustomerConfirmation)

    const update: Record<string, unknown> = { state: transition.state, updated_at: now }
    if (transition.changed) {
      if (input.outcome === 'completed') {
        update.customer_confirmed_at = now
        update.completion_evidence = {
          source: 'customer_confirm',
          ...(input.note ? { note: input.note } : {}),
        }
      } else if (input.note) {
        update.completion_evidence = {
          ...(typeof current.completion_evidence === 'object' && current.completion_evidence !== null
            ? current.completion_evidence
            : {}),
          customer_note: input.note,
        }
      }
    }
    if (typeof input.final_price_sek === 'number') update.final_price_sek = input.final_price_sek

    const { data: updated, error: updateError } = await admin
      .from('v2_job_outcomes')
      .update(update)
      .eq('id', current.id)
      .select('id, state, workshop_id')
      .single()
    if (updateError) throw updateError

    const citySlug = citySlugFromName(request.city)

    if (transition.changed) {
      await emitDomainEvent(admin, {
        eventName: 'outcome.confirmed',
        actorType: 'customer',
        citySlug,
        requestId: request.id,
        workshopId: updated.workshop_id,
        responseId: winner.id,
        payload: {
          state: updated.state,
          ...(typeof input.final_price_sek === 'number' ? { final_price_sek: input.final_price_sek } : {}),
        },
      })
    }

    if (updated.state === 'completed') {
      await promoteReviewsOnCompletion(admin, updated.id, {
        requestId: request.id,
        workshopId: updated.workshop_id,
        citySlug,
      })
    }

    return json({
      outcome_id: updated.id,
      state: updated.state,
      review_invited: reviewEligible(updated.state as never),
    })
  } catch (error) {
    console.error('v2-confirm-outcome', error)
    return json({ error: 'Kunde inte bekräfta utfallet just nu.' }, 500)
  }
})
