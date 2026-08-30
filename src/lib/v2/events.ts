// V2 client event tracking (frontend). Contract: docs/v2/CONTRACTS.md §3.6/§4.
// Sends whitelisted client.* events through the hardened v2_emit_client_event
// RPC. Best-effort: never throws, never blocks UI.

import { V2_CLIENT_EVENT_NAMES, type V2ClientEventName } from './contracts'
import type { V2Client } from './flags'
import type { Json } from '@/integrations/supabase/types'

// Lazy default client — the shared client module needs env at import time.
let defaultClient: V2Client | null = null
async function db(client?: V2Client): Promise<V2Client> {
  if (client) return client
  if (!defaultClient) {
    const mod = await import('@/integrations/supabase/client')
    defaultClient = mod.supabase
  }
  return defaultClient
}

const BLOCKED_KEYS = new Set([
  'email',
  'phone',
  'name',
  'customer_name',
  'customer_email',
  'customer_phone',
  'token',
  'view_token',
  'password',
])

/** Strip PII keys before send (the RPC strips again server-side). */
export function sanitizeV2ClientPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload ?? {})) {
    if (BLOCKED_KEYS.has(key)) continue
    clean[key] = value
  }
  return clean
}

export function isV2ClientEventName(name: string): name is V2ClientEventName {
  return (V2_CLIENT_EVENT_NAMES as readonly string[]).includes(name)
}

function sessionId(): string | null {
  try {
    // Same first-party session id as usePageTracking ('_sid').
    return sessionStorage.getItem('_sid')
  } catch {
    return null
  }
}

export async function trackV2ClientEvent(
  eventName: V2ClientEventName,
  payload: Record<string, unknown> = {},
  opts: { consentScope?: 'necessary' | 'statistics' | 'marketing'; client?: V2Client } = {},
): Promise<boolean> {
  if (!isV2ClientEventName(eventName)) return false
  try {
    const { data, error } = await (await db(opts.client)).rpc('v2_emit_client_event', {
      p_event_name: eventName,
      p_payload: sanitizeV2ClientPayload(payload) as Json,
      p_session_id: sessionId(),
      p_consent_scope: opts.consentScope ?? 'necessary',
    })
    if (error) return false
    return typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as { ok?: boolean }).ok === true
      : false
  } catch {
    return false
  }
}
