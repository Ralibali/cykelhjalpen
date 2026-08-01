// Notifierar kunden (cykelägaren) när en verkstad har lämnat svar på deras
// ärende – via e-post alltid (om adress finns) och SMS (om telefon finns).
// Båda kanalerna är idempotenta per svar: samma response_id skickar aldrig dubbelt.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { logNotificationEvent, logSmsAttempt } from './notifications.ts'

export const buildCustomerResponseUrl = (viewToken: string): string =>
  `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(viewToken)}`

export const buildCustomerResponseSubject = (repairCategory: string): string =>
  `Nytt prisförslag på din cykel – ${repairCategory}`

// ÅÄÖ gör att SMS skickas som UCS-2 (67 tecken per del). Texten hålls kort så
// att den för normala verkstadsnamn aldrig överstiger tre delar (201 tecken).
export const buildCustomerResponseSms = (workshopName: string, requestUrl: string): string =>
  `Hej! ${workshopName} har lämnat prisförslag på ditt cykelärende. Se det här: ${requestUrl}`

export const escapeCustomerHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export const buildCustomerResponseEmailHtml = (
  customerName: string, workshopName: string, requestUrl: string,
): string =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">` +
  `<h2>Hej ${escapeCustomerHtml(customerName)}!</h2>` +
  `<p><strong>${escapeCustomerHtml(workshopName)}</strong> har lämnat ett prisförslag på ditt cykelärende.</p>` +
  `<p><a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Se prisförslaget</a></p>` +
  `<p style="color:#6b7280;font-size:13px">Du får det här mejlet för att du lagt upp ett ärende på Cykelhjälpen.</p>` +
  `</div>`

export const buildCustomerResponseEmailText = (
  customerName: string, workshopName: string, requestUrl: string,
): string =>
  `Hej ${customerName}!\n\n${workshopName} har lämnat ett prisförslag på ditt cykelärende.\n\nSe prisförslaget: ${requestUrl}\n\n` +
  `Du får det här mejlet för att du lagt upp ett ärende på Cykelhjälpen.`

type ChannelResult = 'sent' | 'failed' | 'skipped'

export const notifyCustomerOfNewResponse = async (
  admin: SupabaseClient,
  ctx: {
    supabaseUrl: string
    serviceRoleKey: string
    requestId: string
    responseId: string
    workshopName: string
  },
): Promise<{ email: ChannelResult; sms: ChannelResult }> => {
  const { data: request, error } = await admin
    .from('bike_repair_requests')
    .select('customer_name, customer_email, customer_phone, repair_category, view_token')
    .eq('id', ctx.requestId)
    .maybeSingle()
  if (error) {
    console.error('notifyCustomerOfNewResponse: kunde inte läsa ärendet', error.message)
    return { email: 'failed', sms: 'failed' }
  }
  if (!request?.view_token) return { email: 'skipped', sms: 'skipped' }

  const requestUrl = buildCustomerResponseUrl(request.view_token as string)
  const workshopName = ctx.workshopName || 'En cykelverkstad'
  const customerName = (request.customer_name as string) || 'du'

  // --- E-post (idempotent per svar) ---
  let email: ChannelResult = 'skipped'
  if (request.customer_email) {
    const emailKey = `customer_response_email:${ctx.responseId}`
    const { data: existingEmail } = await admin
      .from('notification_events')
      .select('status')
      .eq('idempotency_key', emailKey)
      .maybeSingle()
    if (existingEmail?.status === 'sent') {
      email = 'sent'
    } else {
      let emailError: string | null = null
      try {
        const res = await fetch(`${ctx.supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.serviceRoleKey}`,
          },
          body: JSON.stringify({
            to: request.customer_email,
            subject: buildCustomerResponseSubject((request.repair_category as string) || 'cykelreparation'),
            html: buildCustomerResponseEmailHtml(customerName, workshopName, requestUrl),
            text: buildCustomerResponseEmailText(customerName, workshopName, requestUrl),
          }),
          signal: AbortSignal.timeout(15_000),
        })
        email = res.ok ? 'sent' : 'failed'
        if (!res.ok) emailError = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`
      } catch (sendError) {
        email = 'failed'
        emailError = sendError instanceof Error ? sendError.message : 'E-postutskick misslyckades'
      }
      if (emailError) console.error('Kundmejl om nytt svar misslyckades', emailError)
      await logNotificationEvent(admin, {
        channel: 'email',
        provider: 'resend',
        recipient: request.customer_email as string,
        idempotencyKey: emailKey,
        status: email,
        payload: {
          reason: 'customer_new_response',
          request_id: ctx.requestId,
          response_id: ctx.responseId,
          workshop: workshopName,
        },
        error: emailError,
      })
    }
  }

  // --- SMS (idempotent per svar via logSmsAttempt) ---
  let sms: ChannelResult = 'skipped'
  if (request.customer_phone) {
    const smsResult = await logSmsAttempt(admin, {
      to: request.customer_phone as string,
      message: buildCustomerResponseSms(workshopName, requestUrl),
      idempotencyKey: `customer_response_sms:${ctx.responseId}`,
      reason: 'customer_new_response',
    })
    sms = smsResult.status === 'sent' ? 'sent' : smsResult.status === 'failed' ? 'failed' : 'skipped'
    if (sms === 'failed') console.error('Kund-sms om nytt svar misslyckades', ctx.responseId)
  }

  return { email, sms }
}
