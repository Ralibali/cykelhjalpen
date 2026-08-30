// v2-winner-reminders (cron, hourly) — contract §3.2.
//
// Kunden har valt en vinnare men verkstaden har inte reglerat (betalat eller
// dragit gratis-lead) → kontaktuppgifterna är fortsatt låsta:
//   +2 h  → mejl till verkstaden (dedupe winner_payment:{response_id}:2h)
//   +24 h → mejl + SMS (SMS respekterar quiet hours 21–08 svensk tid)
//   +48 h → stalled_at sätts + event winner.stalled (input till G-L3)
//
// Vinsttidpunkten: workshop_responses.won_at (trigger), fallback till
// notification_events-raden winner_selected_email:{response_id} och därefter
// response.created_at. Flagga: v2.liquidity.winner_reminders (dry_run kör
// alltid utan biverkningar, för gate-review).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import {
  HOUR_MS,
  decideWinnerAction,
  smsQuietHoursActive,
  winnerPaymentKey,
} from '../_shared/v2/lifecycle.ts'
import {
  escapeLifecycleHtml,
  hasNudge,
  lifecycleCtaEmail,
  recordNudge,
  sendLifecycleEmail,
  sendLifecycleSms,
  type LifecycleMailCtx,
} from '../_shared/v2/lifecycle-mail.ts'

const DASHBOARD_URL = 'https://cykelhjalpen.se/dashboard/verkstad'

interface WonRow {
  id: string
  request_id: string
  workshop_id: string
  created_at: string
  won_at: string | null
  winner_reminded_at: string | null
  stalled_at: string | null
  workshops: {
    company_name: string | null
    email: string | null
    phone: string | null
  } | null
  bike_repair_requests: {
    city: string
    repair_category: string
    customer_name: string
    status: string
    reselection_count: number
  } | null
}

/** Fallback för vinster som hann ske innan won_at-kolumnen fanns. */
const resolveWonAt = async (admin: SupabaseClient, row: WonRow): Promise<number> => {
  if (row.won_at) return new Date(row.won_at).getTime()
  const { data } = await admin
    .from('notification_events')
    .select('created_at')
    .eq('idempotency_key', `winner_selected_email:${row.id}`)
    .maybeSingle()
  if (data?.created_at) return new Date(data.created_at as string).getTime()
  return new Date(row.created_at).getTime()
}

const reminderEmail = (
  workshopName: string,
  customerName: string,
  stage: '2h' | '24h',
): { subject: string; html: string } => ({
  subject: stage === '2h'
    ? `Påminnelse: slutför vinsten från ${customerName}`
    : `Sista påminnelsen: lås upp kontakten med ${customerName}`,
  html: lifecycleCtaEmail({
    heading: `Hej ${workshopName}!`,
    bodyHtml:
      `<strong>${escapeLifecycleHtml(customerName)}</strong> har valt er som vinnare, men kontaktuppgifterna är inte upplåsta än. ` +
      (stage === '2h'
        ? `Betala vinstavgiften 50 kr exkl. moms för att låsa upp dem direkt.`
        : `Betala vinstavgiften 50 kr exkl. moms för att låsa upp dem. Om inget händer inom 48 timmar från vinsten kan kunden få välja en annan verkstad.`),
    link: DASHBOARD_URL,
    cta: 'Slutför betalningen',
    footerNote: 'Ni får det här mejlet för att er verkstad vann ett ärende på Cykelhjälpen.',
  }),
})

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.', code: 'method_not_allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({})) as { dry_run?: boolean }
    const dryRun = body.dry_run === true

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.', code: 'config_missing' }, 500)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const ctx: LifecycleMailCtx = { supabaseUrl, serviceRoleKey }

    const flagOn = await v2FlagEnabled(admin, 'v2.liquidity.winner_reminders')
    if (!flagOn && !dryRun) {
      return json({ reminded: [], stalled: [], note: 'flag_off' })
    }

    const { data: rows, error } = await admin
      .from('workshop_responses')
      .select('id, request_id, workshop_id, created_at, won_at, winner_reminded_at, stalled_at, workshops(company_name, email, phone), bike_repair_requests(city, repair_category, customer_name, status, reselection_count)')
      .eq('status', 'won')
      .eq('paid', false)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) throw error

    const reminded: { response_id: string; stage: '2h' | '24h' }[] = []
    const stalled: string[] = []
    const now = Date.now()
    const quietHours = smsQuietHoursActive(new Date(now))

    for (const row of (rows || []) as unknown as WonRow[]) {
      const request = row.bike_repair_requests
      // Ärendet har redan gått vidare till omval — inget mer att påminna om.
      if (request?.status === 'awaiting_reselection') continue

      const wonAtMs = await resolveWonAt(admin, row)
      const wonAgeHours = (now - wonAtMs) / HOUR_MS

      const sent2h = await hasNudge(admin, winnerPaymentKey(row.id, '2h'))
      const sent24h = await hasNudge(admin, winnerPaymentKey(row.id, '24h'))
      const action = decideWinnerAction(wonAgeHours, sent2h, sent24h)
      const citySlug = request ? citySlugFromName(request.city) : null

      if (action.send && !dryRun) {
        const stage = action.send
        const workshopName = row.workshops?.company_name || 'Verkstaden'
        const customerName = request?.customer_name || 'Kunden'
        const dedupeKey = winnerPaymentKey(row.id, stage)
        const mail = reminderEmail(workshopName, customerName, stage)

        const emailResult = await sendLifecycleEmail(admin, ctx, {
          idempotencyKey: `winner_reminder_email:${dedupeKey}`,
          to: row.workshops?.email,
          subject: mail.subject,
          html: mail.html,
          payload: { reason: 'winner_payment_reminder', response_id: row.id, stage },
        })
        await recordNudge(admin, {
          dedupeKey,
          kind: 'winner_payment',
          requestId: row.request_id,
          workshopId: row.workshop_id,
          responseId: row.id,
          channel: 'email',
          sentCount: emailResult === 'sent' ? 1 : 0,
          meta: { stage },
        })

        let smsSent = 0
        if (stage === '24h' && row.workshops?.phone && !quietHours) {
          const sms = await sendLifecycleSms(admin, {
            to: row.workshops.phone,
            message: `Cykelhjälpen: ${customerName} har valt er men kontakten är inte upplåst. Betala vinstavgiften 50 kr exkl. moms: ${DASHBOARD_URL}`,
            idempotencyKey: `winner_reminder_sms:${dedupeKey}`,
            reason: 'winner_payment_reminder_24h',
          })
          smsSent = sms === 'sent' ? 1 : 0
        }

        // Om 24h-steget gick ut utan att 2h någonsin skickats spärras 2h-
        // nyckeln som superseded så det tidigare steget aldrig går ut senare.
        if (stage === '24h' && !sent2h) {
          await recordNudge(admin, {
            dedupeKey: winnerPaymentKey(row.id, '2h'),
            kind: 'winner_payment',
            requestId: row.request_id,
            workshopId: row.workshop_id,
            responseId: row.id,
            channel: 'email',
            sentCount: 0,
            meta: { stage: '2h', superseded_by: '24h' },
          })
        }

        await admin
          .from('workshop_responses')
          .update({ winner_reminded_at: new Date(now).toISOString() })
          .eq('id', row.id)

        await emitDomainEvent(admin, {
          eventName: 'winner.reminded',
          citySlug,
          requestId: row.request_id,
          workshopId: row.workshop_id,
          responseId: row.id,
          payload: { stage },
        })
        await emitDomainEvent(admin, {
          eventName: 'nudge.sent',
          citySlug,
          requestId: row.request_id,
          workshopId: row.workshop_id,
          responseId: row.id,
          payload: { kind: 'winner_payment', channel: smsSent ? 'sms' : 'email', sent_count: (emailResult === 'sent' ? 1 : 0) + smsSent },
        })
      }
      if (action.send) reminded.push({ response_id: row.id, stage: action.send })

      // SMS catch-up: om 24h-steget redan är loggat men SMS:et aldrig
      // försöktes (quiet hours vid tillfället) skickas det så fort det är
      // tillåtet. Nyckeln saknas då helt — skipped/failed-rader räknas som
      // försök och ger aldrig automatiskt omskick (spam-skydd).
      const smsKey = `winner_reminder_sms:${winnerPaymentKey(row.id, '24h')}`
      if (!action.send && sent24h && !dryRun && row.workshops?.phone && !quietHours && wonAgeHours < 48) {
        const { data: smsLogged } = await admin
          .from('notification_events')
          .select('id')
          .eq('idempotency_key', smsKey)
          .maybeSingle()
        if (!smsLogged) {
          const customerName = request?.customer_name || 'Kunden'
          await sendLifecycleSms(admin, {
            to: row.workshops.phone,
            message: `Cykelhjälpen: ${customerName} har valt er men kontakten är inte upplåst. Betala vinstavgiften 50 kr exkl. moms: ${DASHBOARD_URL}`,
            idempotencyKey: smsKey,
            reason: 'winner_payment_reminder_24h',
          })
        }
      }

      if (action.markStalled && !row.stalled_at) {
        if (!dryRun) {
          await admin
            .from('workshop_responses')
            .update({ stalled_at: new Date(now).toISOString() })
            .eq('id', row.id)
            .is('stalled_at', null)
          await emitDomainEvent(admin, {
            eventName: 'winner.stalled',
            citySlug,
            requestId: row.request_id,
            workshopId: row.workshop_id,
            responseId: row.id,
            payload: {
              stalled_hours: Math.round(wonAgeHours),
              reselection_count: request?.reselection_count ?? 0,
            },
          })
        }
        stalled.push(row.id)
      }
    }

    return json({ reminded, stalled })
  } catch (error) {
    console.error('v2-winner-reminders', error)
    return json({ error: error instanceof Error ? error.message : 'Något gick fel.', code: 'internal' }, 500)
  }
})
