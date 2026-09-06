// Deno helpers for workshop magic-quote tokens. Edge functions only.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { v2FlagEnabled } from './v2/flags.ts'
import {
  WORKSHOP_MAGIC_QUOTE_FLAG,
  WORKSHOP_QUOTE_TOKEN_ERROR_SV,
  WORKSHOP_QUOTE_TOKEN_TTL_MS,
  generateRawQuoteToken,
  requestIsOpenForQuote,
  sha256Hex,
  tokenExpiresAt,
  validateQuoteToken,
  workshopMagicQuoteEnvOn,
  type WorkshopQuoteTokenFailure,
  type WorkshopQuoteTokenRecord,
} from './workshop-quote-core.ts'

export {
  WORKSHOP_MAGIC_QUOTE_FLAG,
  WORKSHOP_QUOTE_TOKEN_ERROR_SV,
  WORKSHOP_QUOTE_TOKEN_TTL_MS,
  generateRawQuoteToken,
  requestIsOpenForQuote,
  sha256Hex,
  tokenExpiresAt,
  validateQuoteToken,
  type WorkshopQuoteTokenFailure,
  type WorkshopQuoteTokenRecord,
} from './workshop-quote-core.ts'

export async function isWorkshopMagicQuoteEnabled(
  supabase: SupabaseClient,
): Promise<boolean> {
  if (workshopMagicQuoteEnvOn((key) => Deno.env.get(key))) return true
  return v2FlagEnabled(supabase, WORKSHOP_MAGIC_QUOTE_FLAG)
}

export const json = (
  body: unknown,
  status: number,
  headers: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })

export async function lookupQuoteToken(
  admin: SupabaseClient,
  rawToken: string,
): Promise<WorkshopQuoteTokenRecord | null> {
  const token_hash = await sha256Hex(rawToken)
  const { data, error } = await admin
    .from('workshop_quote_tokens')
    .select('token_hash, workshop_id, request_id, expires_at, used_at')
    .eq('token_hash', token_hash)
    .maybeSingle()
  if (error) throw error
  return (data as WorkshopQuoteTokenRecord | null) ?? null
}

export async function resolveQuoteToken(input: {
  admin: SupabaseClient
  rawToken: string
  flagOn: boolean
  now?: Date
  expectedWorkshopId?: string | null
}): Promise<
  | { ok: true; record: WorkshopQuoteTokenRecord }
  | { ok: false; reason: WorkshopQuoteTokenFailure }
> {
  const expectedHash = await sha256Hex(input.rawToken)
  const record = await lookupQuoteToken(input.admin, input.rawToken)
  return validateQuoteToken({
    flagOn: input.flagOn,
    record,
    expectedHash,
    now: input.now,
    expectedWorkshopId: input.expectedWorkshopId,
  })
}

const BOARD_REQUEST_SELECT =
  'id, bike_type, repair_category, description, area, postcode, urgency, can_drop_off, wants_pickup, status, admin_status, created_at, approved_at, customer_language, city'

export type BoardRequestRow = {
  id: string
  bike_type: string
  repair_category: string
  description: string
  area: string | null
  postcode: string | null
  urgency: string | null
  can_drop_off: boolean
  wants_pickup: boolean
  status: string
  admin_status: string
  created_at: string
  approved_at: string | null
  customer_language: string | null
  city: string
}

export async function loadBoardRequest(
  admin: SupabaseClient,
  requestId: string,
): Promise<BoardRequestRow | null> {
  const { data, error } = await admin
    .from('bike_repair_requests')
    .select(BOARD_REQUEST_SELECT)
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw error
  return (data as BoardRequestRow | null) ?? null
}

const storagePath = (value: string) => {
  const marker = '/bike-images/'
  const index = value.indexOf(marker)
  return index === -1 ? value : value.slice(index + marker.length)
}

export async function loadRequestImages(
  admin: SupabaseClient,
  requestId: string,
): Promise<{ id: string; url: string }[]> {
  const { data: imageRows, error } = await admin
    .from('bike_request_images')
    .select('id, image_url')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .limit(4)
  if (error) throw error
  const paths = (imageRows || []).map((row: { image_url: string }) => storagePath(row.image_url))
  if (paths.length === 0) return []

  const { data: signedRows, error: signedError } = await admin.storage
    .from('bike-images')
    .createSignedUrls(paths, 3600)
  if (signedError) throw signedError

  const signedByPath = new Map((signedRows || []).map((row) => [row.path, row.signedUrl]))
  const images: { id: string; url: string }[] = []
  for (const row of imageRows || []) {
    const path = storagePath(row.image_url)
    const url = signedByPath.get(path)
    if (url) images.push({ id: row.id, url })
  }
  return images
}

export function requestAccessReason(request: BoardRequestRow | null): WorkshopQuoteTokenFailure | null {
  if (!request) return 'invalid'
  if (request.admin_status !== 'approved') return 'request_not_approved'
  if (request.status === 'completed' || !requestIsOpenForQuote(request.status)) return 'request_closed'
  return null
}

export async function createQuoteToken(input: {
  admin: SupabaseClient
  workshopId: string
  requestId: string
  createdBy: string
  now?: Date
}): Promise<{ rawToken: string; expiresAt: Date; tokenHash: string }> {
  const now = input.now ?? new Date()
  const expiresAt = tokenExpiresAt(now)
  const rawToken = generateRawQuoteToken()
  const tokenHash = await sha256Hex(rawToken)

  // Latest link wins: retire unused tokens for the same pair so an old SMS
  // cannot keep quoting after admin copies a new one.
  await input.admin
    .from('workshop_quote_tokens')
    .update({ used_at: now.toISOString() })
    .eq('workshop_id', input.workshopId)
    .eq('request_id', input.requestId)
    .is('used_at', null)

  const { error } = await input.admin.from('workshop_quote_tokens').insert({
    token_hash: tokenHash,
    workshop_id: input.workshopId,
    request_id: input.requestId,
    created_by: input.createdBy,
    expires_at: expiresAt.toISOString(),
  })
  if (error) throw error

  return { rawToken, expiresAt, tokenHash }
}

export async function markQuoteTokenUsed(
  admin: SupabaseClient,
  tokenHash: string,
  usedAt = new Date(),
): Promise<void> {
  const { error } = await admin
    .from('workshop_quote_tokens')
    .update({ used_at: usedAt.toISOString() })
    .eq('token_hash', tokenHash)
    .is('used_at', null)
  if (error) throw error
}
