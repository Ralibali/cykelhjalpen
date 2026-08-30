// v2-submit-review (S3) — kunden lämnar recension via sin token-länk.
// Contract: docs/v2/CONTRACTS.md §3.3 + abuse caps §2.3.
//
// - Endast när outcome-livscykeln är 'eligible' (verkstad rapporterat /
//   kund bekräftat / completed) — aldrig på enbart vald vinnare (dim12).
// - 'verified' först när outcome har completion evidence (state 'completed');
//   annars 'submitted' och befordras av completion-pathen.
// - Abuse caps: 409 duplicate_review (en recension per outcome; en per
//   verkstad+kundmejl per 180 dagar), 429 rate_limited (dagligt tak).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import {
  DAY_MS,
  V2_REVIEW_DAILY_LIMIT,
  V2_REVIEW_EMAIL_WINDOW_DAYS,
  reviewEligible,
  reviewStateOnSubmit,
} from '../_shared/v2/outcome-lifecycle.ts'

const BodySchema = z.object({
  token: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
})

const sha256Hex = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
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

    if (!(await v2FlagEnabled(admin, 'v2.reviews.verified_reviews'))) {
      return json({ error: 'Funktionen är inte aktiverad ännu.' }, 403)
    }

    const { data: request, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id, city, customer_email')
      .eq('view_token', input.token)
      .maybeSingle()
    if (requestError) throw requestError
    if (!request) return json({ error: 'Ärendet hittades inte.' }, 404)
    if (!request.customer_email) return json({ error: 'Ärendet saknar e-post.' }, 409)

    const { data: outcome } = await admin
      .from('v2_job_outcomes')
      .select('id, state, workshop_id')
      .eq('request_id', request.id)
      .maybeSingle()
    if (!outcome || !reviewEligible(outcome.state as never)) {
      return json({ error: 'Recension kan lämnas först när uppdraget är genomfört.' }, 409)
    }

    const tokenHash = await sha256Hex(input.token)
    const emailHash = await sha256Hex(request.customer_email.trim().toLowerCase())

    // Cap #3 + rate limit: rullande fönster via v2_reviews_email_window-indexet.
    const windowStart = new Date(Date.now() - V2_REVIEW_EMAIL_WINDOW_DAYS * DAY_MS).toISOString()
    const { count: windowCount } = await admin
      .from('v2_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('workshop_id', outcome.workshop_id)
      .eq('customer_email_hash', emailHash)
      .not('state', 'in', '(rejected,removed)')
      .gte('created_at', windowStart)
    if ((windowCount ?? 0) > 0) {
      return json({ code: 'duplicate_review', error: 'Du har redan lämnat en recension för den här verkstaden.' }, 409)
    }

    const dayStart = new Date(Date.now() - DAY_MS).toISOString()
    const { count: dayCount } = await admin
      .from('v2_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('customer_email_hash', emailHash)
      .gte('created_at', dayStart)
    if ((dayCount ?? 0) >= V2_REVIEW_DAILY_LIMIT) {
      return json({ code: 'rate_limited', error: 'För många recensioner på kort tid. Försök igen i morgon.' }, 429)
    }

    const decision = reviewStateOnSubmit(outcome.state as never)
    // Auto-pass moderation (§2.3): verified publiceras direkt.
    const insertState = decision.published ? 'published' : decision.state

    // Cap #1: en recension per outcome (unik index backar upp).
    const { data: review, error: insertError } = await admin
      .from('v2_reviews')
      .insert({
        outcome_id: outcome.id,
        request_id: request.id,
        workshop_id: outcome.workshop_id,
        rating: input.rating,
        body: input.body?.trim() ? input.body.trim() : null,
        state: insertState,
        author_token_hash: tokenHash,
        customer_email_hash: emailHash,
      })
      .select('id, state')
      .single()
    if (insertError) {
      if (insertError.code === '23505') {
        return json({ code: 'duplicate_review', error: 'Du har redan lämnat en recension för det här ärendet.' }, 409)
      }
      throw insertError
    }

    const citySlug = citySlugFromName(request.city)
    const daysSinceCompletion = null // outcome saknar completed_at; created_at används i stället
    await emitDomainEvent(admin, {
      eventName: 'review.submitted',
      actorType: 'customer',
      citySlug,
      requestId: request.id,
      workshopId: outcome.workshop_id,
      payload: { rating: input.rating, review_id: review.id },
    })
    if (review.state === 'published') {
      await emitDomainEvent(admin, {
        eventName: 'review.verified',
        actorType: 'system',
        citySlug,
        requestId: request.id,
        workshopId: outcome.workshop_id,
        payload: { review_id: review.id, days_since_completion: daysSinceCompletion },
      })
      await emitDomainEvent(admin, {
        eventName: 'review.published',
        actorType: 'system',
        citySlug,
        requestId: request.id,
        workshopId: outcome.workshop_id,
        payload: { rating: input.rating, review_id: review.id },
      })
    }

    return json({
      review_id: review.id,
      state: review.state,
      published: review.state === 'published',
    })
  } catch (error) {
    console.error('v2-submit-review', error)
    return json({ error: 'Kunde inte ta emot recensionen just nu.' }, 500)
  }
})
