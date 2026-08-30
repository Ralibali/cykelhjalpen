// v2-reselect-winner (token) — contract §3.2.
//
// Kunden väljer en NY vinnare efter att den första stallat (ärendet måste ha
// status awaiting_reselection). Gamla vinnaren → lost (stalled_at bevaras för
// analys), reselection_count räknas upp, och den nya vinnaren regleras via
// SAMMA väg som select-bike-winner: gratis-lead om saldo finns, annars väntar
// betalning (50 kr exkl. moms) innan kontaktuppgifterna låses upp.
//
// Kunder är kontolösa: behörighet = ärendets hemliga view_token.
// Flagga: v2.liquidity.reselection (403 feature_disabled när av).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { buildCustomerResponseUrl } from '../_shared/customer-response.ts'
import {
  buildCustomerPickEmailHtml,
  buildCustomerPickSubject,
  notifyWinnerWorkshop,
} from '../_shared/winner.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import { sendLifecycleEmail, type LifecycleMailCtx } from '../_shared/v2/lifecycle-mail.ts'

const BodySchema = z.object({
  token: z.string().uuid(),
  response_id: z.string().uuid(),
})

const friendlyError = (message: string) => {
  if (message.includes('request_not_awaiting_reselection')) return 'Det här ärendet väntar inte på omval.'
  if (message.includes('response_previously_stalled')) return 'Det prisförslaget kan inte väljas igen.'
  if (message.includes('response_not_selectable')) return 'Det här prisförslaget kan inte väljas.'
  if (message.includes('response_not_found')) return 'Prisförslaget hittades inte.'
  if (message.includes('request_not_found')) return 'Ärendet hittades inte.'
  return message
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.', code: 'method_not_allowed' }, 405)

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: 'Ogiltig förfrågan.', code: 'bad_request' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.', code: 'config_missing' }, 500)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const ctx: LifecycleMailCtx = { supabaseUrl, serviceRoleKey }

    const flagOn = await v2FlagEnabled(admin, 'v2.liquidity.reselection')
    if (!flagOn) return json({ error: 'Funktionen är inte aktiverad ännu.', code: 'feature_disabled' }, 403)

    const { data: request, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id, status, customer_name, customer_email, city, repair_category, view_token, reselection_count')
      .eq('view_token', parsed.data.token)
      .maybeSingle()
    if (requestError) throw requestError
    if (!request) return json({ error: 'Ärendet hittades inte.', code: 'request_not_found' }, 404)
    if (request.status !== 'awaiting_reselection') {
      return json({ error: 'Det här ärendet väntar inte på omval.', code: 'request_not_awaiting_reselection' }, 409)
    }

    // Atomisk omvalsreglering i databasen (gamla vinnaren → lost, nya → won,
    // ärendet → completed, reselection_count +1).
    const { data: reselectRows, error: reselectError } = await admin.rpc('v2_reselect_bike_winner', {
      p_request_id: request.id,
      p_response_id: parsed.data.response_id,
    })
    if (reselectError) {
      return json({ error: friendlyError(reselectError.message), code: 'reselect_failed' }, 400)
    }
    const reselected = Array.isArray(reselectRows) ? reselectRows[0] : reselectRows
    if (!reselected?.winner_workshop_id) {
      return json({ error: 'Prisförslaget hittades inte.', code: 'response_not_found' }, 404)
    }

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, company_name, email, free_leads_remaining')
      .eq('id', reselected.winner_workshop_id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop) return json({ error: 'Verkstaden hittades inte.', code: 'workshop_not_found' }, 404)

    // Samma regleringsväg som select-bike-winner: gratis-lead först.
    let settled = false
    const { data: responseRow } = await admin
      .from('workshop_responses')
      .select('paid')
      .eq('id', parsed.data.response_id)
      .maybeSingle()
    settled = Boolean(responseRow?.paid)
    if (!settled && (workshop.free_leads_remaining || 0) > 0) {
      const { error: settleError } = await admin.rpc('settle_winner_free_lead', {
        p_response_id: parsed.data.response_id,
        p_workshop_id: workshop.id,
      })
      if (!settleError) {
        settled = true
      } else if (!settleError.message.includes('no_free_leads') && !settleError.message.includes('response_already_paid')) {
        console.error('settle_winner_free_lead failed', settleError.message)
      }
    }

    const customerName = (request.customer_name as string) || 'Kunden'
    const workshopName = (workshop.company_name as string) || 'Verkstaden'
    const reselectionCount = (request.reselection_count as number) + 1
    const citySlug = citySlugFromName(request.city as string)

    // Notiser: ny vinnare (egen nyckel per response) + kund (ny nyckel per
    // omval — customer_pick_email:{request_id} användes vid första valet).
    const notifyTask = (async () => {
      await notifyWinnerWorkshop(admin, ctx, {
        responseId: parsed.data.response_id,
        workshopEmail: workshop.email as string | null,
        workshopName,
        customerName,
        settled,
      })

      const requestUrl = buildCustomerResponseUrl(request.view_token as string)
      await sendLifecycleEmail(admin, ctx, {
        idempotencyKey: `customer_reselect_email:${request.id}:${reselectionCount}`,
        to: request.customer_email as string | null,
        subject: buildCustomerPickSubject(workshopName),
        html: buildCustomerPickEmailHtml(customerName, workshopName, requestUrl, settled),
        payload: { reason: 'customer_reselected_winner', request_id: request.id, reselection_count: reselectionCount },
      })

      await emitDomainEvent(admin, {
        eventName: 'quote.won',
        actorType: 'customer',
        citySlug,
        requestId: request.id,
        workshopId: workshop.id,
        responseId: parsed.data.response_id,
        payload: { city_slug: citySlug, reselection: true },
      })
      await emitDomainEvent(admin, {
        eventName: 'winner.reselected',
        actorType: 'customer',
        citySlug,
        requestId: request.id,
        workshopId: workshop.id,
        responseId: parsed.data.response_id,
        payload: { stalled_hours: null, reselection_count: reselectionCount },
      })
      if (settled) {
        await emitDomainEvent(admin, {
          eventName: 'quote.settled',
          citySlug,
          requestId: request.id,
          workshopId: workshop.id,
          responseId: parsed.data.response_id,
          payload: { method: 'free_lead', amount_ore: 0 },
        })
      }
    })().catch((notifyError) => console.error('v2-reselect-winner notifications failed', notifyError))

    const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(notifyTask)
    else await notifyTask

    return json({
      request_id: request.id,
      new_winner_response_id: parsed.data.response_id,
      settlement: settled ? 'free_lead' : 'payment_required',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('v2-reselect-winner', message)
    return json({ error: friendlyError(message), code: 'internal' }, 500)
  }
})
