// Påminner kunden om att välja offert.
//
// När ett ärende stängts för nya offerter (tre offerter inne eller
// femdagarsfönstret slut) har kunden fem dagar på sig att välja verkstad.
// Kadensen räknas från `closed_at`:
//
//   dag 0  – SMS: offerterna är klara, dags att välja
//   dag 2  – mejl: påminnelse med länk
//   dag 4  – SMS: offerterna går ut i morgon
//   dag 5  – ärendet sätts till `choice_expired` + slutmejl
//
// Dessutom: ärenden med en eller två offerter (ännu inte stängda) får en knuff
// ett dygn efter senaste svaret – kunden behöver inte vänta på att ärendet
// stängs för att välja verkstad.
//
// Idempotens sköts via notification_events (unik nyckel per ärende och steg).
// Körs schemalagt varje timme utan JWT.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { logSmsAttempt, logNotificationEvent } from '../_shared/notifications.ts'

const CHOICE_WINDOW_DAYS = 5
const DAY_MS = 24 * 60 * 60 * 1000

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

interface RequestRow {
  id: string
  view_token: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_language: string | null
  city: string
  repair_category: string
  status: string
  closed_at: string | null
  updated_at: string
}

const alreadyLogged = async (admin: SupabaseClient, key: string) => {
  const { data } = await admin
    .from('notification_events')
    .select('id')
    .eq('idempotency_key', key)
    .maybeSingle()
  return Boolean(data)
}

const sendEmail = async (
  admin: SupabaseClient,
  args: { to: string; subject: string; html: string; idempotencyKey: string },
) => {
  if (await alreadyLogged(admin, args.idempotencyKey)) return false

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

const ctaEmail = (opts: {
  lang: 'sv' | 'en'
  heading: string
  body: string
  link: string
  cta: string
}) => `
  <h2 style="margin:0 0 16px">${escapeHtml(opts.heading)}</h2>
  <p>${opts.body}</p>
  <p style="margin-top:24px"><a href="${opts.link}" style="display:inline-block;background:#4338CA;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${escapeHtml(opts.cta)}</a></p>`

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.' }, 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  const result = { checked: 0, sms_sent: 0, emails_sent: 0, expired: 0 }

  try {
    // 1. Sätt closed_at på ärenden som precis stängts (t.ex. av databastriggern).
    await admin
      .from('bike_repair_requests')
      .update({ closed_at: new Date().toISOString() })
      .eq('status', 'closed_for_responses')
      .is('closed_at', null)

    const { data: rows, error } = await admin
      .from('bike_repair_requests')
      .select('id, view_token, customer_name, customer_email, customer_phone, customer_language, city, repair_category, status, closed_at, updated_at')
      .eq('status', 'closed_for_responses')
      .not('closed_at', 'is', null)
      .limit(200)

    if (error) throw error

    for (const row of (rows || []) as RequestRow[]) {
      result.checked += 1
      const lang: 'sv' | 'en' = row.customer_language === 'en' ? 'en' : 'sv'
      const link = `https://cykelhjalpen.se/mitt-arende/${row.view_token}`
      const closedAt = new Date(row.closed_at as string).getTime()
      const ageDays = (Date.now() - closedAt) / DAY_MS
      const daysLeft = Math.max(0, Math.ceil(CHOICE_WINDOW_DAYS - ageDays))

      const { count } = await admin
        .from('workshop_responses')
        .select('id', { count: 'exact', head: true })
        .eq('request_id', row.id)
        .in('status', ['sent', 'won'])
      const offerCount = count ?? 0

      // Steg 1 – SMS direkt när offerterna är klara.
      if (row.customer_phone) {
        const key = `choice_ready_sms:${row.id}`
        if (!(await alreadyLogged(admin, key))) {
          const message = lang === 'en'
            ? `Cykelhjalpen: your ${offerCount} quote(s) are ready. Choose a workshop within ${CHOICE_WINDOW_DAYS} days: ${link}`
            : `Cykelhjälpen: dina ${offerCount} offerter är klara. Välj verkstad inom ${CHOICE_WINDOW_DAYS} dagar: ${link}`
          const sms = await logSmsAttempt(admin, { to: row.customer_phone, message, idempotencyKey: key, reason: 'choice_ready' })
          if (sms.status === 'sent') result.sms_sent += 1
        }
      }

      // Steg 2 – mejlpåminnelse efter två dagar.
      if (ageDays >= 2) {
        const sent = await sendEmail(admin, {
          to: row.customer_email,
          subject: lang === 'en'
            ? `Reminder: choose your workshop (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`
            : `Påminnelse: välj verkstad (${daysLeft} dag${daysLeft === 1 ? '' : 'ar'} kvar)`,
          idempotencyKey: `choice_reminder_email:${row.id}`,
          html: ctaEmail({
            lang,
            heading: lang === 'en' ? 'Time to pick your workshop' : 'Dags att välja verkstad',
            link,
            cta: lang === 'en' ? 'Compare and choose' : 'Jämför och välj',
            body: lang === 'en'
              ? `Hi ${escapeHtml(row.customer_name)}, you have ${offerCount} quote(s) waiting for your request (${escapeHtml(row.repair_category)}, ${escapeHtml(row.city)}). You have ${daysLeft} day${daysLeft === 1 ? '' : 's'} left to choose – once you pick a workshop you get their contact details straight away.`
              : `Hej ${escapeHtml(row.customer_name)}, du har ${offerCount} offert${offerCount === 1 ? '' : 'er'} som väntar på ditt ärende (${escapeHtml(row.repair_category)}, ${escapeHtml(row.city)}). Du har ${daysLeft} dag${daysLeft === 1 ? '' : 'ar'} kvar på dig att välja – när du valt verkstad får du kontaktuppgifterna direkt.`,
          }),
        })
        if (sent) result.emails_sent += 1
      }

      // Steg 3 – SMS sista dagen.
      if (ageDays >= CHOICE_WINDOW_DAYS - 1 && ageDays < CHOICE_WINDOW_DAYS && row.customer_phone) {
        const key = `choice_lastcall_sms:${row.id}`
        if (!(await alreadyLogged(admin, key))) {
          const message = lang === 'en'
            ? `Cykelhjalpen: your quotes expire tomorrow. Choose a workshop here: ${link}`
            : `Cykelhjälpen: dina offerter går ut i morgon. Välj verkstad här: ${link}`
          const sms = await logSmsAttempt(admin, { to: row.customer_phone, message, idempotencyKey: key, reason: 'choice_last_call' })
          if (sms.status === 'sent') result.sms_sent += 1
        }
      }

      // Steg 4 – fönstret slut.
      if (ageDays >= CHOICE_WINDOW_DAYS) {
        const { error: updateError } = await admin
          .from('bike_repair_requests')
          .update({ status: 'choice_expired', updated_at: new Date().toISOString() })
          .eq('id', row.id)
          .eq('status', 'closed_for_responses')
        if (updateError) {
          console.error('bike-choice-reminders expire', row.id, updateError.message)
          continue
        }
        result.expired += 1

        const sent = await sendEmail(admin, {
          to: row.customer_email,
          subject: lang === 'en' ? 'Your quotes have expired' : 'Dina offerter har gått ut',
          idempotencyKey: `choice_expired_email:${row.id}`,
          html: ctaEmail({
            lang,
            heading: lang === 'en' ? 'Your quotes have expired' : 'Dina offerter har gått ut',
            link: 'https://cykelhjalpen.se/cykelreparation',
            cta: lang === 'en' ? 'Post a new request' : 'Lägg upp nytt ärende',
            body: lang === 'en'
              ? `Hi ${escapeHtml(row.customer_name)}, you did not pick a workshop within ${CHOICE_WINDOW_DAYS} days, so the quotes for your request (${escapeHtml(row.repair_category)}, ${escapeHtml(row.city)}) have expired. You can post a new request whenever you like – it is free.`
              : `Hej ${escapeHtml(row.customer_name)}, du hann inte välja verkstad inom ${CHOICE_WINDOW_DAYS} dagar, så offerterna på ditt ärende (${escapeHtml(row.repair_category)}, ${escapeHtml(row.city)}) har gått ut. Du är välkommen att lägga upp ett nytt ärende när du vill – det är gratis.`,
          }),
        })
        if (sent) result.emails_sent += 1
      }
    }

    // Knuff för ärenden som har offerter men ännu inte stängts: ett dygn efter
    // senaste svaret påminns kunden om att den kan välja verkstad direkt.
    const { data: openRows, error: openError } = await admin
      .from('bike_repair_requests')
      .select('id, view_token, customer_name, customer_email, customer_phone, customer_language, city, repair_category')
      .eq('status', 'has_offers')
      .eq('admin_status', 'approved')
      .limit(200)

    if (openError) throw openError

    for (const row of openRows || []) {
      const nudgeKey = `choice_nudge:${row.id}`
      if (await alreadyLogged(admin, nudgeKey)) continue

      const { data: latestResponses, error: latestError } = await admin
        .from('workshop_responses')
        .select('id, created_at', { count: 'exact' })
        .eq('request_id', row.id)
        .in('status', ['sent', 'won'])
        .order('created_at', { ascending: false })
      if (latestError) {
        console.error('bike-choice-reminders nudge query', row.id, latestError.message)
        continue
      }
      const offerCount = latestResponses?.length ?? 0
      const newestAt = latestResponses?.[0]?.created_at
      if (offerCount === 0 || !newestAt) continue

      const hoursSinceLatest = (Date.now() - new Date(newestAt).getTime()) / (60 * 60 * 1000)
      if (hoursSinceLatest < 24) continue

      result.checked += 1
      const lang: 'sv' | 'en' = row.customer_language === 'en' ? 'en' : 'sv'
      const link = `https://cykelhjalpen.se/mitt-arende/${row.view_token}`

      if (row.customer_email) {
        const sent = await sendEmail(admin, {
          to: row.customer_email,
          subject: lang === 'en'
            ? `You can choose your workshop already – ${offerCount} quote${offerCount === 1 ? '' : 's'} waiting`
            : `Du kan välja verkstad redan nu – ${offerCount} offert${offerCount === 1 ? '' : 'er'} väntar`,
          idempotencyKey: nudgeKey,
          html: ctaEmail({
            lang,
            heading: lang === 'en' ? 'Your quotes are waiting' : 'Dina offerter väntar',
            link,
            cta: lang === 'en' ? 'Compare and choose' : 'Jämför och välj',
            body: lang === 'en'
              ? `Hi ${escapeHtml(row.customer_name)}, you already have ${offerCount} quote${offerCount === 1 ? '' : 's'} on your request (${escapeHtml(row.repair_category)}, ${escapeHtml(row.city)}). You do not have to wait – pick a workshop now and you get their contact details straight away.`
              : `Hej ${escapeHtml(row.customer_name)}, du har redan ${offerCount} offert${offerCount === 1 ? '' : 'er'} på ditt ärende (${escapeHtml(row.repair_category)}, ${escapeHtml(row.city)}). Du behöver inte vänta – välj en verkstad nu så får du kontaktuppgifterna direkt.`,
          }),
        })
        if (sent) result.emails_sent += 1
      }

      if (row.customer_phone) {
        const message = lang === 'en'
          ? `Cykelhjalpen: you have ${offerCount} quote(s) waiting – choose a workshop now: ${link}`
          : `Cykelhjälpen: du har ${offerCount} offert${offerCount === 1 ? '' : 'er'} som väntar – välj verkstad nu: ${link}`
        const sms = await logSmsAttempt(admin, { to: row.customer_phone, message, idempotencyKey: `choice_nudge_sms:${row.id}`, reason: 'choice_nudge' })
        if (sms.status === 'sent') result.sms_sent += 1
      }
    }

    return json({ ok: true, ...result })
  } catch (error) {
    console.error('bike-choice-reminders', error)
    return json({ error: error instanceof Error ? error.message : 'Något gick fel.' }, 500)
  }
})
