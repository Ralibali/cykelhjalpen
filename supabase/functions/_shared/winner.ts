// Notiser kring betala-vid-vinst: när kunden valt vinnare mejlas vinnaren
// (betalning krävs eller kontaktuppgifter upplåsta via gratis-lead), de
// verkstäder som inte valdes, och kunden som bekräftelse. Allt är idempotenta
// händelser – samma nyckel skickar aldrig dubbelt.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { logNotificationEvent } from './notifications.ts'
import { escapeCustomerHtml } from './customer-response.ts'

const DASHBOARD_URL = 'https://cykelhjalpen.se/dashboard/verkstad'

export const buildWinnerSubject = (customerName: string): string =>
  `Du vann ärendet från ${customerName}!`

export const buildWinnerEmailHtml = (
  workshopName: string, customerName: string, settled: boolean,
): string =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">` +
  `<h2>Grattis ${escapeCustomerHtml(workshopName)}!</h2>` +
  `<p><strong>${escapeCustomerHtml(customerName)}</strong> har valt er för sitt cykelärende.</p>` +
  (settled
    ? `<p>Ett gratis-lead har dragits och kundens kontaktuppgifter är upplåsta. Logga in och hör av er till kunden direkt:</p>`
    : `<p>För att låsa upp kundens kontaktuppgifter betalar ni vinstavgiften 50 kr exkl. moms. Logga in och slutför betalningen:</p>`) +
  `<p><a href="${DASHBOARD_URL}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Öppna din instrumentpanel</a></p>` +
  `<p style="color:#6b7280;font-size:13px">Ni får det här mejlet för att er verkstad är ansluten till Cykelhjälpen.</p>` +
  `</div>`

export const buildWinnerEmailText = (
  workshopName: string, customerName: string, settled: boolean,
): string =>
  `Grattis ${workshopName}!\n\n${customerName} har valt er för sitt cykelärende.\n\n` +
  (settled
    ? `Ett gratis-lead har dragits och kundens kontaktuppgifter är upplåsta. Logga in och hör av er till kunden direkt: ${DASHBOARD_URL}\n\n`
    : `För att låsa upp kundens kontaktuppgifter betalar ni vinstavgiften 50 kr exkl. moms. Logga in och slutför betalningen: ${DASHBOARD_URL}\n\n`) +
  `Ni får det här mejlet för att er verkstad är ansluten till Cykelhjälpen.`

export const buildLoserSubject = (): string => 'Kunden valde en annan verkstad den här gången'

export const buildLoserEmailHtml = (workshopName: string, repairCategory: string): string =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">` +
  `<h2>Hej ${escapeCustomerHtml(workshopName)}!</h2>` +
  `<p>Kunden valde tyvärr en annan verkstad för ärendet (${escapeCustomerHtml(repairCategory)}). Ert svar kostade inget – ni betalar bara när kunden väljer er.</p>` +
  `<p>Nya ärenden i er stad dyker upp löpande på instrumentpanelen.</p>` +
  `<p><a href="${DASHBOARD_URL}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Se öppna ärenden</a></p>` +
  `<p style="color:#6b7280;font-size:13px">Ni får det här mejlet för att er verkstad är ansluten till Cykelhjälpen.</p>` +
  `</div>`

export const buildLoserEmailText = (workshopName: string, repairCategory: string): string =>
  `Hej ${workshopName}!\n\nKunden valde tyvärr en annan verkstad för ärendet (${repairCategory}). Ert svar kostade inget – ni betalar bara när kunden väljer er.\n\n` +
  `Nya ärenden i er stad dyker upp löpande: ${DASHBOARD_URL}\n\n` +
  `Ni får det här mejlet för att er verkstad är ansluten till Cykelhjälpen.`

export const buildCustomerPickSubject = (workshopName: string): string =>
  `Du har valt ${workshopName}`

export const buildCustomerPickEmailHtml = (
  customerName: string, workshopName: string, requestUrl: string,
): string =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">` +
  `<h2>Tack ${escapeCustomerHtml(customerName)}!</h2>` +
  `<p>Du har valt <strong>${escapeCustomerHtml(workshopName)}</strong> för ditt cykelärende. Verkstaden får dina kontaktuppgifter och hör av sig till dig inom kort.</p>` +
  `<p><a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Se ditt ärende</a></p>` +
  `<p style="color:#6b7280;font-size:13px">Du får det här mejlet för att du lagt upp ett ärende på Cykelhjälpen.</p>` +
  `</div>`

export const buildCustomerPickEmailText = (
  customerName: string, workshopName: string, requestUrl: string,
): string =>
  `Tack ${customerName}!\n\nDu har valt ${workshopName} för ditt cykelärende. Verkstaden får dina kontaktuppgifter och hör av sig till dig inom kort.\n\n` +
  `Se ditt ärende: ${requestUrl}\n\n` +
  `Du får det här mejlet för att du lagt upp ett ärende på Cykelhjälpen.`

type ChannelResult = 'sent' | 'failed' | 'skipped'

const sendEmail = async (
  ctx: { supabaseUrl: string; serviceRoleKey: string },
  to: string, subject: string, html: string, text: string,
): Promise<{ result: ChannelResult; error: string | null }> => {
  try {
    const res = await fetch(`${ctx.supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ctx.serviceRoleKey}`,
      },
      body: JSON.stringify({ to, subject, html, text }),
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) return { result: 'sent', error: null }
    return { result: 'failed', error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` }
  } catch (error) {
    return { result: 'failed', error: error instanceof Error ? error.message : 'E-postutskick misslyckades' }
  }
}

const sendIdempotentEmail = async (
  admin: SupabaseClient,
  ctx: { supabaseUrl: string; serviceRoleKey: string },
  args: {
    idempotencyKey: string
    to: string | null | undefined
    subject: string
    html: string
    text: string
    payload: Record<string, unknown>
  },
): Promise<ChannelResult> => {
  if (!args.to) return 'skipped'
  const { data: existing } = await admin
    .from('notification_events')
    .select('status')
    .eq('idempotency_key', args.idempotencyKey)
    .maybeSingle()
  if (existing?.status === 'sent') return 'sent'

  const { result, error } = await sendEmail(ctx, args.to, args.subject, args.html, args.text)
  if (error) console.error('Vinstnotis misslyckades', args.idempotencyKey, error)
  await logNotificationEvent(admin, {
    channel: 'email',
    provider: 'resend',
    recipient: args.to,
    idempotencyKey: args.idempotencyKey,
    status: result,
    payload: args.payload,
    error,
  })
  return result
}

// Mejl till vinnande verkstad om att kunden valt dem.
export const notifyWinnerWorkshop = async (
  admin: SupabaseClient,
  ctx: { supabaseUrl: string; serviceRoleKey: string },
  args: {
    responseId: string
    workshopEmail: string | null
    workshopName: string
    customerName: string
    settled: boolean
  },
): Promise<ChannelResult> =>
  sendIdempotentEmail(admin, ctx, {
    idempotencyKey: `winner_selected_email:${args.responseId}`,
    to: args.workshopEmail,
    subject: buildWinnerSubject(args.customerName),
    html: buildWinnerEmailHtml(args.workshopName, args.customerName, args.settled),
    text: buildWinnerEmailText(args.workshopName, args.customerName, args.settled),
    payload: { reason: 'winner_selected', response_id: args.responseId, settled: args.settled },
  })

// Mejl till en verkstad som inte valdes.
export const notifyLoserWorkshop = async (
  admin: SupabaseClient,
  ctx: { supabaseUrl: string; serviceRoleKey: string },
  args: {
    responseId: string
    workshopEmail: string | null
    workshopName: string
    repairCategory: string
  },
): Promise<ChannelResult> =>
  sendIdempotentEmail(admin, ctx, {
    idempotencyKey: `loser_selected_email:${args.responseId}`,
    to: args.workshopEmail,
    subject: buildLoserSubject(),
    html: buildLoserEmailHtml(args.workshopName, args.repairCategory),
    text: buildLoserEmailText(args.workshopName, args.repairCategory),
    payload: { reason: 'loser_selected', response_id: args.responseId },
  })

// Bekräftelsemejl till kunden som valt verkstad.
export const notifyCustomerOfPick = async (
  admin: SupabaseClient,
  ctx: { supabaseUrl: string; serviceRoleKey: string },
  args: {
    requestId: string
    customerEmail: string | null
    customerName: string
    workshopName: string
    requestUrl: string
  },
): Promise<ChannelResult> =>
  sendIdempotentEmail(admin, ctx, {
    idempotencyKey: `customer_pick_email:${args.requestId}`,
    to: args.customerEmail,
    subject: buildCustomerPickSubject(args.workshopName),
    html: buildCustomerPickEmailHtml(args.customerName, args.workshopName, args.requestUrl),
    text: buildCustomerPickEmailText(args.customerName, args.workshopName, args.requestUrl),
    payload: { reason: 'customer_picked_winner', request_id: args.requestId },
  })
