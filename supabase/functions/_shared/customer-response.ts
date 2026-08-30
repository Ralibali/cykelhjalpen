// Notifierar kunden (cykelägaren) när en verkstad har lämnat svar på deras
// ärende – via e-post alltid (om adress finns) och SMS (om telefon finns).
// Båda kanalerna är idempotenta per svar: samma response_id skickar aldrig dubbelt.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { logNotificationEvent, logSmsAttempt } from './notifications.ts'
import { withUtmParams } from './v2/utm.ts'

export const buildCustomerResponseUrl = (viewToken: string): string =>
  `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(viewToken)}`

export type CustomerLang = 'sv' | 'en'

export const buildCustomerResponseSubject = (repairCategory: string, lang: CustomerLang = 'sv'): string =>
  lang === 'en'
    ? `New quote for your bike – ${repairCategory}`
    : `Nytt prisförslag på din cykel – ${repairCategory}`

// ÅÄÖ gör att svenska SMS skickas som UCS-2 (67 tecken per del). Texten hålls
// kort så att den för normala verkstadsnamn aldrig överstiger tre delar (201
// tecken). Engelska texter saknar ÅÄÖ men hålls inom samma gräns.
export const buildCustomerResponseSms = (
  workshopName: string, requestUrl: string, lang: CustomerLang = 'sv', quoteCount = 1,
): string => {
  if (lang === 'en') {
    const action = quoteCount >= 2
      ? 'Compare and choose a workshop'
      : 'Choose now – you get contact details after you pick'
    return `Cykelhjalpen: ${workshopName} sent you a quote. ${action}: ${requestUrl}`
  }
  const action = quoteCount >= 2
    ? 'Jämför och välj verkstad redan nu'
    : 'Välj redan nu – du får kontakten när du valt'
  return `Cykelhjälpen: ${workshopName} har lagt ett prisförslag. ${action}: ${requestUrl}`
}

export const escapeCustomerHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const emailBody = (workshopName: string, lang: CustomerLang, quoteCount: number): string => {
  const name = escapeCustomerHtml(workshopName)
  if (lang === 'en') {
    return quoteCount >= 2
      ? `<strong>${name}</strong> has sent you a quote. Compare the quotes and choose the workshop you want to go ahead with – you get their contact details only after you have chosen in Cykelhjälpen.`
      : `<strong>${name}</strong> has sent you a quote. You can choose already – you get their contact details only after you have chosen in Cykelhjälpen.`
  }
  return quoteCount >= 2
    ? `<strong>${name}</strong> har lämnat ett prisförslag på ditt cykelärende. Jämför förslagen och välj den verkstad du vill gå vidare med – du får kontaktuppgifterna först när du valt i Cykelhjälpen.`
    : `<strong>${name}</strong> har lämnat ett prisförslag på ditt cykelärende. Välj redan nu – du får verkstadens kontaktuppgifter först när du valt i Cykelhjälpen.`
}

const emailCta = (lang: CustomerLang, quoteCount: number): string => {
  if (lang === 'en') return quoteCount >= 2 ? 'Compare the quotes and choose' : 'Choose the workshop now'
  return quoteCount >= 2 ? 'Jämför och välj' : 'Välj verkstad redan nu'
}

const emailBodyText = (workshopName: string, lang: CustomerLang, quoteCount: number): string => {
  if (lang === 'en') {
    return quoteCount >= 2
      ? `${workshopName} has sent you a quote. Compare the quotes and choose the workshop you want to go ahead with – you get their contact details only after you have chosen in Cykelhjälpen.`
      : `${workshopName} has sent you a quote. You can choose already – you get their contact details only after you have chosen in Cykelhjälpen.`
  }
  return quoteCount >= 2
    ? `${workshopName} har lämnat ett prisförslag på ditt cykelärende. Jämför förslagen och välj den verkstad du vill gå vidare med – du får kontaktuppgifterna först när du valt i Cykelhjälpen.`
    : `${workshopName} har lämnat ett prisförslag på ditt cykelärende. Välj redan nu – du får verkstadens kontaktuppgifter först när du valt i Cykelhjälpen.`
}

export const buildCustomerResponseEmailHtml = (
  customerName: string, workshopName: string, requestUrl: string, lang: CustomerLang = 'sv', quoteCount = 1,
): string => {
  const cta = emailCta(lang, quoteCount)
  const body = emailBody(workshopName, lang, quoteCount)
  const footer = lang === 'en'
    ? 'You are getting this email because you posted a request on Cykelhjälpen.'
    : 'Du får det här mejlet för att du lagt upp ett ärende på Cykelhjälpen.'
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">` +
    `<h2>${lang === 'en' ? 'Hi' : 'Hej'} ${escapeCustomerHtml(customerName)}!</h2>` +
    `<p>${body}</p>` +
    `<p><a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">${cta}</a></p>` +
    `<p style="color:#6b7280;font-size:13px">${footer}</p>` +
    `</div>`
}

export const buildCustomerResponseEmailText = (
  customerName: string, workshopName: string, requestUrl: string, lang: CustomerLang = 'sv', quoteCount = 1,
): string =>
  lang === 'en'
    ? `Hi ${customerName}!\n\n${emailBodyText(workshopName, lang, quoteCount)}\n\nView the quote: ${requestUrl}\n\n` +
      `You are getting this email because you posted a request on Cykelhjälpen.`
    : `Hej ${customerName}!\n\n${emailBodyText(workshopName, lang, quoteCount)}\n\nSe prisförslaget: ${requestUrl}\n\n` +
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
    .select('customer_name, customer_email, customer_phone, customer_language, repair_category, view_token')
    .eq('id', ctx.requestId)
    .maybeSingle()
  if (error) {
    console.error('notifyCustomerOfNewResponse: kunde inte läsa ärendet', error.message)
    return { email: 'failed', sms: 'failed' }
  }
  if (!request?.view_token) return { email: 'skipped', sms: 'skipped' }

  const requestUrl = buildCustomerResponseUrl(request.view_token as string)
  // V2 attribution (S6): email links carry UTM; SMS keeps the bare URL (length).
  const emailUrl = withUtmParams(requestUrl, { source: 'email', campaign: 'new_quote' })
  const lang: CustomerLang = request.customer_language === 'en' ? 'en' : 'sv'
  const workshopName = ctx.workshopName || (lang === 'en' ? 'A bike workshop' : 'En cykelverkstad')
  const customerName = (request.customer_name as string) || 'du'

  // Default 1 so a failed count never implies more quotes are coming.
  const { count: sentCount } = await admin
    .from('workshop_responses')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', ctx.requestId)
    .in('status', ['sent', 'won'])
  const quoteCount = sentCount && sentCount > 0 ? sentCount : 1

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
            subject: buildCustomerResponseSubject((request.repair_category as string) || 'cykelreparation', lang),
            html: buildCustomerResponseEmailHtml(customerName, workshopName, emailUrl, lang, quoteCount),
            text: buildCustomerResponseEmailText(customerName, workshopName, emailUrl, lang, quoteCount),
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
      message: buildCustomerResponseSms(workshopName, requestUrl, lang, quoteCount),
      idempotencyKey: `customer_response_sms:${ctx.responseId}`,
      reason: 'customer_new_response',
    })
    sms = smsResult.status === 'sent' ? 'sent' : smsResult.status === 'failed' ? 'failed' : 'skipped'
    if (sms === 'failed') console.error('Kund-sms om nytt svar misslyckades', ctx.responseId)
  }

  return { email, sms }
}
