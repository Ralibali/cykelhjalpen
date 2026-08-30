// v2-stalled-winner-recovery (cron, daily) — contract §3.2.
//
// Del 1 — stalled-winner recovery: vinst obetald ≥ 48 h (stalled_at) och
// stalled ≥ 72 h → ärendet sätts till awaiting_reselection och kunden bjuds
// in att välja en annan offert via sin token-länk. Finns inga alternativ
// backstoppas admin i stället.
//
// Del 2 — onboarding-livscykel (contract §2.2, samma dagliga körning):
// räknar om v2_workshop_onboarding per verkstad (ren state machine i
// _shared/v2/lifecycle.ts), håller workshops.onboarding_state i synk och
// skickar aktiveringsnudges: godkänd-men-aldrig-offererat och dormant vid
// relevant efterfrågan. Frekvenstak: max 1 nudge/72 h per verkstad;
// SMS skickas aldrig 21–08 svensk tid.
//
// Flagga: v2.liquidity.winner_reminders (del 1). Onboarding-delen är
// intern state-hantering och körs alltid, men nudge-UTSKICK kräver samma
// flagga (nya kund-/verkstadsmejl är default OFF). dry_run utan biverkningar.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { sendInAppNotifications } from '../_shared/notifications.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import {
  DAY_MS,
  isStalledRecoveryDue,
  nudgeCapReached,
  onboardingNudgeKey,
  onboardingNudgeKind,
  reselectionInviteKey,
  resolveOnboardingState,
  stockholmDateKey,
  type OnboardingState,
} from '../_shared/v2/lifecycle.ts'
import {
  escapeLifecycleHtml,
  hasNudge,
  lifecycleCtaEmail,
  recordNudge,
  sendLifecycleEmail,
  type LifecycleMailCtx,
} from '../_shared/v2/lifecycle-mail.ts'

const DASHBOARD_URL = 'https://cykelhjalpen.se/dashboard/verkstad'
const ONBOARDING_NUDGE_MIN_AGE_HOURS = 48

interface StalledRow {
  id: string
  request_id: string
  workshop_id: string
  stalled_at: string
  bike_repair_requests: {
    status: string
    view_token: string
    customer_name: string
    customer_email: string | null
    city: string
    repair_category: string
    reselection_count: number
  } | null
}

// ---------------------------------------------------------------------------
// Del 1 — stalled-winner recovery
// ---------------------------------------------------------------------------

const recoverStalledWinners = async (
  admin: SupabaseClient,
  ctx: LifecycleMailCtx,
  flagOn: boolean,
  dryRun: boolean,
): Promise<{ request_id: string; old_response_id: string }[]> => {
  const recovered: { request_id: string; old_response_id: string }[] = []

  const { data: rows, error } = await admin
    .from('workshop_responses')
    .select('id, request_id, workshop_id, stalled_at, bike_repair_requests(status, view_token, customer_name, customer_email, city, repair_category, reselection_count)')
    .eq('status', 'won')
    .eq('paid', false)
    .not('stalled_at', 'is', null)
    .limit(200)
  if (error) throw error

  const now = Date.now()
  for (const row of (rows || []) as unknown as StalledRow[]) {
    const request = row.bike_repair_requests
    if (!request || request.status !== 'completed') continue
    const stalledAtMs = new Date(row.stalled_at).getTime()
    if (!Number.isFinite(stalledAtMs) || !isStalledRecoveryDue(stalledAtMs, now)) continue

    // Alternativa offerter: tidigare 'lost'-svar som inte själva stallat.
    const { data: alternatives } = await admin
      .from('workshop_responses')
      .select('id')
      .eq('request_id', row.request_id)
      .in('status', ['sent', 'lost'])
      .is('stalled_at', null)
      .neq('id', row.id)
    const alternativeCount = (alternatives || []).length

    recovered.push({ request_id: row.request_id, old_response_id: row.id })
    if (!flagOn || dryRun) continue

    // Atomiskt nog: bara flippa status om ärendet fortfarande är completed.
    const { error: updateError, count } = await admin
      .from('bike_repair_requests')
      .update({ status: 'awaiting_reselection', updated_at: new Date(now).toISOString() }, { count: 'exact' })
      .eq('id', row.request_id)
      .eq('status', 'completed')
    if (updateError) {
      console.error('v2-stalled-winner-recovery update', row.request_id, updateError.message)
      continue
    }
    if (count === 0) continue // någon annan hann före

    const citySlug = citySlugFromName(request.city)

    if (alternativeCount > 0 && request.customer_email) {
      const link = `https://cykelhjalpen.se/mitt-arende/${request.view_token}`
      await sendLifecycleEmail(admin, ctx, {
        idempotencyKey: reselectionInviteKey(row.request_id, request.reselection_count),
        to: request.customer_email,
        subject: 'Välj en annan verkstad – din första valde att inte gå vidare',
        html: lifecycleCtaEmail({
          heading: 'Du kan välja en annan verkstad',
          bodyHtml:
            `Hej ${escapeLifecycleHtml(request.customer_name)}, verkstaden du valde för ditt ärende (${escapeLifecycleHtml(request.repair_category)}, ${escapeLifecycleHtml(request.city)}) gick tyvärr inte vidare. ` +
            `Du har ${alternativeCount} ann${alternativeCount === 1 ? 'at prisförslag' : 'ra prisförslag'} kvar att välja bland – klicka nedan för att välja en annan verkstad.`,
          link,
          cta: 'Välj en annan verkstad',
          footerNote: 'Du får det här mejlet för att du lagt upp ett ärende på Cykelhjälpen.',
        }),
        payload: { reason: 'reselection_invite', request_id: row.request_id, alternatives: alternativeCount },
      })
    } else if (alternativeCount === 0) {
      // Inga alternativ → admin backstop i stället för ett tomt omval.
      const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
      await sendInAppNotifications(admin, (admins || []).map((adminRow) => ({
        user_id: adminRow.id as string,
        type: 'stalled_winner_no_alternative',
        title: `Stallad vinst utan alternativ: ${request.city}`,
        message: `${request.repair_category} · kunden kan inte välja om`,
        link: '/admin/arenden',
      })), `stalled_no_alt:${row.request_id}:${request.reselection_count}`)
    }

    await emitDomainEvent(admin, {
      eventName: 'winner.stalled',
      citySlug,
      requestId: row.request_id,
      workshopId: row.workshop_id,
      responseId: row.id,
      payload: {
        stalled_hours: Math.round((now - stalledAtMs) / (60 * 60 * 1000)),
        reselection_count: request.reselection_count,
      },
    })
  }
  return recovered
}

// ---------------------------------------------------------------------------
// Del 2 — onboarding-livscykel
// ---------------------------------------------------------------------------

interface WorkshopRow {
  id: string
  company_name: string | null
  email: string | null
  city: string | null
  approved: boolean
  created_at: string
}

const ONBOARDING_EVENT: Partial<Record<OnboardingState, 'workshop.approved' | 'workshop.first_quote' | 'workshop.first_win' | 'workshop.activated' | 'workshop.dormant'>> = {
  approved: 'workshop.approved',
  first_quote_sent: 'workshop.first_quote',
  first_win: 'workshop.first_win',
  activated: 'workshop.activated',
  dormant: 'workshop.dormant',
}

const reconcileOnboarding = async (
  admin: SupabaseClient,
  ctx: LifecycleMailCtx,
  flagOn: boolean,
  dryRun: boolean,
): Promise<{ transitioned: number; nudged: number }> => {
  const { data: workshops, error } = await admin
    .from('workshops')
    .select('id, company_name, email, city, approved, created_at')
    .limit(500)
  if (error) throw error

  const ids = ((workshops || []) as WorkshopRow[]).map((w) => w.id)
  if (ids.length === 0) return { transitioned: 0, nudged: 0 }

  const { data: onboardingRows } = await admin
    .from('v2_workshop_onboarding')
    .select('workshop_id, state, last_nudge_at')
    .in('workshop_id', ids)
  const onboardingById = new Map(
    ((onboardingRows || []) as { workshop_id: string; state: string; last_nudge_at: string | null }[])
      .map((row) => [row.workshop_id, row]),
  )

  const since30d = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const now = new Date()
  const dateKey = stockholmDateKey(now)
  let transitioned = 0
  let nudged = 0

  for (const workshop of (workshops || []) as WorkshopRow[]) {
    const [{ data: quotes }, { data: quotes30 }, { data: wins }] = await Promise.all([
      admin.from('workshop_responses').select('id').eq('workshop_id', workshop.id).in('status', ['sent', 'won', 'lost']).limit(1000),
      admin.from('workshop_responses').select('id').eq('workshop_id', workshop.id).in('status', ['sent', 'won', 'lost']).gte('created_at', since30d).limit(1000),
      admin.from('workshop_responses').select('id').eq('workshop_id', workshop.id).eq('status', 'won').limit(1000),
    ])
    const facts = {
      approved: workshop.approved,
      quotesTotal: (quotes || []).length,
      quotes30d: (quotes30 || []).length,
      winsTotal: (wins || []).length,
    }

    const existing = onboardingById.get(workshop.id)
    const current = (existing?.state ?? 'registered') as OnboardingState
    const next = resolveOnboardingState(current, facts)

    if (next !== current) {
      transitioned += 1
      if (!dryRun) {
        const nowIso = now.toISOString()
        await admin.from('v2_workshop_onboarding').upsert({
          workshop_id: workshop.id,
          state: next,
          state_changed_at: nowIso,
          updated_at: nowIso,
        })
        await admin.from('workshops').update({ onboarding_state: next }).eq('id', workshop.id)
        const eventName = ONBOARDING_EVENT[next]
        if (eventName) {
          await emitDomainEvent(admin, {
            eventName,
            actorType: 'system',
            workshopId: workshop.id,
            citySlug: workshop.city ? citySlugFromName(workshop.city) : null,
            payload: {
              city_slug: workshop.city ? citySlugFromName(workshop.city) : null,
              days_since_registration: Math.round((now.getTime() - new Date(workshop.created_at).getTime()) / DAY_MS),
            },
          })
        }
      }
    }

    // Nudges: godkänd-men-aldrig-offererat + dormant. Kräver flaggan (nya
    // utskick default OFF), frekvenstak 72 h och minst 48 h sedan registrering.
    const kind = onboardingNudgeKind(next)
    if (!kind || !flagOn) continue
    if (!workshop.email || !workshop.city) continue
    if (now.getTime() - new Date(workshop.created_at).getTime() < ONBOARDING_NUDGE_MIN_AGE_HOURS * 60 * 60 * 1000) continue
    if (nudgeCapReached(existing?.last_nudge_at, now)) continue

    const dedupeKey = onboardingNudgeKey(workshop.id, kind, dateKey)
    if (await hasNudge(admin, dedupeKey)) continue

    // Relevant efterfrågan: antal öppna godkända ärenden i verkstadens stad.
    const { data: openRequests } = await admin
      .from('bike_repair_requests')
      .select('id')
      .eq('admin_status', 'approved')
      .in('status', ['new', 'has_offers'])
      .eq('city', workshop.city)
      .limit(50)
    const openCount = (openRequests || []).length
    if (kind === 'dormant_workshop' && openCount === 0) continue // ingen relevant demand

    nudged += 1
    if (dryRun) continue

    const demandLine = openCount > 0
      ? ` Just nu finns ${openCount} öppn${openCount === 1 ? 'a' : 'a'} ärende${openCount === 1 ? '' : 'n'} i ${escapeLifecycleHtml(workshop.city)} som väntar på offert.`
      : ''
    const result = await sendLifecycleEmail(admin, ctx, {
      idempotencyKey: `onboarding_email:${dedupeKey}`,
      to: workshop.email,
      subject: kind === 'onboarding'
        ? 'Dags för din första offert på Cykelhjälpen'
        : 'Vi saknar era offerter på Cykelhjälpen',
      html: lifecycleCtaEmail({
        heading: `Hej ${escapeLifecycleHtml(workshop.company_name || 'verkstad')}!`,
        bodyHtml: kind === 'onboarding'
          ? `Er verkstad är godkänd men ni har inte lämnat någon offert än. Det är gratis att svara – ni betalar bara 50 kr exkl. moms om kunden väljer er.${demandLine}`
          : `Vi har inte sett några offerter från er på ett tag.${demandLine} Nya ärenden dyker upp löpande och det tar bara någon minut att svara.`,
        link: `${DASHBOARD_URL}/arenden`,
        cta: 'Se öppna ärenden',
        footerNote: 'Ni får det här mejlet för att er verkstad är ansluten till Cykelhjälpen.',
      }),
      payload: { reason: kind, workshop_id: workshop.id, open_requests: openCount },
    })

    await recordNudge(admin, {
      dedupeKey,
      kind,
      workshopId: workshop.id,
      channel: 'email',
      sentCount: result === 'sent' ? 1 : 0,
      meta: { state: next, open_requests: openCount },
    })
    await admin
      .from('v2_workshop_onboarding')
      .update({ last_nudge_at: now.toISOString() })
      .eq('workshop_id', workshop.id)
    await emitDomainEvent(admin, {
      eventName: 'nudge.sent',
      workshopId: workshop.id,
      citySlug: workshop.city ? citySlugFromName(workshop.city) : null,
      payload: { kind, channel: 'email', sent_count: result === 'sent' ? 1 : 0 },
    })
  }

  return { transitioned, nudged }
}

// ---------------------------------------------------------------------------

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

    const recovered = await recoverStalledWinners(admin, ctx, flagOn, dryRun)
    const onboarding = await reconcileOnboarding(admin, ctx, flagOn, dryRun)

    return json({ recovered, onboarding })
  } catch (error) {
    console.error('v2-stalled-winner-recovery', error)
    return json({ error: error instanceof Error ? error.message : 'Något gick fel.', code: 'internal' }, 500)
  }
})
