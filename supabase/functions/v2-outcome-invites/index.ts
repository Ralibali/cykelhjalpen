// v2-outcome-invites (S3, cron dagligen) — "Hur gick det?" +3d/+10d efter
// reglerad vinst, auto-completion efter 7 dagars disputefönster och
// 90-dagars expiry. Contract: docs/v2/CONTRACTS.md §3.3.
//
// Körs utan JWT (samma mönster som bike-choice-reminders). Allt externt
// mejl är idempotent via notification_events (I4). Notera: saknad
// settled-tidsstämpel på workshop_responses gör att outcome.created_at
// (när raden först observerats som reglerad) används som kadensankare.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { logNotificationEvent } from '../_shared/notifications.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import {
  autoCompletedOutcome,
  dueInviteStep,
  expiredOutcome,
  reviewStateOnCompletion,
  type V2ReviewState,
} from '../_shared/v2/outcome-lifecycle.ts'

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const alreadyLogged = async (admin: SupabaseClient, key: string) => {
  const { data } = await admin
    .from('notification_events')
    .select('id')
    .eq('idempotency_key', key)
    .maybeSingle()
  return Boolean(data)
}

const sendOutcomeInviteEmail = async (
  admin: SupabaseClient,
  args: { to: string; subject: string; html: string; idempotencyKey: string },
) => {
  if (await alreadyLogged(admin, args.idempotencyKey)) return true
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  let status: 'sent' | 'failed' = 'sent'
  let errText: string | null = null
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ to: args.to, subject: args.subject, html: args.html }),
    })
    if (!res.ok) {
      status = 'failed'
      errText = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`
    }
  } catch (error) {
    status = 'failed'
    errText = error instanceof Error ? error.message : 'email_failed'
  }
  await logNotificationEvent(admin, {
    channel: 'email',
    provider: 'resend',
    recipient: args.to,
    idempotencyKey: args.idempotencyKey,
    status,
    payload: { subject: args.subject },
    error: errText,
  })
  return status === 'sent'
}

const buildInviteHtml = (customerName: string, workshopName: string, link: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">` +
  `<h2>Hur gick det med cykeln, ${escapeHtml(customerName)}?</h2>` +
  `<p>Du valde <strong>${escapeHtml(workshopName)}</strong> för ditt cykelärende. Hjälp oss gärna genom att berätta hur det gick – det tar under en minut.</p>` +
  `<p><a href="${link}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Berätta hur det gick</a></p>` +
  `<p style="color:#6b7280;font-size:13px">Du får det här mejlet för att du lagt upp ett ärende på Cykelhjälpen.</p>` +
  `</div>`

interface OutcomeRow {
  id: string
  request_id: string
  response_id: string
  workshop_id: string
  state: string
  workshop_reported_at: string | null
  invite_count: number
  created_at: string
}

Deno.serve(async (req) => {
  const headers = { ...corsFor(req), 'Content-Type': 'application/json' }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

  if (req.method === 'OPTIONS') return new Response(null, { headers })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.' }, 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  if (!(await v2FlagEnabled(admin, 'v2.reviews.outcome_lifecycle'))) {
    return json({ invited: 0, expired: 0, created: 0, completed: 0, flag_off: true })
  }

  const result = { invited: 0, expired: 0, created: 0, completed: 0 }
  const now = new Date()

  try {
    // 1. Reglerade vinster utan outcome-rad → skapa 'pending'.
    const { data: winners, error: winnersError } = await admin
      .from('workshop_responses')
      .select('id, request_id, workshop_id')
      .eq('status', 'won')
      .eq('paid', true)
      .limit(500)
    if (winnersError) throw winnersError

    const responseIds = (winners ?? []).map((w) => w.id)
    const existing = new Set<string>()
    if (responseIds.length > 0) {
      const { data: existingRows } = await admin
        .from('v2_job_outcomes')
        .select('response_id')
        .in('response_id', responseIds)
      for (const row of existingRows ?? []) existing.add(row.response_id as string)
    }
    for (const winner of winners ?? []) {
      if (existing.has(winner.id as string)) continue
      const { error } = await admin
        .from('v2_job_outcomes')
        .upsert(
          { request_id: winner.request_id, response_id: winner.id, workshop_id: winner.workshop_id },
          { onConflict: 'response_id', ignoreDuplicates: true },
        )
      if (!error) result.created += 1
    }

    // 2–4. Bearbeta öppna outcomes.
    const { data: outcomes, error: outcomesError } = await admin
      .from('v2_job_outcomes')
      .select('id, request_id, response_id, workshop_id, state, workshop_reported_at, invite_count, created_at')
      .in('state', ['pending', 'reported_by_workshop'])
      .order('created_at', { ascending: true })
      .limit(500)
    if (outcomesError) throw outcomesError

    for (const outcome of (outcomes ?? []) as OutcomeRow[]) {
      // 2. Auto-completion efter disputefönstret (7 dagar utan kunddisput).
      if (autoCompletedOutcome(outcome.state as never, outcome.workshop_reported_at, now)) {
        const { error } = await admin
          .from('v2_job_outcomes')
          .update({
            state: 'completed',
            completion_evidence: { source: 'workshop_report', auto: true },
            updated_at: now.toISOString(),
          })
          .eq('id', outcome.id)
          .eq('state', 'reported_by_workshop')
        if (!error) {
          result.completed += 1
          // Completion path: befordra 'submitted' recensioner.
          const { data: submitted } = await admin
            .from('v2_reviews')
            .select('id, state')
            .eq('outcome_id', outcome.id)
            .eq('state', 'submitted')
          for (const review of submitted ?? []) {
            const next = reviewStateOnCompletion(review.state as V2ReviewState)
            if (next === review.state) continue
            await admin
              .from('v2_reviews')
              .update({ state: next, updated_at: now.toISOString() })
              .eq('id', review.id)
              .eq('state', review.state)
          }
          continue
        }
      }

      // 3. Expiry efter 90 dagar utan signal.
      if (expiredOutcome(outcome.state as never, outcome.created_at, now)) {
        const { error } = await admin
          .from('v2_job_outcomes')
          .update({ state: 'expired', updated_at: now.toISOString() })
          .eq('id', outcome.id)
          .eq('state', 'pending')
        if (!error) result.expired += 1
        continue
      }

      // 4. "Hur gick det?"-inbjudan vid +3d/+10d.
      const step = dueInviteStep(outcome.state as never, outcome.created_at, outcome.invite_count, now)
      if (step === null) continue

      const { data: request } = await admin
        .from('bike_repair_requests')
        .select('id, view_token, customer_name, customer_email, city')
        .eq('id', outcome.request_id)
        .maybeSingle()
      const { data: workshop } = await admin
        .from('workshops')
        .select('id, company_name')
        .eq('id', outcome.workshop_id)
        .maybeSingle()
      if (!request?.customer_email || !request.view_token) {
        // Utan mejl kan ingen inbjudan skickas — räkna steget ändå så att
        // vi inte fastnar i en loop.
        await admin
          .from('v2_job_outcomes')
          .update({ invite_count: outcome.invite_count + 1, updated_at: now.toISOString() })
          .eq('id', outcome.id)
        continue
      }

      const link = `https://cykelhjalpen.se/mitt-arende/${request.view_token}`
      const workshopName = workshop?.company_name ?? 'verkstaden'
      const stepLabel = step === 0 ? 'forsta' : 'paminnelse'
      const sent = await sendOutcomeInviteEmail(admin, {
        to: request.customer_email,
        subject: 'Hur gick det med cykeln?',
        html: buildInviteHtml(request.customer_name ?? '', workshopName, link),
        idempotencyKey: `v2-outcome-invite:${outcome.id}:${stepLabel}`,
      })
      if (sent) {
        await admin
          .from('v2_job_outcomes')
          .update({
            invite_count: outcome.invite_count + 1,
            customer_invited_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', outcome.id)
        result.invited += 1
        await emitDomainEvent(admin, {
          eventName: 'review.invited',
          actorType: 'system',
          citySlug: citySlugFromName(request.city),
          requestId: outcome.request_id,
          workshopId: outcome.workshop_id,
          responseId: outcome.response_id,
          payload: { invite_step: step + 1 },
        })
      }
    }

    return json(result)
  } catch (error) {
    console.error('v2-outcome-invites', error)
    return json({ error: 'Kunde inte skicka utfallsinbjudningar just nu.' }, 500)
  }
})
