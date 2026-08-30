// v2-retention-cron — daglig kundretentionsloop (S8).
// Kontrakt: docs/v2/CONTRACTS.md §3.7. Svar: { sent, suppressed, failed }.
//
// Två faser per körning:
//  1. SCHEDULE — avslutade jobb (v1 status='completed' ELLER v2_job_outcomes
//     completed/confirmed) mappas via e-post-hash mot kontakter med
//     marketing_consent. Per kontakt + säsong schemaläggs exakt ett mail
//     (dedupe-nyckel), drivet av v2_maintenance_reminder_rules.
//  2. SEND — förfallna meddelanden skickas om consent/kvot/tysta timmar
//     tillåter (messageDisposition i _shared/v2/retention.ts). Efter första
//     utskicket schemaläggs max EN uppföljning.
//
// Allt ligger bakom flaggan v2.retention.lifecycle (av = no-op). Avregistrerade
// kontakter får status 'suppressed' och skickas ALDRIG (kontrakt §2.7).
// Schemaläggning: '50 7 * * *' enligt cron-registret i
// 20260830_v2_contracts_06_public_surface.sql (S13 verifierar i prod, I7).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import { logNotificationEvent } from '../_shared/notifications.ts'
import {
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
} from '../_shared/v2/retention.ts'

const MAX_SENDS_PER_RUN = 50
// Jobb äldre än så här kan aldrig bli aktuella (längsta regel + ett år).
const JOB_LOOKBACK_MS = 1000 * 60 * 60 * 24 * 365 * 3

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

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

interface ContactRow extends RetentionContactState {
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

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const result = { sent: 0, suppressed: 0, failed: 0, scheduled: 0, skipped: 0 }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) throw new Error('backend configuration missing')
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const body = await req.json().catch(() => ({})) as { dry_run?: boolean }
    const dryRun = body.dry_run === true

    // Flagga AV = no-op (default OFF tills gate G-T1 är grön).
    if (!await v2FlagEnabled(admin, RETENTION_LIFECYCLE_FLAG)) {
      return json({ ...result, disabled: true })
    }

    const now = new Date()

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

    const contactByKey = new Map((contacts ?? []).map((row) => [row.subject_key as string, row as ContactRow]))
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
    const { data: due, error: dueError } = await admin.from('v2_lifecycle_messages')
      .select('id, contact_id, kind, channel, scheduled_for, dedupe_key, meta')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString())
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
      const contact = contactRow as ContactRow

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
          payload: { kind: message.kind, channel: message.channel },
        })
      } catch (sendError) {
        console.error('retention send failed', sendError)
        await admin.from('v2_lifecycle_messages').update({ status: 'failed' }).eq('id', message.id)
        result.failed += 1
      }
    }

    return json(dryRun ? { ...result, dry_run: true } : result)
  } catch (error) {
    console.error('v2-retention-cron', error)
    return json({ error: 'intern fel', ...result }, 500)
  }
})
