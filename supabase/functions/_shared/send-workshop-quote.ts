// Shared "send a workshop quote" path used by:
//   - submit-bike-response (logged-in workshop dashboard)
//   - submit-workshop-quote-link (magic SMS link, no login)
// Pricing / free-leads are unchanged: pay-per-win settles on winner pick.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { notifyCustomerOfNewResponse } from './customer-response.ts'
import { sendAdminAlert } from './admin-alert.ts'
import { emitDomainEvent } from './v2/events.ts'
import { citySlugFromName } from './v2/config-schema.ts'
import { requestIsOpenForQuote } from './workshop-quote-core.ts'

export const friendlyDatabaseError = (message: string) => {
  if (message.includes('bike_request_full')) return 'Ärendet är fullt – tre verkstäder har redan svarat.'
  if (message.includes('response_not_found')) return 'Offerten hittades inte.'
  if (message.includes('workshop_not_approved')) return 'Verkstaden är inte godkänd ännu.'
  return message
}

export type QuoteWorkshop = {
  id: string
  approved: boolean
  company_name: string
  city: string
  user_id?: string | null
}

export type QuoteRequest = {
  id: string
  status: string
  admin_status: string
  city: string
  created_at: string
  approved_at?: string | null
}

export type QuoteResponse = {
  id: string
  request_id: string
  workshop_id: string
  paid?: boolean
  status: string
  estimated_price_min?: number | null
  estimated_price_max?: number | null
}

export function assertWorkshopCanQuote(
  workshop: QuoteWorkshop | null,
  request: QuoteRequest | null,
  opts: { requireSameCity?: boolean } = {},
): void {
  if (!workshop?.approved) throw new Error('Verkstaden är inte godkänd ännu')
  if (!request) throw new Error('Ärendet hittades inte')
  if (request.admin_status !== 'approved') throw new Error('Ärendet är inte publicerat ännu.')
  if (opts.requireSameCity !== false && request.city !== workshop.city) {
    throw new Error('Ärendet ligger inte i din stad.')
  }
  if (request.status === 'completed') {
    throw new Error('Kunden har redan valt en verkstad för det här ärendet.')
  }
  if (!requestIsOpenForQuote(request.status)) {
    throw new Error('Ärendet är fullt – tre verkstäder har redan svarat.')
  }
}

export async function markResponseSent(
  admin: SupabaseClient,
  response: QuoteResponse,
): Promise<{ already_sent: boolean }> {
  if (response.status === 'sent' || response.status === 'won') {
    return { already_sent: true }
  }
  if (response.status === 'lost') {
    throw new Error('Kunden har redan valt en annan verkstad för det här ärendet.')
  }

  const { error: updateError } = await admin
    .from('workshop_responses')
    .update({ status: 'sent' })
    .eq('id', response.id)
    .in('status', ['draft', 'pending_payment'])
  if (updateError) throw new Error(friendlyDatabaseError(updateError.message))
  return { already_sent: false }
}

export async function notifyQuoteSent(input: {
  admin: SupabaseClient
  supabaseUrl: string
  serviceRoleKey: string
  workshop: QuoteWorkshop
  request: QuoteRequest
  response: QuoteResponse
  actorUserId?: string | null
}): Promise<void> {
  const { admin, workshop, request, response } = input
  const citySlug = citySlugFromName(request.city ?? '')
  const openAt = Date.parse((request.approved_at as string | null) || request.created_at)
  const responseTimeHours = Number.isFinite(openAt)
    ? Math.round(Math.max(0, (Date.now() - openAt) / 3_600_000) * 100) / 100
    : null

  const eventTasks: Promise<unknown>[] = [emitDomainEvent(admin, {
    eventName: 'quote.sent',
    actorType: 'workshop',
    actorId: input.actorUserId ?? workshop.user_id ?? null,
    citySlug,
    requestId: response.request_id,
    workshopId: workshop.id,
    responseId: response.id,
    payload: {
      city_slug: citySlug,
      price_min: response.estimated_price_min ?? null,
      price_max: response.estimated_price_max ?? null,
      response_time_hours: responseTimeHours,
    },
  })]

  eventTasks.push((async () => {
    const { count } = await admin
      .from('workshop_responses')
      .select('id', { count: 'exact', head: true })
      .eq('workshop_id', workshop.id)
      .in('status', ['sent', 'won', 'lost'])
    if ((count ?? 0) <= 1) {
      await emitDomainEvent(admin, {
        eventName: 'workshop.first_quote',
        actorType: 'workshop',
        actorId: input.actorUserId ?? workshop.user_id ?? null,
        citySlug,
        workshopId: workshop.id,
        responseId: response.id,
        payload: { city_slug: citySlug },
      })
    }
  })())

  const notifyTask = notifyCustomerOfNewResponse(admin, {
    supabaseUrl: input.supabaseUrl,
    serviceRoleKey: input.serviceRoleKey,
    requestId: response.request_id,
    responseId: response.id,
    workshopName: workshop.company_name,
  }).catch((notifyError) => console.error('Customer notification failed', notifyError))

  const adminAlertTask = sendAdminAlert({
    supabaseUrl: input.supabaseUrl,
    serviceRoleKey: input.serviceRoleKey,
    subject: `Ny offert från ${workshop.company_name} (${workshop.city})`,
    heading: 'Ny offert skickad till kund',
    rows: [
      ['Verkstad', workshop.company_name],
      ['Stad', workshop.city],
      ['Ärende-ID', response.request_id],
    ],
    ctaUrl: 'https://cykelhjalpen.se/admin/offerter',
    ctaLabel: 'Se offerten',
  })

  const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime
  const backgroundTasks = [notifyTask, adminAlertTask, ...eventTasks]
  if (edgeRuntime?.waitUntil) {
    for (const task of backgroundTasks) edgeRuntime.waitUntil(task)
  } else {
    await Promise.all(backgroundTasks)
  }
}

export async function sendExistingWorkshopResponse(input: {
  admin: SupabaseClient
  supabaseUrl: string
  serviceRoleKey: string
  workshop: QuoteWorkshop
  request: QuoteRequest
  response: QuoteResponse
  actorUserId?: string | null
  requireSameCity?: boolean
}): Promise<{ ok: true; already_sent?: boolean }> {
  assertWorkshopCanQuote(input.workshop, input.request, {
    requireSameCity: input.requireSameCity,
  })
  if (input.response.workshop_id !== input.workshop.id) {
    throw new Error('Offerten hittades inte')
  }
  if (input.response.request_id !== input.request.id) {
    throw new Error('Offerten hittades inte')
  }

  const { already_sent } = await markResponseSent(input.admin, input.response)
  if (already_sent) return { ok: true, already_sent: true }

  await notifyQuoteSent(input)
  return { ok: true }
}

export async function upsertAndSendWorkshopQuote(input: {
  admin: SupabaseClient
  supabaseUrl: string
  serviceRoleKey: string
  workshop: QuoteWorkshop
  request: QuoteRequest
  actorUserId?: string | null
  requireSameCity?: boolean
  message: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  estimated_time?: string | null
  can_pickup?: boolean
}): Promise<{ ok: true; already_sent?: boolean; response_id: string }> {
  assertWorkshopCanQuote(input.workshop, input.request, {
    requireSameCity: input.requireSameCity,
  })

  const { data: existing, error: existingError } = await input.admin
    .from('workshop_responses')
    .select('id, request_id, workshop_id, paid, status, estimated_price_min, estimated_price_max')
    .eq('request_id', input.request.id)
    .eq('workshop_id', input.workshop.id)
    .maybeSingle()
  if (existingError) throw existingError

  let response = existing as QuoteResponse | null
  if (response && (response.status === 'sent' || response.status === 'won')) {
    return { ok: true, already_sent: true, response_id: response.id }
  }

  const payload = {
    request_id: input.request.id,
    workshop_id: input.workshop.id,
    message: input.message,
    estimated_price_min: input.estimated_price_min,
    estimated_price_max: input.estimated_price_max,
    estimated_time: input.estimated_time ?? null,
    can_pickup: Boolean(input.can_pickup),
    status: 'draft',
  }

  if (!response) {
    const { data, error } = await input.admin
      .from('workshop_responses')
      .insert(payload)
      .select('id, request_id, workshop_id, paid, status, estimated_price_min, estimated_price_max')
      .single()
    if (error || !data) throw new Error(friendlyDatabaseError(error?.message || 'Kunde inte spara offerten.'))
    response = data as QuoteResponse
  } else {
    const { data, error } = await input.admin
      .from('workshop_responses')
      .update({
        message: payload.message,
        estimated_price_min: payload.estimated_price_min,
        estimated_price_max: payload.estimated_price_max,
        estimated_time: payload.estimated_time,
        can_pickup: payload.can_pickup,
      })
      .eq('id', response.id)
      .select('id, request_id, workshop_id, paid, status, estimated_price_min, estimated_price_max')
      .single()
    if (error || !data) throw new Error(friendlyDatabaseError(error?.message || 'Kunde inte spara offerten.'))
    response = data as QuoteResponse
  }

  const sent = await sendExistingWorkshopResponse({
    admin: input.admin,
    supabaseUrl: input.supabaseUrl,
    serviceRoleKey: input.serviceRoleKey,
    workshop: input.workshop,
    request: input.request,
    response,
    actorUserId: input.actorUserId,
    requireSameCity: input.requireSameCity,
  })
  return { ...sent, response_id: response.id }
}
