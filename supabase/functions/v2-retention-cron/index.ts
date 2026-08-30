// v2-retention-cron — EN daglig cron för HELA S8 (kontrakt §3.7, registret i
// 20260830_v2_contracts_06_public_surface.sql: v2-retention-cron-daily '50 7 * * *').
//
// Sammanslagning (merge v2/customer-retention + v2/workshop-retention): ett
// Deno-entry kör BÅDA lanorna i samma körning:
//   KUND (runCustomerLane) — underhållspåminnelser efter avslutad service:
//     Fas 1 SCHEDULE mappar avslutade jobb (v1 status='completed' ELLER
//     v2_job_outcomes completed/confirmed) via e-post-hash mot kontakter med
//     marketing_consent; exakt ett mail per kontakt+säsong (dedupe-nyckel
//     'v2:…'). Fas 2 SEND skickar förfallna om consent/kvot/tysta timmar
//     tillåter; max EN uppföljning per säsong.
//   VERKSTAD (runWorkshopLane) — 6 cadences, var och en bakom sin underflagga:
//     dormant-reaktivering (0/7/21d), veckodigest (måndag, skip-empty),
//     vår-reaktivering feb–mars, månadsstatistik (1:a, skip-empty),
//     profilknuff (max 3, ≥14d), review/outcome-notiser. Dedupe-nycklar
//     'v2ret:…', claim-först vid sändning (conditional update).
//
// Lanorna delar tabellerna v2_retention_contacts + v2_lifecycle_messages men
// skiljs åt av dedupe_key-prefixet ('v2:' kund, 'v2ret:' verkstad), så den
// ena lanens sändloop aldrig plockar den andras meddelanden.
//
// Svarsform (kontrakt §3.7 = {sent,suppressed,failed}): platta SUMMOR på
// toppnivå + per-lan-detaljer:
//   { sent, suppressed, failed,
//     customer: { sent, suppressed, failed, scheduled, skipped },
//     workshop: { sent, suppressed, failed, scheduled } }
//
// Allt ligger bakom masterflaggan v2.retention.lifecycle (av = no-op, inga
// utskick). Avregistrerade kontakter får status 'suppressed' och skickas
// ALDRIG (kontrakt §2.7). Endast cron/internt: service-nyckeln krävs.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { getV2Flags } from '../_shared/v2/flags.ts'
import { citySlugFromName, isFlagOn } from '../_shared/v2/config-schema.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { logNotificationEvent, logSmsAttempt } from '../_shared/notifications.ts'
import {
  // Kund-lanen (underhållspåminnelser)
  RETENTION_LIFECYCLE_FLAG,
  buildPrefillWizardUrl,
  buildSeasonalReminderEmail,
  buildTokenPageUrl,
  buildUnsubscribeUrl,
  isInSeasonWindow,
  messageDisposition,
  planReminderForJob,
  reminderDedupeKey,
  ruleForCategory,
  type MaintenanceReminderRule,
  type RetentionContactState,
  type RetentionMessageKind,
  // Verkstads-lanen (cadences)
  RETENTION_CONFIG,
  RETENTION_KIND_FLAGS,
  computeLifecycleStage,
  computeProfileCompleteness,
  deferForQuietHours,
  dormancyCycleKey,
  isDigestDay,
  isDormant,
  isPerformanceDay,
  isSeasonalTarget,
  isSeasonalWindow,
  isSuppressed,
  isoWeekKey,
  previousMonthKey,
  reactivationSchedule,
  retentionDedupeKeys,
  seasonalKey,
  shouldSendDigest,
  shouldSendPerformanceSummary,
  shouldSendProfileNudge,
  stockholmParts,
  summarizeDigest,
  underFrequencyCap,
  type DigestRequestItem,
  type PerformanceStats,
} from '../_shared/v2/retention.ts'
import {
  buildDigestEmail,
  buildOutcomeNotificationEmail,
  buildPerformanceEmail,
  buildProfileNudgeEmail,
  buildReactivationEmail,
  buildReviewNotificationEmail,
  buildSeasonalEmail,
  type TemplateContext,
} from '../_shared/v2/retention-templates.ts'

// Kund-lanen: max antal utskick per körning.
const MAX_SENDS_PER_RUN = 50
// Kund-lanen: jobb äldre än så här kan aldrig bli aktuella (längsta regel + ett år).
const JOB_LOOKBACK_MS = 1000 * 60 * 60 * 24 * 365 * 3

const DAY_MS = 24 * 3_600_000

interface LaneResult {
  sent: number
  suppressed: number
  failed: number
  scheduled: number
  skipped: number
}

const emptyLane = (): LaneResult => ({ sent: 0, suppressed: 0, failed: 0, scheduled: 0, skipped: 0 })

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sendRetentionEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  args: { to: string; subject: string; html: string },
): Promise<void> {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`send-transactional-email HTTP ${res.status}`)
}

// ===========================================================================
// KUND-LANEN — underhållspåminnelser efter avslutad service
// ===========================================================================

interface JobRow {
  id: string
  customer_name: string
  customer_email: string
  bike_type: string
  repair_category: string
  city: string
  view_token: string
  status: string
  updated_at: string
  created_at: string
}

interface CustomerContactRow extends RetentionContactState {
  id: string
  subject_key: string
  unsubscribe_token: string
}

/** Avslutsdatum: v2-utfall vinner om det finns, annars v1-uppdateringen. */
function completionDate(job: JobRow, outcomes: Map<string, { state: string; updated_at: string }>): Date {
  const outcome = outcomes.get(job.id)
  if (outcome) return new Date(outcome.updated_at)
  return new Date(job.updated_at || job.created_at)
}

async function runCustomerLane(
  admin: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
  now: Date,
  dryRun: boolean,
): Promise<LaneResult> {
  const result = emptyLane()

  // ---- Fas 1: SCHEDULE -------------------------------------------------
  const [{ data: rules, error: rulesError }, { data: contacts, error: contactsError }] = await Promise.all([
    admin.from('v2_maintenance_reminder_rules').select('repair_category, kind, remind_after_months, followup_days, enabled'),
    admin.from('v2_retention_contacts')
      .select('id, subject_key, consent_basis, unsubscribed_at, last_contacted_at, unsubscribe_token')
      .eq('subject_type', 'customer')
      .eq('consent_basis', 'marketing_consent')
      .is('unsubscribed_at', null),
  ])
  if (rulesError) throw rulesError
  if (contactsError) throw contactsError

  const contactByKey = new Map((contacts ?? []).map((row) => [row.subject_key as string, row as CustomerContactRow]))
  const ruleList = (rules ?? []) as MaintenanceReminderRule[]

  let jobs: JobRow[] = []
  const outcomesByRequest = new Map<string, { state: string; updated_at: string }>()
  if (contactByKey.size > 0 && ruleList.length > 0) {
    const since = new Date(now.getTime() - JOB_LOOKBACK_MS).toISOString()
    const [{ data: completedJobs, error: jobsError }, { data: outcomes }] = await Promise.all([
      admin.from('bike_repair_requests')
        .select('id, customer_name, customer_email, bike_type, repair_category, city, view_token, status, updated_at, created_at')
        .eq('status', 'completed')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(2000),
      // S3:s tabell (read-only konsumtion enligt kontraktet). Saknas rader
      // faller loopen tillbaka på v1-statusen ovan.
      admin.from('v2_job_outcomes')
        .select('request_id, state, updated_at')
        .in('state', ['completed', 'confirmed_by_customer']),
    ])
    if (jobsError) throw jobsError
    for (const row of outcomes ?? []) {
      outcomesByRequest.set(row.request_id as string, { state: row.state as string, updated_at: row.updated_at as string })
    }
    jobs = (completedJobs ?? []) as JobRow[]
  }

  // Matcha jobb mot kontakter via e-post-hash (subject_key = sha256(lower(email))).
  const jobsByContact = new Map<string, JobRow[]>()
  for (const job of jobs) {
    const key = await sha256Hex(job.customer_email.trim().toLowerCase())
    if (!contactByKey.has(key)) continue
    const list = jobsByContact.get(key) ?? []
    list.push(job)
    jobsByContact.set(key, list)
  }

  for (const [subjectKey, contactJobs] of jobsByContact) {
    const contact = contactByKey.get(subjectKey)!
    // Nyaste jobbet per regel vinner — kontakten får ändå bara ett mail/säsong.
    for (const job of contactJobs) {
      const rule = ruleForCategory(ruleList, job.repair_category)
      if (!rule) continue
      const plan = planReminderForJob(completionDate(job, outcomesByRequest), rule, now)
      if (!plan || !isInSeasonWindow(plan.scheduled_for)) continue

      const dedupeKey = reminderDedupeKey(contact.id, plan.kind, plan.season_year)
      const { error: insertError } = await admin.from('v2_lifecycle_messages').insert({
        contact_id: contact.id,
        kind: plan.kind,
        channel: 'email',
        status: 'scheduled',
        scheduled_for: plan.scheduled_for.toISOString(),
        dedupe_key: dedupeKey,
        meta: {
          request_id: job.id,
          season_year: plan.season_year,
          followup_days: rule.followup_days,
          city: job.city,
          bike_type: job.bike_type,
          repair_category: job.repair_category,
        },
      })
      if (!insertError) result.scheduled += 1
      else if ((insertError as { code?: string }).code !== '23505') {
        console.error('schedule insert failed', insertError.message)
      }
      break // ett mail per kontakt + säsong räcker
    }
  }

  // ---- Fas 2: SEND ------------------------------------------------------
  // Lan-scoping: kundens meddelanden har dedupe_key 'v2:…' (verkstadens har
  // 'v2ret:…') så den här loopen rör aldrig verkstadslanens rader.
  const { data: due, error: dueError } = await admin.from('v2_lifecycle_messages')
    .select('id, contact_id, kind, channel, scheduled_for, dedupe_key, meta')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now.toISOString())
    .like('dedupe_key', 'v2:%')
    .order('scheduled_for', { ascending: true })
    .limit(MAX_SENDS_PER_RUN)
  if (dueError) throw dueError

  for (const message of due ?? []) {
    const meta = (message.meta ?? {}) as Record<string, unknown>
    const isFollowup = String(message.dedupe_key).endsWith(':followup')

    const { data: contactRow } = await admin.from('v2_retention_contacts')
      .select('id, subject_key, consent_basis, unsubscribed_at, last_contacted_at, unsubscribe_token')
      .eq('id', message.contact_id)
      .maybeSingle()
    if (!contactRow) {
      await admin.from('v2_lifecycle_messages').update({ status: 'failed' }).eq('id', message.id)
      result.failed += 1
      continue
    }
    const contact = contactRow as CustomerContactRow

    // Jobbdetaljer behövs både för innehåll och för uppföljningskollen.
    const requestId = meta.request_id as string | undefined
    const { data: job } = requestId
      ? await admin.from('bike_repair_requests')
          .select('customer_name, customer_email, bike_type, repair_category, city, view_token, created_at')
          .eq('id', requestId).maybeSingle()
      : { data: null }
    if (!job) {
      await admin.from('v2_lifecycle_messages').update({ status: 'failed' }).eq('id', message.id)
      result.failed += 1
      continue
    }

    // Uppföljning: hoppa över om kunden hunnit skapa ett nyare ärende själv
    // (samma e-post, skapat efter att första påminnelsen skickades).
    let newerRequest: Date | null = null
    if (isFollowup) {
      const seasonYear = Number(meta.season_year ?? 0)
      const originalKey = reminderDedupeKey(contact.id, message.kind as RetentionMessageKind, seasonYear)
      const { data: original } = await admin.from('v2_lifecycle_messages')
        .select('sent_at').eq('dedupe_key', originalKey).eq('status', 'sent').maybeSingle()
      if (!original?.sent_at) {
        // Originalet gick aldrig iväg — uppföljningen är meningslös.
        await admin.from('v2_lifecycle_messages').update({ status: 'skipped' }).eq('id', message.id)
        result.skipped += 1
        continue
      }
      const { data: newerRows } = await admin.from('bike_repair_requests')
        .select('created_at')
        .ilike('customer_email', job.customer_email.replace(/[%_\\]/g, (m: string) => `\\${m}`))
        .gt('created_at', original.sent_at)
        .limit(1)
      if (newerRows && newerRows.length > 0) newerRequest = new Date(newerRows[0].created_at as string)
    }

    const disposition = messageDisposition(contact, {
      kind: message.kind as RetentionMessageKind,
      channel: message.channel as string,
      scheduled_for: new Date(message.scheduled_for as string),
      is_followup: isFollowup,
    }, now, { newerRequestSince: newerRequest })

    if (disposition.action === 'suppress') {
      await admin.from('v2_lifecycle_messages').update({ status: 'suppressed' }).eq('id', message.id)
      result.suppressed += 1
      continue
    }
    if (disposition.action === 'skip') {
      await admin.from('v2_lifecycle_messages').update({ status: 'skipped' }).eq('id', message.id)
      result.skipped += 1
      continue
    }
    if (disposition.action === 'reschedule') {
      await admin.from('v2_lifecycle_messages')
        .update({ scheduled_for: disposition.at.toISOString() }).eq('id', message.id)
      continue
    }

    const email = buildSeasonalReminderEmail({
      customerName: job.customer_name,
      city: job.city,
      bikeType: job.bike_type,
      repairCategory: job.repair_category,
      prefillUrl: buildPrefillWizardUrl({
        citySlug: citySlugFromName(job.city),
        bikeType: job.bike_type,
        repairCategory: 'Service / genomgång',
      }),
      tokenUrl: buildTokenPageUrl(job.view_token),
      unsubscribeUrl: buildUnsubscribeUrl(contact.unsubscribe_token),
      followup: isFollowup,
    })

    try {
      if (!dryRun) {
        await sendRetentionEmail(supabaseUrl, serviceRoleKey, {
          to: job.customer_email,
          subject: email.subject,
          html: email.html,
        })
      }
      const sentAt = new Date().toISOString()
      await admin.from('v2_lifecycle_messages')
        .update({ status: 'sent', sent_at: sentAt }).eq('id', message.id)
      await admin.from('v2_retention_contacts')
        .update({ last_contacted_at: sentAt, updated_at: sentAt }).eq('id', contact.id)
      await logNotificationEvent(admin, {
        channel: 'email',
        provider: 'resend',
        recipient: job.customer_email,
        idempotencyKey: String(message.dedupe_key),
        status: dryRun ? 'skipped' : 'sent',
        payload: { kind: message.kind, season_year: meta.season_year, dry_run: dryRun },
        error: dryRun ? 'dry_run' : null,
      })

      // Max EN uppföljning: schemalägg när originalet gått iväg.
      const followupDays = Number(meta.followup_days ?? 0)
      if (!isFollowup && followupDays > 0 && !dryRun) {
        const followupKey = `${message.dedupe_key}:followup`
        const { error: followupError } = await admin.from('v2_lifecycle_messages').insert({
          contact_id: contact.id,
          kind: message.kind,
          channel: 'email',
          status: 'scheduled',
          scheduled_for: new Date(Date.now() + followupDays * 24 * 60 * 60 * 1000).toISOString(),
          dedupe_key: followupKey,
          meta,
        })
        if (followupError && (followupError as { code?: string }).code !== '23505') {
          console.error('followup insert failed', followupError.message)
        }
      }

      result.sent += 1
      await emitDomainEvent(admin, {
        eventName: 'retention.message_sent',
        actorType: 'system',
        requestId,
        payload: { kind: message.kind, channel: message.channel, lane: 'customer' },
      })
    } catch (sendError) {
      console.error('retention send failed', sendError)
      await admin.from('v2_lifecycle_messages').update({ status: 'failed' }).eq('id', message.id)
      result.failed += 1
    }
  }

  return result
}

// ===========================================================================
// VERKSTADS-LANEN — 6 cadences (alla bakom masterflaggan + egen underflagga)
// ===========================================================================

interface WorkshopRow {
  id: string
  company_name: string
  email: string | null
  phone: string | null
  city: string
  created_at: string
  bio_short: string | null
  description: string | null
  logo_url: string | null
  areas_served: string[] | null
  services: string[] | null
  website: string | null
}

interface WorkshopContactRow {
  id: string
  workshop_id: string | null
  consent_basis: 'transactional' | 'legitimate_interest' | 'marketing_consent'
  unsubscribed_at: string | null
  unsubscribe_token: string
  lifecycle_stage: string
}

interface PrefsRow {
  workshop_id: string
  digest_enabled: boolean
  seasonal_enabled: boolean
  performance_enabled: boolean
  profile_nudge_enabled: boolean
  review_notifications_enabled: boolean
  sms_enabled: boolean
}

const DEFAULT_PREFS: Omit<PrefsRow, 'workshop_id'> = {
  digest_enabled: true,
  seasonal_enabled: true,
  performance_enabled: true,
  profile_nudge_enabled: true,
  review_notifications_enabled: true,
  sms_enabled: false,
}

interface MessageInsert {
  contact_id: string
  kind: string
  channel: 'email' | 'sms'
  status: 'scheduled' | 'skipped'
  scheduled_for: string
  dedupe_key: string
  meta: Record<string, unknown>
}

const unsubscribeUrlFor = (supabaseUrl: string, token: string) =>
  `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/v2-retention-unsubscribe?token=${encodeURIComponent(token)}`

const templateCtx = (supabaseUrl: string, workshop: WorkshopRow, contact: WorkshopContactRow): TemplateContext => ({
  companyName: workshop.company_name,
  city: workshop.city,
  unsubscribeUrl: unsubscribeUrlFor(supabaseUrl, contact.unsubscribe_token),
})

/** Planera meddelanden idempotent: dedupe_key är unik, dubbletter ignoreras. */
async function scheduleMessages(admin: SupabaseClient, rows: MessageInsert[]): Promise<number> {
  if (rows.length === 0) return 0
  const { data, error } = await admin
    .from('v2_lifecycle_messages')
    .upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true })
    .select('id')
  if (error) {
    console.error('scheduleMessages failed', error.message)
    return 0
  }
  return data?.length ?? 0
}

async function runWorkshopLane(
  admin: SupabaseClient,
  flags: Awaited<ReturnType<typeof getV2Flags>>,
  supabaseUrl: string,
  serviceRoleKey: string,
  now: Date,
): Promise<LaneResult> {
  const result = emptyLane()
  const kindEnabled = (kind: keyof typeof RETENTION_KIND_FLAGS) => isFlagOn(flags, RETENTION_KIND_FLAGS[kind])
  const nowIso = now.toISOString()

  // --- Ladda verkstäder, kontakter, preferenser, aktivitet ----------------
  const { data: workshops } = await admin
    .from('workshops')
    .select('id, company_name, email, phone, city, created_at, bio_short, description, logo_url, areas_served, services, website')
    .eq('approved', true)
  const workshopList = (workshops ?? []) as WorkshopRow[]
  if (workshopList.length === 0) return result

  // Kontaktregister: skapa saknade rader (idempotent).
  await admin.from('v2_retention_contacts').upsert(
    workshopList.map((w) => ({
      subject_type: 'workshop',
      subject_key: w.id,
      workshop_id: w.id,
      consent_basis: 'legitimate_interest',
      lifecycle_stage: 'new',
    })),
    { onConflict: 'subject_type,subject_key', ignoreDuplicates: true },
  )
  const { data: contacts } = await admin
    .from('v2_retention_contacts')
    .select('id, workshop_id, consent_basis, unsubscribed_at, unsubscribe_token, lifecycle_stage')
    .eq('subject_type', 'workshop')
  const contactByWorkshop = new Map<string, WorkshopContactRow>()
  for (const c of (contacts ?? []) as WorkshopContactRow[]) {
    if (c.workshop_id) contactByWorkshop.set(c.workshop_id, c)
  }

  const { data: prefsRows } = await admin.from('v2_workshop_notification_prefs').select('*')
  const prefsByWorkshop = new Map<string, PrefsRow>()
  for (const p of (prefsRows ?? []) as PrefsRow[]) prefsByWorkshop.set(p.workshop_id, p)
  const prefsFor = (workshopId: string): PrefsRow =>
    prefsByWorkshop.get(workshopId) ?? { workshop_id: workshopId, ...DEFAULT_PREFS }

  // Offeraktivitet per verkstad (volymerna är små; hämta och reducera i minnet).
  const { data: responses } = await admin
    .from('workshop_responses')
    .select('workshop_id, status, created_at')
    .in('status', ['sent', 'won', 'lost'])
    .order('created_at', { ascending: false })
    .limit(10000)
  const lastQuoteAtByWorkshop = new Map<string, Date>()
  for (const r of (responses ?? []) as Array<{ workshop_id: string; status: string; created_at: string }>) {
    if (!lastQuoteAtByWorkshop.has(r.workshop_id)) {
      lastQuoteAtByWorkshop.set(r.workshop_id, new Date(r.created_at))
    }
  }

  // Frekvenstak: skickade retention-meddelanden senaste 7 dagarna per kontakt.
  const { data: sentRecently } = await admin
    .from('v2_lifecycle_messages')
    .select('contact_id')
    .eq('status', 'sent')
    .gte('sent_at', new Date(now.getTime() - 7 * DAY_MS).toISOString())
  const sentLast7dByContact = new Map<string, number>()
  for (const row of (sentRecently ?? []) as Array<{ contact_id: string }>) {
    sentLast7dByContact.set(row.contact_id, (sentLast7dByContact.get(row.contact_id) ?? 0) + 1)
  }

  // --- 1. Dormant-detektering + återaktivering ----------------------------
  if (kindEnabled('reactivation')) {
    const rows: MessageInsert[] = []
    for (const workshop of workshopList) {
      const contact = contactByWorkshop.get(workshop.id)
      if (!contact || isSuppressed({ unsubscribedAt: contact.unsubscribed_at, consentBasis: contact.consent_basis })) continue
      const activity = {
        approved: true,
        createdAt: new Date(workshop.created_at),
        lastQuoteAt: lastQuoteAtByWorkshop.get(workshop.id) ?? null,
        now,
      }
      const stage = computeLifecycleStage(activity)
      if (stage !== contact.lifecycle_stage && stage !== 'new') {
        await admin.from('v2_retention_contacts').update({ lifecycle_stage: stage, updated_at: nowIso }).eq('id', contact.id)
      }
      if (!isDormant(activity)) continue
      const dormantSince = new Date(Math.max(
        (activity.lastQuoteAt ?? activity.createdAt).getTime(),
        now.getTime() - RETENTION_CONFIG.dormantAfterDays * DAY_MS,
      ))
      const cycle = dormancyCycleKey(activity.lastQuoteAt, activity.createdAt)
      const idleDays = Math.floor((now.getTime() - (activity.lastQuoteAt ?? activity.createdAt).getTime()) / DAY_MS)
      const ctx = templateCtx(supabaseUrl, workshop, contact)
      for (const { step, sendAt } of reactivationSchedule(dormantSince, now)) {
        const template = buildReactivationEmail(step, ctx, idleDays)
        rows.push({
          contact_id: contact.id,
          kind: 'reactivation',
          channel: 'email',
          status: 'scheduled',
          scheduled_for: sendAt.toISOString(),
          dedupe_key: retentionDedupeKeys.reactivation(workshop.id, cycle, step),
          meta: { workshop_id: workshop.id, step, subject: template.subject, html: template.html },
        })
      }
    }
    result.scheduled += await scheduleMessages(admin, rows)
  }

  // --- 2. Veckodigest (måndagar, skip-empty) -------------------------------
  if (kindEnabled('opportunity_digest') && isDigestDay(now)) {
    const weekKey = isoWeekKey(now)
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString()
    const { data: openRequests } = await admin
      .from('bike_repair_requests')
      .select('id, repair_category, bike_type, area, city, created_at')
      .eq('admin_status', 'approved')
      .in('status', ['new', 'has_offers'])
      .gte('created_at', sevenDaysAgo)
    const byCity = new Map<string, DigestRequestItem[]>()
    for (const r of (openRequests ?? []) as Array<DigestRequestItem & { city: string }>) {
      const list = byCity.get(r.city) ?? []
      list.push(r)
      byCity.set(r.city, list)
    }
    const rows: MessageInsert[] = []
    for (const workshop of workshopList) {
      const contact = contactByWorkshop.get(workshop.id)
      if (!contact || !prefsFor(workshop.id).digest_enabled) continue
      if (isSuppressed({ unsubscribedAt: contact.unsubscribed_at, consentBasis: contact.consent_basis })) continue
      const items = byCity.get(workshop.city) ?? []
      const dedupeKey = retentionDedupeKeys.digest(workshop.id, weekKey)
      if (!shouldSendDigest(items)) {
        // Skip-empty: logga som skipped för spårbarhet, inget mejl skapas.
        rows.push({
          contact_id: contact.id,
          kind: 'opportunity_digest',
          channel: 'email',
          status: 'skipped',
          scheduled_for: nowIso,
          dedupe_key: dedupeKey,
          meta: { workshop_id: workshop.id, week: weekKey, reason: 'no_relevant_demand' },
        })
        continue
      }
      const template = buildDigestEmail(templateCtx(supabaseUrl, workshop, contact), summarizeDigest(items), items, weekKey)
      rows.push({
        contact_id: contact.id,
        kind: 'opportunity_digest',
        channel: 'email',
        status: 'scheduled',
        scheduled_for: nowIso,
        dedupe_key: dedupeKey,
        meta: { workshop_id: workshop.id, week: weekKey, count: items.length, subject: template.subject, html: template.html },
      })
    }
    result.scheduled += await scheduleMessages(admin, rows)
  }

  // --- 3. Säsong: vår-reaktivering (feb–mars) ------------------------------
  if (kindEnabled('seasonal_reminder') && isSeasonalWindow(now)) {
    const season = seasonalKey(now)
    const rows: MessageInsert[] = []
    for (const workshop of workshopList) {
      const contact = contactByWorkshop.get(workshop.id)
      if (!contact || !prefsFor(workshop.id).seasonal_enabled) continue
      if (isSuppressed({ unsubscribedAt: contact.unsubscribed_at, consentBasis: contact.consent_basis })) continue
      const lastQuoteAt = lastQuoteAtByWorkshop.get(workshop.id) ?? null
      if (!isSeasonalTarget(lastQuoteAt, now)) continue
      const template = buildSeasonalEmail(templateCtx(supabaseUrl, workshop, contact))
      rows.push({
        contact_id: contact.id,
        kind: 'seasonal_reminder',
        channel: 'email',
        status: 'scheduled',
        scheduled_for: nowIso,
        dedupe_key: retentionDedupeKeys.seasonal(workshop.id, season),
        meta: { workshop_id: workshop.id, season, subject: template.subject, html: template.html },
      })
    }
    result.scheduled += await scheduleMessages(admin, rows)
  }

  // --- 4. Månatlig statistik (1:a varje månad, skip-empty) -----------------
  if (kindEnabled('performance_summary') && isPerformanceDay(now)) {
    const monthKey = previousMonthKey(now)
    const { year, month } = stockholmParts(now)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const monthStart = new Date(Date.UTC(prevYear, prevMonth - 1, 1)).toISOString()
    const monthEnd = new Date(Date.UTC(year, month - 1, 1)).toISOString()

    const { data: monthResponses } = await admin
      .from('workshop_responses')
      .select('workshop_id, status')
      .in('status', ['sent', 'won', 'lost'])
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd)
    const { data: monthOutcomes } = await admin
      .from('v2_job_outcomes')
      .select('workshop_id, final_price_sek')
      .in('state', ['confirmed_by_customer', 'completed'])
      .gte('customer_confirmed_at', monthStart)
      .lt('customer_confirmed_at', monthEnd)
    const { data: reviewStats } = await admin
      .from('v2_workshop_review_stats')
      .select('workshop_id, published_count, avg_rating')
    const statsByWorkshop = new Map<string, { published_count: number; avg_rating: number | null }>()
    for (const s of (reviewStats ?? []) as Array<{ workshop_id: string; published_count: number; avg_rating: number | null }>) {
      statsByWorkshop.set(s.workshop_id, s)
    }

    const quotesByWorkshop = new Map<string, { quotes: number; wins: number }>()
    for (const r of (monthResponses ?? []) as Array<{ workshop_id: string; status: string }>) {
      const entry = quotesByWorkshop.get(r.workshop_id) ?? { quotes: 0, wins: 0 }
      entry.quotes += 1
      if (r.status === 'won') entry.wins += 1
      quotesByWorkshop.set(r.workshop_id, entry)
    }
    const revenueByWorkshop = new Map<string, number>()
    let hasOutcomeData = false
    for (const o of (monthOutcomes ?? []) as Array<{ workshop_id: string; final_price_sek: number | null }>) {
      hasOutcomeData = true
      if (o.final_price_sek !== null) {
        revenueByWorkshop.set(o.workshop_id, (revenueByWorkshop.get(o.workshop_id) ?? 0) + o.final_price_sek)
      }
    }

    const rows: MessageInsert[] = []
    for (const workshop of workshopList) {
      const contact = contactByWorkshop.get(workshop.id)
      if (!contact || !prefsFor(workshop.id).performance_enabled) continue
      if (isSuppressed({ unsubscribedAt: contact.unsubscribed_at, consentBasis: contact.consent_basis })) continue
      const counts = quotesByWorkshop.get(workshop.id) ?? { quotes: 0, wins: 0 }
      const agg = statsByWorkshop.get(workshop.id)
      const stats: PerformanceStats = {
        quotesSent: counts.quotes,
        wins: counts.wins,
        revenueSek: hasOutcomeData ? (revenueByWorkshop.get(workshop.id) ?? 0) : null,
        avgRating: agg?.avg_rating ?? null,
        publishedReviewCount: agg?.published_count ?? 0,
      }
      const dedupeKey = retentionDedupeKeys.performance(workshop.id, monthKey)
      if (!shouldSendPerformanceSummary(stats)) {
        rows.push({
          contact_id: contact.id,
          kind: 'performance_summary',
          channel: 'email',
          status: 'skipped',
          scheduled_for: nowIso,
          dedupe_key: dedupeKey,
          meta: { workshop_id: workshop.id, month: monthKey, reason: 'no_activity' },
        })
        continue
      }
      const template = buildPerformanceEmail(templateCtx(supabaseUrl, workshop, contact), monthKey, stats)
      rows.push({
        contact_id: contact.id,
        kind: 'performance_summary',
        channel: 'email',
        status: 'scheduled',
        scheduled_for: nowIso,
        dedupe_key: dedupeKey,
        meta: { workshop_id: workshop.id, month: monthKey, stats, subject: template.subject, html: template.html },
      })
    }
    result.scheduled += await scheduleMessages(admin, rows)
  }

  // --- 5. Profilkompletthets-knuff (max 3, min 14 dagar emellan) -----------
  if (kindEnabled('profile_nudge')) {
    const { data: priorNudges } = await admin
      .from('v2_lifecycle_messages')
      .select('contact_id, sent_at')
      .eq('kind', 'profile_nudge')
      .eq('status', 'sent')
    const nudgeStatsByContact = new Map<string, { count: number; lastSentAt: Date | null }>()
    for (const n of (priorNudges ?? []) as Array<{ contact_id: string; sent_at: string | null }>) {
      const entry = nudgeStatsByContact.get(n.contact_id) ?? { count: 0, lastSentAt: null }
      entry.count += 1
      const sentAt = n.sent_at ? new Date(n.sent_at) : null
      if (sentAt && (!entry.lastSentAt || sentAt > entry.lastSentAt)) entry.lastSentAt = sentAt
      nudgeStatsByContact.set(n.contact_id, entry)
    }

    const rows: MessageInsert[] = []
    for (const workshop of workshopList) {
      const contact = contactByWorkshop.get(workshop.id)
      if (!contact || !prefsFor(workshop.id).profile_nudge_enabled) continue
      if (isSuppressed({ unsubscribedAt: contact.unsubscribed_at, consentBasis: contact.consent_basis })) continue
      const completeness = computeProfileCompleteness(workshop)
      if (!shouldSendProfileNudge(completeness)) continue
      const prior = nudgeStatsByContact.get(contact.id) ?? { count: 0, lastSentAt: null }
      if (prior.count >= RETENTION_CONFIG.profileNudgeMaxCount) continue
      if (prior.lastSentAt && now.getTime() - prior.lastSentAt.getTime() < RETENTION_CONFIG.profileNudgeIntervalDays * DAY_MS) continue
      const template = buildProfileNudgeEmail(templateCtx(supabaseUrl, workshop, contact), completeness)
      rows.push({
        contact_id: contact.id,
        kind: 'profile_nudge',
        channel: 'email',
        status: 'scheduled',
        scheduled_for: nowIso,
        dedupe_key: retentionDedupeKeys.profileNudge(workshop.id, prior.count + 1),
        meta: { workshop_id: workshop.id, ordinal: prior.count + 1, percent: completeness.percent, subject: template.subject, html: template.html },
      })
    }
    result.scheduled += await scheduleMessages(admin, rows)
  }

  // --- 6. Review/outcome-notiser till verkstäder (läser S3:s tabeller) -----
  if (kindEnabled('workshop_notification')) {
    const since = new Date(now.getTime() - 26 * 3_600_000).toISOString()
    const rows: MessageInsert[] = []

    const { data: newReviews } = await admin
      .from('v2_reviews')
      .select('id, workshop_id, rating, body')
      .eq('state', 'published')
      .gte('updated_at', since)
    for (const review of (newReviews ?? []) as Array<{ id: string; workshop_id: string; rating: number; body: string | null }>) {
      const workshop = workshopList.find((w) => w.id === review.workshop_id)
      const contact = contactByWorkshop.get(review.workshop_id)
      if (!workshop || !contact || !prefsFor(review.workshop_id).review_notifications_enabled) continue
      if (isSuppressed({ unsubscribedAt: contact.unsubscribed_at, consentBasis: contact.consent_basis })) continue
      const template = buildReviewNotificationEmail(templateCtx(supabaseUrl, workshop, contact), review.rating, review.body)
      rows.push({
        contact_id: contact.id,
        kind: 'workshop_notification',
        channel: 'email',
        status: 'scheduled',
        scheduled_for: nowIso,
        dedupe_key: retentionDedupeKeys.reviewNotification(review.id),
        meta: { workshop_id: workshop.id, review_id: review.id, subject: template.subject, html: template.html },
      })
    }

    const { data: confirmedOutcomes } = await admin
      .from('v2_job_outcomes')
      .select('id, workshop_id, state, final_price_sek')
      .in('state', ['confirmed_by_customer', 'completed'])
      .gte('customer_confirmed_at', since)
    for (const outcome of (confirmedOutcomes ?? []) as Array<{ id: string; workshop_id: string; state: 'confirmed_by_customer' | 'completed'; final_price_sek: number | null }>) {
      const workshop = workshopList.find((w) => w.id === outcome.workshop_id)
      const contact = contactByWorkshop.get(outcome.workshop_id)
      if (!workshop || !contact || !prefsFor(outcome.workshop_id).review_notifications_enabled) continue
      if (isSuppressed({ unsubscribedAt: contact.unsubscribed_at, consentBasis: contact.consent_basis })) continue
      const template = buildOutcomeNotificationEmail(templateCtx(supabaseUrl, workshop, contact), outcome.state, outcome.final_price_sek)
      rows.push({
        contact_id: contact.id,
        kind: 'workshop_notification',
        channel: 'email',
        status: 'scheduled',
        scheduled_for: nowIso,
        dedupe_key: retentionDedupeKeys.outcomeNotification(outcome.id, outcome.state),
        meta: { workshop_id: workshop.id, outcome_id: outcome.id, subject: template.subject, html: template.html },
      })
    }

    result.scheduled += await scheduleMessages(admin, rows)
  }

  // --- Sändningsloop -------------------------------------------------------
  // Claim-först (conditional update) → at-most-once även om två cron-instanser
  // överlappar eller en retry körs efter krasch mitt i loopen.
  // Lan-scoping: verkstadens meddelanden har dedupe_key 'v2ret:…' (kundens har
  // 'v2:…') så den här loopen rör aldrig kundlanens rader.
  const { data: due } = await admin
    .from('v2_lifecycle_messages')
    .select('id, contact_id, kind, channel, meta')
    .eq('status', 'scheduled')
    .lte('scheduled_for', nowIso)
    .like('dedupe_key', 'v2ret:%')
    .order('scheduled_for', { ascending: true })
    .limit(200)

  const workshopById = new Map(workshopList.map((w) => [w.id, w]))
  const contactById = new Map<string, WorkshopContactRow>()
  for (const c of contactByWorkshop.values()) contactById.set(c.id, c)

  for (const message of (due ?? []) as Array<{
    id: string
    contact_id: string
    kind: string
    channel: 'email' | 'sms'
    meta: Record<string, unknown>
  }>) {
    const contact = contactById.get(message.contact_id)
    const meta = message.meta ?? {}
    const workshop = typeof meta.workshop_id === 'string' ? workshopById.get(meta.workshop_id) : undefined

    // Suppression-koll vid sändningstillfället (unsubscribe kan ha hunnit ske).
    if (!contact || isSuppressed({ unsubscribedAt: contact.unsubscribed_at, consentBasis: contact.consent_basis })) {
      await admin.from('v2_lifecycle_messages')
        .update({ status: 'suppressed', updated_at: nowIso })
        .eq('id', message.id).eq('status', 'scheduled')
      result.suppressed += 1
      continue
    }

    // Frekvenstak: max N meddelanden per kontakt och rullande 7 dygn.
    const sentLast7d = sentLast7dByContact.get(message.contact_id) ?? 0
    if (!underFrequencyCap(sentLast7d)) {
      await admin.from('v2_lifecycle_messages')
        .update({ status: 'skipped', updated_at: nowIso, meta: { ...meta, skip_reason: 'frequency_cap' } })
        .eq('id', message.id).eq('status', 'scheduled')
      result.suppressed += 1
      continue
    }

    // Tysta timmar för SMS (21–08): skjut upp till 08:00 i stället för att skicka.
    const deferredTo = deferForQuietHours(now, message.channel)
    if (deferredTo) {
      await admin.from('v2_lifecycle_messages')
        .update({ scheduled_for: deferredTo.toISOString(), updated_at: nowIso })
        .eq('id', message.id).eq('status', 'scheduled')
      continue
    }

    // Claim: om raden redan plockats av en parallell körning hoppar vi över.
    const { data: claimed } = await admin.from('v2_lifecycle_messages')
      .update({ status: 'sent', sent_at: nowIso, updated_at: nowIso })
      .eq('id', message.id).eq('status', 'scheduled')
      .select('id')
    if (!claimed || claimed.length === 0) continue

    let sendError: string | null = null
    if (message.channel === 'sms') {
      if (!workshop?.phone || !prefsFor(workshop.id).sms_enabled) {
        sendError = 'sms_not_enabled'
      } else {
        const smsResult = await logSmsAttempt(admin, {
          to: workshop.phone,
          message: String(meta.message ?? meta.subject ?? ''),
          idempotencyKey: `v2ret-sms:${message.id}`,
          reason: message.kind,
        })
        if (smsResult.status === 'failed') sendError = 'sms_provider_failed'
        if (smsResult.status === 'skipped') sendError = 'no_sms_provider_configured'
      }
    } else {
      if (!workshop?.email) {
        sendError = 'missing_recipient_email'
      } else {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              to: workshop.email,
              subject: String(meta.subject ?? 'Cykelhjälpen'),
              html: String(meta.html ?? ''),
            }),
          })
          if (!response.ok) sendError = `email_http_${response.status}`
        } catch (error) {
          sendError = error instanceof Error ? error.message : 'email_send_failed'
        }
      }
    }

    if (sendError) {
      await admin.from('v2_lifecycle_messages')
        .update({ status: 'failed', sent_at: null, updated_at: nowIso, meta: { ...meta, error: sendError } })
        .eq('id', message.id)
      result.failed += 1
      continue
    }

    sentLast7dByContact.set(message.contact_id, (sentLast7dByContact.get(message.contact_id) ?? 0) + 1)
    await admin.from('v2_retention_contacts')
      .update({ last_contacted_at: nowIso, updated_at: nowIso })
      .eq('id', message.contact_id)
    result.sent += 1

    await emitDomainEvent(admin, {
      eventName: 'retention.message_sent',
      actorType: 'system',
      workshopId: typeof meta.workshop_id === 'string' ? meta.workshop_id : null,
      payload: { kind: message.kind, channel: message.channel, lane: 'workshop' },
    })
  }

  return result
}

// ===========================================================================
// ENTRY — en daglig körning, båda lanorna, kombinerat svar
// ===========================================================================

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405)

  const customer = emptyLane()
  const workshop = emptyLane()
  const combined = () => ({
    // Kontrakt §3.7: platta summor + per-lan-detaljer (se filhuvudet).
    sent: customer.sent + workshop.sent,
    suppressed: customer.suppressed + workshop.suppressed,
    failed: customer.failed + workshop.failed,
    customer,
    workshop,
  })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.' }, 500)
    // Endast cron/internt: service-nyckeln krävs (samma mönster som send-transactional-email).
    if (req.headers.get('Authorization') !== `Bearer ${serviceRoleKey}`) {
      return json({ error: 'unauthorized', code: 'unauthorized' }, 401)
    }

    const body = await req.json().catch(() => ({})) as { dry_run?: boolean }
    const dryRun = body.dry_run === true

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const flags = await getV2Flags(admin)

    // Masterflagga AV = no-op för båda lanorna (default OFF tills gaterna är gröna).
    if (!isFlagOn(flags, RETENTION_LIFECYCLE_FLAG)) {
      return json({ ...combined(), disabled: true })
    }

    const now = new Date()

    // Lanerna är oberoende: ett fel i den ena ska inte stoppa den andra.
    try {
      Object.assign(customer, await runCustomerLane(admin, supabaseUrl, serviceRoleKey, now, dryRun))
    } catch (laneError) {
      console.error('v2-retention-cron customer lane', laneError)
      customer.failed += 1
    }
    try {
      Object.assign(workshop, await runWorkshopLane(admin, flags, supabaseUrl, serviceRoleKey, now))
    } catch (laneError) {
      console.error('v2-retention-cron workshop lane', laneError)
      workshop.failed += 1
    }

    return json(dryRun ? { ...combined(), dry_run: true } : combined())
  } catch (error) {
    console.error('v2-retention-cron', error)
    return json({ error: 'intern fel', ...combined() }, 500)
  }
})
