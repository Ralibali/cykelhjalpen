// V2 lifecycle automation — delad utskicks- och logghelper (Deno).
//
// Alla automatiska utskick går genom befintlig infrastruktur:
//   e-post → send-transactional-email (Resend), SMS → notifications.ts (46elks/
//   GatewayAPI). Idempotens via notification_events.idempotency_key (I4) —
//   samma nyckel skickar aldrig dubbelt, cron-retry bumping attempts i stället.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { logNotificationEvent, logSmsAttempt } from '../notifications.ts'

export interface LifecycleMailCtx {
  supabaseUrl: string
  serviceRoleKey: string
}

export const escapeLifecycleHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/** Enkel CTA-mall i samma ton som befintliga cykelmejl (vinnarmejl m.fl.). */
export const lifecycleCtaEmail = (opts: {
  heading: string
  bodyHtml: string
  link: string
  cta: string
  footerNote: string
}): string =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">` +
  `<h2>${escapeLifecycleHtml(opts.heading)}</h2>` +
  `<p>${opts.bodyHtml}</p>` +
  `<p><a href="${opts.link}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">${escapeLifecycleHtml(opts.cta)}</a></p>` +
  `<p style="color:#6b7280;font-size:13px">${escapeLifecycleHtml(opts.footerNote)}</p>` +
  `</div>`

/**
 * Idempotent e-post: returnerar 'sent' utan nytt utskick om nyckeln redan
 * loggats som sent. Kastar aldrig — fel loggas i notification_events.
 */
export async function sendLifecycleEmail(
  admin: SupabaseClient,
  ctx: LifecycleMailCtx,
  args: {
    idempotencyKey: string
    to: string | null | undefined
    subject: string
    html: string
    payload?: Record<string, unknown>
  },
): Promise<'sent' | 'failed' | 'skipped'> {
  if (!args.to) return 'skipped'

  const { data: existing } = await admin
    .from('notification_events')
    .select('status')
    .eq('idempotency_key', args.idempotencyKey)
    .maybeSingle()
  if (existing?.status === 'sent') return 'sent'

  let status: 'sent' | 'failed' = 'sent'
  let errText: string | null = null
  try {
    const res = await fetch(`${ctx.supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.serviceRoleKey}`,
      },
      body: JSON.stringify({ to: args.to, subject: args.subject, html: args.html }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      status = 'failed'
      errText = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`
    }
  } catch (error) {
    status = 'failed'
    errText = error instanceof Error ? error.message : 'E-postutskick misslyckades'
  }

  await logNotificationEvent(admin, {
    channel: 'email',
    provider: 'resend',
    recipient: args.to,
    idempotencyKey: args.idempotencyKey,
    status,
    payload: args.payload ?? { subject: args.subject },
    error: errText,
  })
  return status
}

/**
 * Idempotent SMS med quiet hours: anroparen ska ha kontrollerat
 * smsQuietHoursActive() först — här loggas bara faktiska försök.
 */
export async function sendLifecycleSms(
  admin: SupabaseClient,
  args: { to: string; message: string; idempotencyKey: string; reason: string },
): Promise<'sent' | 'failed' | 'skipped'> {
  const result = await logSmsAttempt(admin, args)
  return result.status === 'pending' || result.status === 'retrying' ? 'failed' : result.status
}

/** Finns redan en nudge-rad med denna dedupe-nyckel? */
export async function hasNudge(admin: SupabaseClient, dedupeKey: string): Promise<boolean> {
  const { data } = await admin
    .from('v2_nudge_log')
    .select('id')
    .eq('dedupe_key', dedupeKey)
    .maybeSingle()
  return Boolean(data)
}

/**
 * Skriver en nudge-rad EFTER utskick (unik dedupe_key, konflikt ignoreras —
 * det verkliga dublettskyddet sitter i notification_events.idempotency_key,
 * v2_nudge_log är besluts- och analysloggen).
 */
export async function recordNudge(
  admin: SupabaseClient,
  args: {
    dedupeKey: string
    kind: 'zero_quote' | 'few_quotes' | 'winner_payment' | 'onboarding' | 'dormant_workshop' | 'closing_soon'
    requestId?: string | null
    workshopId?: string | null
    responseId?: string | null
    channel: 'email' | 'sms' | 'in_app'
    sentCount?: number
    meta?: Record<string, unknown>
  },
): Promise<void> {
  const { error } = await admin.from('v2_nudge_log').insert({
    dedupe_key: args.dedupeKey,
    kind: args.kind,
    request_id: args.requestId ?? null,
    workshop_id: args.workshopId ?? null,
    response_id: args.responseId ?? null,
    channel: args.channel,
    sent_count: args.sentCount ?? 0,
    meta: args.meta ?? {},
  })
  if (error && (error as { code?: string }).code !== '23505') {
    console.error('recordNudge failed', args.dedupeKey, error.message)
  }
}
