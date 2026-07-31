// Neutralt notifieringslager för Cykelhjälpen.
//
// Alla notifieringsförsök (in-app, e-post, SMS) loggas i tabellen
// `notification_events` med en idempotency-nyckel så att samma händelse
// inte kan skickas två gånger. Ingen riktig extern trafik sker om
// credentials saknas – då loggas försöket som `skipped` med orsak.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type NotificationChannel = 'in_app' | 'email' | 'sms'
export type NotificationStatus = 'pending' | 'sent' | 'skipped' | 'failed' | 'retrying'

export interface SmsProvider {
  name: 'elks' | 'gatewayapi'
  buildRequest(payload: { to: string; message: string; from?: string }): {
    url: string
    method: 'POST'
    headers: Record<string, string>
    body: string | URLSearchParams
  }
}

const toE164 = (raw: string) => {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('0')) return `+46${digits.slice(1)}`
  return digits
}

export const elksProvider = (username: string, password: string): SmsProvider => ({
  name: 'elks',
  buildRequest: ({ to, message, from }) => ({
    url: 'https://api.46elks.com/a1/sms',
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ from: from || 'CykelHjalp', to: toE164(to), message }),
  }),
})

export const gatewayApiProvider = (token: string): SmsProvider => ({
  name: 'gatewayapi',
  buildRequest: ({ to, message, from }) => ({
    url: 'https://gatewayapi.com/rest/mtsms',
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${token}:`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: from || 'CykelHjalp',
      message,
      recipients: [{ msisdn: Number(toE164(to).replace(/[^\d]/g, '')) }],
    }),
  }),
})

/** Väljer SMS-leverantör baserat på tillgängliga secrets. */
export const resolveSmsProvider = (): SmsProvider | null => {
  const gwToken = Deno.env.get('GATEWAYAPI_TOKEN')
  if (gwToken) return gatewayApiProvider(gwToken)
  const elksUser = Deno.env.get('ELKS_API_USERNAME')
  const elksPass = Deno.env.get('ELKS_API_PASSWORD')
  if (elksUser && elksPass) return elksProvider(elksUser, elksPass)
  return null
}

export interface InAppNotification {
  user_id: string
  type: string
  title: string
  message?: string | null
  link?: string | null
}

interface LogArgs {
  channel: NotificationChannel
  provider?: string | null
  recipient: string
  idempotencyKey: string
  status: NotificationStatus
  payload?: Record<string, unknown>
  error?: string | null
}

/**
 * Loggar ett notifieringsförsök i `notification_events`.
 * Idempotency-nyckeln är unik – dubbla insert:s ignoreras och en UPDATE görs istället
 * så att attempts-räknaren stiger.
 */
export async function logNotificationEvent(
  admin: SupabaseClient,
  args: LogArgs,
): Promise<{ inserted: boolean; alreadyExists: boolean }> {
  const nowIso = new Date().toISOString()
  const { error: insertError } = await admin.from('notification_events').insert({
    channel: args.channel,
    provider: args.provider ?? null,
    recipient: args.recipient,
    idempotency_key: args.idempotencyKey,
    status: args.status,
    attempts: args.status === 'pending' ? 0 : 1,
    payload: args.payload ?? {},
    error: args.error ?? null,
    last_attempt_at: args.status === 'pending' ? null : nowIso,
  })
  if (!insertError) return { inserted: true, alreadyExists: false }

  // Unique-violation on idempotency_key – bump attempts and update status.
  if ((insertError as { code?: string }).code === '23505') {
    const { data: existing } = await admin
      .from('notification_events')
      .select('attempts')
      .eq('idempotency_key', args.idempotencyKey)
      .maybeSingle()
    const attempts = ((existing as { attempts?: number } | null)?.attempts ?? 0) + 1
    await admin
      .from('notification_events')
      .update({
        status: args.status,
        attempts,
        error: args.error ?? null,
        last_attempt_at: nowIso,
        provider: args.provider ?? null,
      })
      .eq('idempotency_key', args.idempotencyKey)
    return { inserted: false, alreadyExists: true }
  }

  console.error('logNotificationEvent failed', insertError.message)
  return { inserted: false, alreadyExists: false }
}

/** Skriver in-app-notiser i `notifications` och loggar varje försök i notification_events. */
export async function sendInAppNotifications(
  admin: SupabaseClient,
  rows: InAppNotification[],
  keyPrefix?: string,
): Promise<void> {
  if (rows.length === 0) return
  const prefix = keyPrefix || `inapp:${crypto.randomUUID()}`

  // Idempotens: kontrollera om denna prefix + user_id redan finns.
  const keys = rows.map((row) => `${prefix}:${row.user_id}`)
  const { data: existing } = await admin
    .from('notification_events')
    .select('idempotency_key')
    .in('idempotency_key', keys)
  const seen = new Set((existing || []).map((row) => row.idempotency_key as string))
  const newRows = rows.filter((row) => !seen.has(`${prefix}:${row.user_id}`))

  if (newRows.length === 0) return

  const { error } = await admin.from('notifications').insert(newRows)
  const status: NotificationStatus = error ? 'failed' : 'sent'
  const errText = error ? error.message : null
  if (error) console.error('sendInAppNotifications failed', error.message)

  await Promise.all(newRows.map((row) => logNotificationEvent(admin, {
    channel: 'in_app',
    provider: 'db',
    recipient: row.user_id,
    idempotencyKey: `${prefix}:${row.user_id}`,
    status,
    payload: { type: row.type, title: row.title, message: row.message, link: row.link },
    error: errText,
  })))
}

/** Skickar SMS via konfigurerad leverantör (46elks/GatewayAPI). Kastar vid HTTP-fel. */
const sendSmsViaProvider = async (
  provider: SmsProvider,
  args: { to: string; message: string; from?: string },
): Promise<void> => {
  const req = provider.buildRequest({ to: args.to, message: args.message, from: args.from })
  const res = await fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
    signal: AbortSignal.timeout(10_000),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${provider.name} HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
}

/**
 * Skickar ett SMS via konfigurerad leverantör och loggar utfallet i
 * `notification_events`. Utan leverantör markeras försöket som `skipped`.
 * Idempotent: samma idempotency-nyckel skickar aldrig två gånger.
 */
export async function logSmsAttempt(
  admin: SupabaseClient,
  args: {
    to: string
    message: string
    idempotencyKey: string
    from?: string
    reason?: string
  },
): Promise<{ status: NotificationStatus; provider: string | null }> {
  const provider = resolveSmsProvider()
  if (!provider) {
    await logNotificationEvent(admin, {
      channel: 'sms',
      provider: null,
      recipient: args.to,
      idempotencyKey: args.idempotencyKey,
      status: 'skipped',
      payload: { message: args.message, from: args.from, reason: args.reason },
      error: 'no_sms_provider_configured',
    })
    return { status: 'skipped', provider: null }
  }

  // Idempotens: redan skickat (eller misslyckat loggat) försök med samma nyckel
  // ska inte skicka på nytt. Failed-försök får ett nytt försök via retry-flödet
  // som använder egna nycklar.
  const { data: existing } = await admin
    .from('notification_events')
    .select('id, status')
    .eq('idempotency_key', args.idempotencyKey)
    .maybeSingle()
  if (existing && existing.status === 'sent') {
    return { status: 'sent', provider: provider.name }
  }

  let status: NotificationStatus = 'sent'
  let errText: string | null = null
  try {
    await sendSmsViaProvider(provider, args)
  } catch (error) {
    status = 'failed'
    errText = error instanceof Error ? error.message : 'SMS-utskick misslyckades'
    console.error('SMS send failed', errText)
  }

  await logNotificationEvent(admin, {
    channel: 'sms',
    provider: provider.name,
    recipient: args.to,
    idempotencyKey: args.idempotencyKey,
    status,
    payload: { message: args.message, from: args.from, reason: args.reason },
    error: errText,
  })
  return { status, provider: provider.name }
}

export const notifyAdminsOfPendingRequest = async (
  admin: SupabaseClient,
  ctx: { city: string; repair_category: string; request_id?: string },
): Promise<number> => {
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
  const targets = (admins || []).map((row) => row.id).filter(Boolean)
  const prefix = `bike_request_pending:${ctx.request_id ?? crypto.randomUUID()}`
  await sendInAppNotifications(admin, targets.map((id) => ({
    user_id: id,
    type: 'bike_request_pending',
    title: 'Nytt cykelärende väntar på granskning',
    message: `${ctx.city} · ${ctx.repair_category}`,
    link: '/admin',
  })), prefix)
  return targets.length
}

export const notifyWorkshopsOfApprovedRequest = async (
  admin: SupabaseClient,
  workshops: Array<{ user_id: string | null }>,
  ctx: { city: string; repair_category: string; bike_type: string; request_id?: string },
): Promise<number> => {
  const targets = workshops.map((row) => row.user_id).filter((id): id is string => Boolean(id))
  const prefix = `bike_request_approved:${ctx.request_id ?? crypto.randomUUID()}`
  await sendInAppNotifications(admin, targets.map((id) => ({
    user_id: id,
    type: 'bike_request_approved',
    title: `Nytt cykelärende i ${ctx.city}`,
    message: `${ctx.bike_type} · ${ctx.repair_category}`,
    link: '/dashboard/verkstad/arenden',
  })), prefix)
  return targets.length
}

export const notifyAdminsOfNewWorkshop = async (
  admin: SupabaseClient,
  ctx: { workshop_id: string; company_name: string; city: string; email: string },
): Promise<number> => {
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
  const targets = (admins || []).map((row) => row.id).filter(Boolean)
  const prefix = `workshop_registered:${ctx.workshop_id}`
  await sendInAppNotifications(admin, targets.map((id) => ({
    user_id: id,
    type: 'workshop_registered',
    title: `Ny verkstad registrerad: ${ctx.company_name}`,
    message: `${ctx.city} · ${ctx.email}`,
    link: '/admin/verkstader',
  })), prefix)
  return targets.length
}
