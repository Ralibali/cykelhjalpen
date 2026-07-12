// Neutralt notifieringslager för Cykelhjälpen.
//
// Målet är att kod som behöver skicka ut en notis (in-app, mejl eller SMS)
// gör det via en enda funktion. Idag mejlas allt via `send-transactional-email`
// och SMS går via 46elks, men vi kan senare byta SMS-leverantör (t.ex.
// GatewayAPI) på ett ställe utan att röra affärslogiken.
//
// Denna modul gör INGA riktiga externa anrop – den bygger bara request-payloads
// och överlåter till anroparen att skicka dem. På så sätt kan vi enhetstesta
// utan att träffa några externa system.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type NotificationChannel = 'in_app' | 'email' | 'sms'

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

/** Väljer SMS-leverantör baserat på tillgängliga secrets. Ingen data läcker – väljs bara referens. */
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

/** Skriver in-app-notiser i `notifications`. Aldrig externt. */
export async function sendInAppNotifications(
  admin: SupabaseClient,
  rows: InAppNotification[],
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await admin.from('notifications').insert(rows)
  if (error) console.error('sendInAppNotifications failed', error.message)
}

export const notifyAdminsOfPendingRequest = async (
  admin: SupabaseClient,
  ctx: { city: string; repair_category: string },
): Promise<number> => {
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
  const targets = (admins || []).map((row) => row.id).filter(Boolean)
  await sendInAppNotifications(admin, targets.map((id) => ({
    user_id: id,
    type: 'bike_request_pending',
    title: 'Nytt cykelärende väntar på granskning',
    message: `${ctx.city} · ${ctx.repair_category}`,
    link: '/admin',
  })))
  return targets.length
}

export const notifyWorkshopsOfApprovedRequest = async (
  admin: SupabaseClient,
  workshops: Array<{ user_id: string | null }>,
  ctx: { city: string; repair_category: string; bike_type: string },
): Promise<number> => {
  const targets = workshops.map((row) => row.user_id).filter((id): id is string => Boolean(id))
  await sendInAppNotifications(admin, targets.map((id) => ({
    user_id: id,
    type: 'bike_request_approved',
    title: `Nytt cykelärende i ${ctx.city}`,
    message: `${ctx.bike_type} · ${ctx.repair_category}`,
    link: '/dashboard/verkstad/arenden',
  })))
  return targets.length
}
