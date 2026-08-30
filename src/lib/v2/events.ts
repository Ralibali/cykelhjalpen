// V2 client event tracking (frontend). Contract: docs/v2/CONTRACTS.md §3.6/§4.
// Sends whitelisted client.* events through the hardened v2_emit_client_event
// RPC. Best-effort: never throws, never blocks UI.

import type { SupabaseClient } from '@supabase/supabase-js'
import { V2_CLIENT_EVENT_NAMES, type V2ClientEventName } from './contracts'

type UntypedClient = SupabaseClient<any, 'public', any>

// Lazy default client — the shared client module needs env at import time.
let defaultClient: UntypedClient | null = null
async function db(client?: UntypedClient): Promise<UntypedClient> {
  if (client) return client
  if (!defaultClient) {
    const mod = await import('@/integrations/supabase/client')
    defaultClient = mod.supabase as unknown as UntypedClient
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
  opts: { consentScope?: 'necessary' | 'statistics' | 'marketing'; client?: UntypedClient } = {},
): Promise<boolean> {
  if (!isV2ClientEventName(eventName)) return false
  try {
    const { data, error } = await (await db(opts.client)).rpc('v2_emit_client_event', {
      p_event_name: eventName,
      p_payload: sanitizeV2ClientPayload(payload),
      p_session_id: sessionId(),
      p_consent_scope: opts.consentScope ?? 'necessary',
    })
    if (error) return false
    return (data as { ok?: boolean } | null)?.ok === true
  } catch {
    return false
  }
}
