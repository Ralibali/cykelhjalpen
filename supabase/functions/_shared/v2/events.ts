// V2 domain-event emitter (edge side). Contract: docs/v2/CONTRACTS.md §4.
//
// Writes the data-moat table v2_events. Best-effort BY DESIGN: emission is
// gated on flag v2.datamoat.event_collection and never throws — a telemetry
// failure must never break a money path.
//
// PII rule: payloads carry no raw emails/phones/names/tokens (hashes ok).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { isV2ServerEventName, type V2ServerEventName } from './config-schema.ts'
import { v2FlagEnabled } from './flags.ts'

export interface V2EventInput {
  eventName: V2ServerEventName
  actorType?: 'customer' | 'workshop' | 'admin' | 'system' | 'anon'
  actorId?: string | null
  citySlug?: string | null
  requestId?: string | null
  workshopId?: string | null
  responseId?: string | null
  sessionId?: string | null
  payload?: Record<string, unknown>
}

/**
 * Emit a server-side domain event. Returns the row id, or null when the
 * collection flag is off / the insert failed / the event name is unknown.
 */
export async function emitDomainEvent(
  supabase: SupabaseClient,
  input: V2EventInput,
): Promise<number | null> {
  try {
    if (!isV2ServerEventName(input.eventName)) return null

    const collecting = await v2FlagEnabled(supabase, 'v2.datamoat.event_collection')
    if (!collecting) return null

    const { data, error } = await supabase
      .from('v2_events')
      .insert({
        event_name: input.eventName,
        actor_type: input.actorType ?? 'system',
        actor_id: input.actorId ?? null,
        city_slug: input.citySlug ?? null,
        request_id: input.requestId ?? null,
        workshop_id: input.workshopId ?? null,
        response_id: input.responseId ?? null,
        session_id: input.sessionId ?? null,
        payload: input.payload ?? {},
        consent_scope: 'necessary',
      })
      .select('id')
      .single()

    if (error) return null
    return (data?.id as number) ?? null
  } catch {
    return null
  }
}
