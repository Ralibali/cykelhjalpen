// v2-zero-quote-rescue (cron, hourly) — contract §3.2.
//
// Räddar godkända ärenden som står utan offerter:
//   24 h  → auto_nudge: mejlar matchande verkstäder (dagens manuella
//           nudge-workshops-flöde, automatiserat) + request.zero_quote_at_24h
//   72 h  → extend_window (5→7 dygn, verkställs av close-stale-bike-requests)
//           + re-nudge med utökad eligibility (areas/cluster när S1-flaggan
//           är på) + founder_backstop (admin-notis) + ärligt kundmejl
//   stängd utan offerter → repost_invite med /skicka-arende?stad=-CTA
//           (ersätter den trasiga /cykelreparation-länken, A8)
//
// Flagga: v2.liquidity.zero_quote_rescue (OFF = inga skrivningar/utskick).
// dry_run:true kör alltid utan biverkningar — krävs för gate G-L2-review.
// Idempotens: v2_rescue_actions + v2_nudge_log + notification_events-nycklar.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { sendInAppNotifications } from '../_shared/notifications.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { resolveV2CityConfig, v2ClusterCityNames } from '../_shared/v2/city-state.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import {
  HOUR_MS,
  buildRepostUrl,
  customerZeroQuoteKey,
  workshopMatchesRequestCity,
  zeroQuoteActionDue,
  zeroQuoteNudgeKey,
} from '../_shared/v2/lifecycle.ts'
import {
  escapeLifecycleHtml,
  lifecycleCtaEmail,
  recordNudge,
  sendLifecycleEmail,
  type LifecycleMailCtx,
} from '../_shared/v2/lifecycle-mail.ts'

const REPOST_INVITE_MAX_AGE_DAYS = 14
const DASHBOARD_URL = 'https://cykelhjalpen.se/dashboard/verkstad/arenden'

interface RequestRow {
  id: string
  view_token: string
  customer_name: string
  customer_email: string | null
  city: string
  bike_type: string
  repair_category: string
  description: string | null
  created_at: string
  updated_at: string
}

interface WorkshopRow {
  id: string
  email: string | null
  company_name: string | null
  city: string | null
  service_area_mode: string | null
  cluster_opt_in: boolean | null
  areas_served: string[] | null
}

type ActionStatus = 'executed' | 'skipped' | 'failed' | 'planned'

interface ActionResult {
  request_id: string
  action_type: string
  status: ActionStatus
}

const countQuotes = async (admin: SupabaseClient, requestId: string): Promise<number> => {
  const { data } = await admin
    .from('workshop_responses')
    .select('id')
    .eq('request_id', requestId)
    .in('status', ['sent', 'won'])
    .limit(1)
  return (data || []).length
}

const hasRescueAction = async (
  admin: SupabaseClient,
  requestId: string,
  actionType: string,
): Promise<boolean> => {
  const { data } = await admin
    .from('v2_rescue_actions')
    .select('id')
    .eq('request_id', requestId)
    .eq('action_type', actionType)
    .in('status', ['executed', 'planned'])
    .limit(1)
  return (data || []).length > 0
}

const recordRescueAction = async (
  admin: SupabaseClient,
  args: {
    requestId: string
    actionType: string
    status: ActionStatus
    reason?: string
    meta?: Record<string, unknown>
  },
  dryRun: boolean,
): Promise<void> => {
  if (dryRun) return
  const { error } = await admin.from('v2_rescue_actions').insert({
    request_id: args.requestId,
    action_type: args.actionType,
    status: args.status,
    reason: args.reason ?? null,
    meta: args.meta ?? {},
  })
  if (error) console.error('v2_rescue_actions insert failed', args.actionType, error.message)
}

/** Verkstäder som matchar ärendets stad (exakt + utökat när flaggat). */
const eligibleWorkshops = async (
  admin: SupabaseClient,
  request: RequestRow,
  expandedMatching: boolean,
): Promise<{ rows: WorkshopRow[]; expanded: boolean }> => {
  const { data } = await admin
    .from('workshops')
    .select('id, email, company_name, city, service_area_mode, cluster_opt_in, areas_served')
    .eq('approved', true)
    .limit(500)

  const clusterNames = expandedMatching
    ? await v2ClusterCityNames(admin, request.city)
    : [request.city]

  const rows = ((data || []) as WorkshopRow[]).filter((workshop) =>
    workshopMatchesRequestCity(workshop, request.city, clusterNames, expandedMatching)
  )
  const expanded = rows.some((w) => w.city !== request.city)
  return { rows, expanded }
}

const nudgeWorkshops = async (
  admin: SupabaseClient,
  ctx: LifecycleMailCtx,
  request: RequestRow,
  stage: '24h' | '72h',
  expandedMatching: boolean,
  dryRun: boolean,
): Promise<{ nudged: number; expanded: boolean }> => {
  const { rows, expanded } = await eligibleWorkshops(admin, request, expandedMatching)
  let nudged = 0

  for (const workshop of rows) {
    const dedupeKey = zeroQuoteNudgeKey(request.id, workshop.id, stage)
    if (dryRun) {
      nudged += 1
      continue
    }

    const description = (request.description || '').length > 300
      ? `${(request.description || '').slice(0, 300)}…`
      : (request.description || '')
    const result = await sendLifecycleEmail(admin, ctx, {
      idempotencyKey: `nudge_email:${dedupeKey}`,
      to: workshop.email,
      subject: `Påminnelse: kund väntar fortfarande på offert i ${request.city}`,
      html: lifecycleCtaEmail({
        heading: `En kund väntar på svar i ${request.city}`,
        bodyHtml:
          `Hej ${escapeLifecycleHtml(workshop.company_name || 'verkstad')}, det här ärendet har fortfarande inga offerter:` +
          `<br><br><strong>${escapeLifecycleHtml(request.bike_type)}</strong> · ${escapeLifecycleHtml(request.repair_category)}` +
          (description ? `<br><span style="color:#555">${escapeLifecycleHtml(description)}</span>` : '') +
          `<br><br>Att lämna offert är gratis – du betalar bara om kunden väljer dig.`,
        link: DASHBOARD_URL,
        cta: 'Lämna offert nu',
        footerNote: 'Ni får det här mejlet för att er verkstad är ansluten till Cykelhjälpen.',
      }),
      payload: { reason: 'zero_quote_nudge', request_id: request.id, stage },
    })

    await recordNudge(admin, {
      dedupeKey,
      kind: 'zero_quote',
      requestId: request.id,
      workshopId: workshop.id,
      channel: 'email',
      sentCount: result === 'sent' ? 1 : 0,
      meta: { stage },
    })
    if (result === 'sent') nudged += 1
  }
  return { nudged, expanded }
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.', code: 'method_not_allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({})) as { dry_run?: boolean; city_slug?: string }
    const dryRun = body.dry_run === true

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.', code: 'config_missing' }, 500)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const ctx: LifecycleMailCtx = { supabaseUrl, serviceRoleKey }

    // dry_run är alltid tillåtet (gate G-L2: granskning innan flaggan slås på).
    const flagOn = await v2FlagEnabled(admin, 'v2.liquidity.zero_quote_rescue')
    if (!flagOn && !dryRun) {
      return json({ scanned: 0, actions: [], skipped: 0, note: 'flag_off' })
    }
    const expandedMatching = await v2FlagEnabled(admin, 'v2.liquidity.areas_served_matching')

    const cityFilterName = body.city_slug
      ? (await resolveV2CityConfig(admin, body.city_slug))?.cityName ?? null
      : null
    if (body.city_slug && !cityFilterName) {
      return json({ error: 'Okänd city_slug.', code: 'unknown_city' }, 400)
    }

    const actions: ActionResult[] = []
    let scanned = 0
    let skipped = 0

    // --- Steg 1–2: öppna ärenden utan offerter (24 h / 72 h) ----------------
    const cutoff24h = new Date(Date.now() - 24 * HOUR_MS).toISOString()
    let query = admin
      .from('bike_repair_requests')
      .select('id, view_token, customer_name, customer_email, city, bike_type, repair_category, description, created_at, updated_at')
      .eq('admin_status', 'approved')
      .in('status', ['new', 'has_offers'])
      .lt('created_at', cutoff24h)
      .order('created_at', { ascending: true })
      .limit(100)
    if (cityFilterName) query = query.eq('city', cityFilterName)

    const { data: openRows, error: openError } = await query
    if (openError) throw openError

    for (const request of (openRows || []) as RequestRow[]) {
      const quotes = await countQuotes(admin, request.id)
      const ageHours = (Date.now() - new Date(request.created_at).getTime()) / HOUR_MS
      const due = zeroQuoteActionDue(ageHours, quotes)
      scanned += 1
      if (!due) {
        skipped += 1
        continue
      }

      const citySlug = citySlugFromName(request.city)

      if (due === 'auto_nudge') {
        if (await hasRescueAction(admin, request.id, 'auto_nudge')) {
          skipped += 1
          continue
        }
        const { nudged } = await nudgeWorkshops(admin, ctx, request, '24h', expandedMatching, dryRun)
        await recordRescueAction(admin, {
          requestId: request.id,
          actionType: 'auto_nudge',
          status: dryRun ? 'planned' : 'executed',
          reason: 'zero_quotes_at_24h',
          meta: { workshops_nudged: nudged },
        }, dryRun)
        if (!dryRun) {
          await emitDomainEvent(admin, { eventName: 'rescue.triggered', citySlug, requestId: request.id, payload: { action_type: 'auto_nudge', city_slug: citySlug } })
          await emitDomainEvent(admin, { eventName: 'request.zero_quote_at_24h', citySlug, requestId: request.id, payload: { city_slug: citySlug } })
          await emitDomainEvent(admin, { eventName: 'nudge.sent', citySlug, requestId: request.id, payload: { kind: 'zero_quote', channel: 'email', sent_count: nudged } })
        }
        actions.push({ request_id: request.id, action_type: 'auto_nudge', status: dryRun ? 'planned' : 'executed' })
        continue
      }

      // due === 'extend_window' (≥72 h utan offerter)
      if (!(await hasRescueAction(admin, request.id, 'extend_window'))) {
        const { nudged, expanded } = await nudgeWorkshops(admin, ctx, request, '72h', expandedMatching, dryRun)

        await recordRescueAction(admin, {
          requestId: request.id,
          actionType: 'extend_window',
          status: dryRun ? 'planned' : 'executed',
          reason: 'zero_quotes_at_72h',
          meta: { new_window_days: 7 },
        }, dryRun)
        if (expanded) {
          await recordRescueAction(admin, {
            requestId: request.id,
            actionType: 'cross_cluster_broadcast',
            status: dryRun ? 'planned' : 'executed',
            reason: 'expanded_eligibility',
            meta: { workshops_nudged: nudged },
          }, dryRun)
        }

        // Ärligt kundmejl: inga offerter än, vi har förlängt fönstret.
        if (!dryRun && request.customer_email) {
          const link = `https://cykelhjalpen.se/mitt-arende/${request.view_token}`
          await sendLifecycleEmail(admin, ctx, {
            idempotencyKey: customerZeroQuoteKey(request.id, '72h'),
            to: request.customer_email,
            subject: 'Vi letar fortfarande efter verkstad åt dig',
            html: lifecycleCtaEmail({
              heading: 'Inga offerter än – vi har förlängt ditt ärende',
              bodyHtml:
                `Hej ${escapeLifecycleHtml(request.customer_name)}, ingen verkstad har hunnit svara på ditt ärende (${escapeLifecycleHtml(request.repair_category)}, ${escapeLifecycleHtml(request.city)}) ännu. ` +
                `Vi har förlängt tiden och påmint verkstäderna i området. Du behöver inte göra något – vi hör av oss så fort ett prisförslag kommer in.`,
              link,
              cta: 'Se ditt ärende',
              footerNote: 'Du får det här mejlet för att du lagt upp ett ärende på Cykelhjälpen.',
            }),
            payload: { reason: 'zero_quote_customer_72h', request_id: request.id },
          })
        }

        // Founder-backstop: admin-notis (idempotent per ärende).
        if (!dryRun) {
          const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
          await sendInAppNotifications(admin, (admins || []).map((row) => ({
            user_id: row.id as string,
            type: 'zero_quote_backstop',
            title: `Ärende utan offerter i 72 h: ${request.city}`,
            message: `${request.bike_type} · ${request.repair_category}`,
            link: '/admin/arenden',
          })), `founder_backstop:${request.id}`)
          await recordRescueAction(admin, {
            requestId: request.id,
            actionType: 'founder_backstop',
            status: 'executed',
            reason: 'zero_quotes_at_72h',
          }, false)
          await emitDomainEvent(admin, { eventName: 'rescue.triggered', citySlug, requestId: request.id, payload: { action_type: 'extend_window', city_slug: citySlug } })
        }
        actions.push({ request_id: request.id, action_type: 'extend_window', status: dryRun ? 'planned' : 'executed' })
      } else {
        skipped += 1
      }
    }

    // --- Steg 3: stängda utan offerter → repost_invite ----------------------
    const repostCutoff = new Date(Date.now() - REPOST_INVITE_MAX_AGE_DAYS * 24 * HOUR_MS).toISOString()
    let expiredQuery = admin
      .from('bike_repair_requests')
      .select('id, view_token, customer_name, customer_email, city, bike_type, repair_category, description, created_at, updated_at')
      .eq('admin_status', 'approved')
      .eq('status', 'expired')
      .gt('updated_at', repostCutoff)
      .order('updated_at', { ascending: true })
      .limit(100)
    if (cityFilterName) expiredQuery = expiredQuery.eq('city', cityFilterName)

    const { data: expiredRows, error: expiredError } = await expiredQuery
    if (expiredError) throw expiredError

    for (const request of (expiredRows || []) as RequestRow[]) {
      if (await hasRescueAction(admin, request.id, 'repost_invite')) continue
      const quotes = await countQuotes(admin, request.id)
      if (quotes > 0) continue
      scanned += 1

      const citySlug = citySlugFromName(request.city)
      const repostUrl = buildRepostUrl(citySlug)

      if (!dryRun && request.customer_email) {
        await sendLifecycleEmail(admin, ctx, {
          idempotencyKey: customerZeroQuoteKey(request.id, 'close'),
          to: request.customer_email,
          subject: 'Ditt ärende fick inga offerter – lägg upp det igen med ett klick',
          html: lifecycleCtaEmail({
            heading: 'Inga offerter den här gången',
            bodyHtml:
              `Hej ${escapeLifecycleHtml(request.customer_name)}, tyvärr svarade ingen verkstad på ditt ärende (${escapeLifecycleHtml(request.repair_category)}, ${escapeLifecycleHtml(request.city)}) innan det stängdes. ` +
              `Du är varmt välkommen att lägga upp ärendet igen – det är gratis och tar bara en minut.`,
            link: repostUrl,
            cta: 'Lägg upp ärendet igen',
            footerNote: 'Du får det här mejlet för att du lagt upp ett ärende på Cykelhjälpen.',
          }),
          payload: { reason: 'repost_invite', request_id: request.id },
        })
        await emitDomainEvent(admin, { eventName: 'request.zero_quote_at_close', citySlug, requestId: request.id, payload: { city_slug: citySlug } })
        await emitDomainEvent(admin, { eventName: 'rescue.triggered', citySlug, requestId: request.id, payload: { action_type: 'repost_invite', city_slug: citySlug } })
      }
      await recordRescueAction(admin, {
        requestId: request.id,
        actionType: 'repost_invite',
        status: dryRun ? 'planned' : 'executed',
        reason: 'closed_with_zero_quotes',
        meta: { repost_url: repostUrl },
      }, dryRun)
      actions.push({ request_id: request.id, action_type: 'repost_invite', status: dryRun ? 'planned' : 'executed' })
    }

    return json({ scanned, actions, skipped })
  } catch (error) {
    console.error('v2-zero-quote-rescue', error)
    return json({ error: error instanceof Error ? error.message : 'Något gick fel.', code: 'internal' }, 500)
  }
})
