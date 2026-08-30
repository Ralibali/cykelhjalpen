// Kunden väljer vilken verkstad som vunnit ärendet. Anropas utan inloggning –
// behörigheten är ärendets hemliga view_token (samma som get-bike-request-by-token).
// Vinnaren regleras direkt med ett gratis-lead om saldo finns, annars väntar
// betalning (50 kr exkl. moms) innan kontaktuppgifterna låses upp.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { buildCustomerResponseUrl } from '../_shared/customer-response.ts'
import { notifyCustomerOfPick, notifyLoserWorkshop, notifyWinnerWorkshop } from '../_shared/winner.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import { withUtmParams } from '../_shared/v2/utm.ts'

const BodySchema = z.object({
  token: z.string().uuid(),
  response_id: z.string().uuid(),
})

const friendlyDatabaseError = (message: string) => {
  if (message.includes('winner_already_chosen')) return 'En verkstad är redan vald för det här ärendet.'
  if (message.includes('response_not_sent')) return 'Det här prisförslaget kan inte väljas längre.'
  if (message.includes('response_not_found')) return 'Prisförslaget hittades inte.'
  if (message.includes('request_not_found')) return 'Ärendet hittades inte.'
  return message
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metoden stöds inte.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) throw new Error('Ogiltig förfrågan.')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Backend configuration is missing')

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const { data: request, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id, status, admin_status, customer_name, customer_email, repair_category, view_token, city')
      .eq('view_token', parsed.data.token)
      .maybeSingle()
    if (requestError) throw requestError
    if (!request) throw new Error('Ärendet hittades inte.')
    if (request.admin_status !== 'approved') throw new Error('Ärendet är inte publicerat ännu.')
    // Utgångna ärenden kan inte längre väljas – offerten har gått ut.
    if (request.status === 'expired' || request.status === 'choice_expired') {
      throw new Error('Offertfönstret har gått ut för det här ärendet.')
    }

    // Atomisk reglering i databasen: vinnare 'won', övriga skickade 'lost',
    // ärendet 'completed'. Samtidiga val ger winner_already_chosen.
    const { data: chosenRows, error: chooseError } = await admin.rpc('choose_bike_winner', {
      p_request_id: request.id,
      p_response_id: parsed.data.response_id,
    })
    if (chooseError) throw new Error(friendlyDatabaseError(chooseError.message))
    const chosen = Array.isArray(chosenRows) ? chosenRows[0] : chosenRows
    if (!chosen?.winner_workshop_id) throw new Error('Prisförslaget hittades inte.')

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, company_name, email, free_leads_remaining')
      .eq('id', chosen.winner_workshop_id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop) throw new Error('Verkstaden hittades inte.')

    // Reglera direkt med gratis-lead om verkstaden har kvar. Misslyckas det
    // (t.ex. slut på saldo) väntar vanlig betalning i stället.
    let settled = false
    if (!chosen.already_chosen) {
      const { data: responseRow } = await admin
        .from('workshop_responses')
        .select('paid, used_free_lead')
        .eq('id', parsed.data.response_id)
        .maybeSingle()
      settled = Boolean(responseRow?.paid)
    }
    let settledByFreeLead = false
    if (!settled && (workshop.free_leads_remaining || 0) > 0) {
      const { data: settleRows, error: settleError } = await admin.rpc('settle_winner_free_lead', {
        p_response_id: parsed.data.response_id,
        p_workshop_id: workshop.id,
      })
      if (!settleError) {
        const settleRow = Array.isArray(settleRows) ? settleRows[0] : settleRows
        settled = true
        settledByFreeLead = true
        console.log('winner settled with free lead', parsed.data.response_id, 'remaining', settleRow?.remaining_free_leads)
      } else if (!settleError.message.includes('no_free_leads') && !settleError.message.includes('response_already_paid')) {
        console.error('settle_winner_free_lead failed', settleError.message)
      }
    }

    // Notiser: vinnare, förlorare och kund – alla idempotenta, ingen kritisk
    // för själva valet, så de får köras i bakgrunden.
    const notifyTask = (async () => {
      const customerName = (request.customer_name as string) || 'Kunden'
      const workshopName = (workshop.company_name as string) || 'Verkstaden'
      const ctx = { supabaseUrl, serviceRoleKey }

      await notifyWinnerWorkshop(admin, ctx, {
        responseId: parsed.data.response_id,
        workshopEmail: workshop.email as string | null,
        workshopName,
        customerName,
        settled,
      })

      const { data: losers } = await admin
        .from('workshop_responses')
        .select('id, workshops(company_name, email)')
        .eq('request_id', request.id)
        .eq('status', 'lost')
      for (const loser of losers || []) {
        const loserWorkshop = (loser as any).workshops
        await notifyLoserWorkshop(admin, ctx, {
          responseId: loser.id,
          workshopEmail: loserWorkshop?.email ?? null,
          workshopName: loserWorkshop?.company_name || 'Verkstaden',
          repairCategory: (request.repair_category as string) || 'cykelreparation',
        })
      }

      await notifyCustomerOfPick(admin, ctx, {
        requestId: request.id,
        customerEmail: request.customer_email as string | null,
        customerName,
        workshopName,
        // V2 attribution (S6): lifecycle email links carry UTM (dim02 fix).
        requestUrl: withUtmParams(
          buildCustomerResponseUrl(request.view_token as string),
          { source: 'email', campaign: 'winner_chosen' },
        ),
        settled,
      })

    })().catch((notifyError) => console.error('winner notifications failed', notifyError))

    // V2 data-moat (S6): quote.won + quote.settled(free_lead), best-effort and
    // flag-gated inside the helper. No PII in payloads (contract §4).
    const eventTask = (async () => {
      if (chosen.already_chosen) return
      const citySlug = citySlugFromName((request.city as string | null) ?? '')
      const [{ data: winnerResponse }, { count: quotesTotal }] = await Promise.all([
        admin
          .from('workshop_responses')
          .select('estimated_price_min, estimated_price_max')
          .eq('id', parsed.data.response_id)
          .maybeSingle(),
        admin
          .from('workshop_responses')
          .select('id', { count: 'exact', head: true })
          .eq('request_id', request.id)
          .in('status', ['won', 'lost']),
      ])
      await emitDomainEvent(admin, {
        eventName: 'quote.won',
        actorType: 'customer',
        citySlug,
        requestId: request.id,
        workshopId: workshop.id,
        responseId: parsed.data.response_id,
        payload: {
          city_slug: citySlug,
          price_min: winnerResponse?.estimated_price_min ?? null,
          price_max: winnerResponse?.estimated_price_max ?? null,
          quotes_total: quotesTotal ?? null,
        },
      })
      if (settledByFreeLead) {
        await emitDomainEvent(admin, {
          eventName: 'quote.settled',
          actorType: 'system',
          citySlug,
          requestId: request.id,
          workshopId: workshop.id,
          responseId: parsed.data.response_id,
          payload: { method: 'free_lead', amount_ore: 0 },
        })
      }
    })().catch((eventError) => console.error('winner events failed', eventError))

    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(notifyTask)
      edgeRuntime.waitUntil(eventTask)
    }
    else await Promise.all([notifyTask, eventTask])

    return new Response(JSON.stringify({
      ok: true,
      already_chosen: Boolean(chosen.already_chosen),
      settled,
      winner_name: workshop.company_name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Okänt fel'
    const message = friendlyDatabaseError(rawMessage)
    console.error('select-bike-winner', rawMessage)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
