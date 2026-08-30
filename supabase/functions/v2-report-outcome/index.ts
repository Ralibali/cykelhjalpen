// v2-report-outcome (S3) — verkstaden rapporterar utfallet av ett vunnet,
// reglerat uppdrag. Contract: docs/v2/CONTRACTS.md §3.3.
//
// 'completed' från verkstaden räcker inte som completion evidence – statet
// blir 'reported_by_workshop' tills kunden bekräftar eller 7 dagar passerat
// utan dispute (v2-outcome-invites). Kundens bekräftelse sker via
// v2-confirm-outcome (token).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import {
  V2_WORKSHOP_REPORTS,
  applyWorkshopReport,
  type V2WorkshopReport,
} from '../_shared/v2/outcome-lifecycle.ts'

const BodySchema = z.object({
  response_id: z.string().uuid(),
  outcome: z.enum(V2_WORKSHOP_REPORTS),
  final_price_sek: z.number().int().min(0).max(1_000_000).optional(),
  note: z.string().max(2000).optional(),
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

    if (!(await v2FlagEnabled(admin, 'v2.reviews.outcome_lifecycle'))) {
      return json({ error: 'Funktionen är inte aktiverad ännu.' }, 403)
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: 'Ogiltig data.' }, 400)
    const input = parsed.data

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, approved')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop?.approved) return json({ error: 'Verkstaden är inte godkänd ännu.' }, 403)

    const { data: response, error: responseError } = await admin
      .from('workshop_responses')
      .select('id, request_id, workshop_id, status, paid')
      .eq('id', input.response_id)
      .maybeSingle()
    if (responseError) throw responseError
    if (!response || response.workshop_id !== workshop.id) {
      return json({ error: 'Offerten hittades inte.' }, 404)
    }
    // Utfall kan bara rapporteras för en vinst som är reglerad (betald eller
    // gratis-lead) – annars har kundkontakten aldrig upprättats.
    if (response.status !== 'won' || response.paid !== true) {
      return json({ error: 'Utfall kan bara rapporteras för ett reglerat vunnet uppdrag.' }, 409)
    }

    const { data: request } = await admin
      .from('bike_repair_requests')
      .select('id, city')
      .eq('id', response.request_id)
      .maybeSingle()

    // Lazy-create the pending outcome (one per request/response) — the row is
    // normally skapad av v2-outcome-invites när vinsten reglerats.
    const { data: outcome } = await admin
      .from('v2_job_outcomes')
      .upsert(
        {
          request_id: response.request_id,
          response_id: response.id,
          workshop_id: workshop.id,
        },
        { onConflict: 'response_id', ignoreDuplicates: true },
      )
      .select('id, state, completion_evidence')
      .maybeSingle()

    const { data: current } = outcome
      ? { data: outcome }
      : await admin
          .from('v2_job_outcomes')
          .select('id, state, completion_evidence')
          .eq('response_id', response.id)
          .maybeSingle()
    if (!current) throw new Error('outcome_missing')

    const now = new Date().toISOString()
    const transition = applyWorkshopReport(current.state as never, input.outcome as V2WorkshopReport)

    const update: Record<string, unknown> = {
      state: transition.state,
      updated_at: now,
    }
    if (input.outcome === 'completed' && transition.changed) {
      update.workshop_reported_at = now
    }
    if (typeof input.final_price_sek === 'number') update.final_price_sek = input.final_price_sek
    if (input.note) {
      update.completion_evidence = {
        ...(typeof current.completion_evidence === 'object' && current.completion_evidence !== null
          ? current.completion_evidence
          : {}),
        workshop_note: input.note,
      }
    }

    const { data: updated, error: updateError } = await admin
      .from('v2_job_outcomes')
      .update(update)
      .eq('id', current.id)
      .select('id, state')
      .single()
    if (updateError) throw updateError

    if (transition.changed) {
      await emitDomainEvent(admin, {
        eventName: 'outcome.reported',
        actorType: 'workshop',
        actorId: workshop.id,
        citySlug: request ? citySlugFromName(request.city) : null,
        requestId: response.request_id,
        workshopId: workshop.id,
        responseId: response.id,
        payload: {
          state: updated.state,
          ...(typeof input.final_price_sek === 'number' ? { final_price_sek: input.final_price_sek } : {}),
        },
      })
    }

    return json({ outcome_id: updated.id, state: updated.state })
  } catch (error) {
    console.error('v2-report-outcome', error)
    return json({ error: 'Kunde inte rapportera utfallet just nu.' }, 500)
  }
})
