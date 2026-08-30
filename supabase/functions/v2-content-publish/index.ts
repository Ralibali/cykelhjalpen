// v2-content-publish (admin) — Cykelhjälpen content engine surface (S7).
// Contract: docs/v2/CONTRACTS.md §3.7.
//
//   req  { "path": string, "host"?: string, "action": "save_draft"|"submit_review"|"publish"|"archive", "fields"?: { …§2.6 columns } }
//   res  { "page_id": uuid, "status": string }
//
// Rules enforced here (NOT in the UI):
// - Editorial gate: publish requires reviewer_name + reviewed_at (+title/body).
// - Scaled-content guard (G-C1): max V2_CONTENT_PUBLISH_MONTHLY_CAP newly
//   published pages per trailing 30 days.
// - Path rules: this surface build only serves /guider/<slug> (ascii slugs).
// - save_draft on a published page edits fields in place (no unpublish);
//   on an archived page it revives to draft.
// - Emits content.published (best-effort, flag-gated inside emitDomainEvent).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import {
  V2_CONTENT_ACTIONS,
  V2_CONTENT_HOST,
  V2_CONTENT_PAGE_TYPES,
  contentPublishBlockers,
  nextContentStatus,
  normalizeGuidePath,
  publishCadenceExceeded,
} from '../_shared/v2/content.ts'

const FieldsSchema = z.object({
  page_type: z.enum(V2_CONTENT_PAGE_TYPES).optional(),
  indexability: z.enum(['index', 'noindex', 'auto']).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(500).nullish(),
  body_markdown: z.string().max(100_000).nullish(),
  data_modules: z.array(z.record(z.unknown())).max(20).optional(),
  author_name: z.string().trim().max(120).nullish(),
  author_title: z.string().trim().max(200).nullish(),
  reviewer_name: z.string().trim().max(120).nullish(),
  reviewer_title: z.string().trim().max(200).nullish(),
  reviewed_at: z.string().datetime({ offset: true }).nullish(),
  city_slugs: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  service_categories: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  related_paths: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
})

const BodySchema = z.object({
  path: z.string().trim().min(1).max(200),
  host: z.string().trim().min(1).max(60).optional(),
  action: z.enum(V2_CONTENT_ACTIONS),
  fields: FieldsSchema.optional(),
})

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function errorResponse(
  message: string,
  code: string,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return jsonResponse({ error: message, code }, status, corsHeaders)
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return errorResponse('Metoden stöds inte.', 'method_not_allowed', 405, corsHeaders)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse('Du behöver logga in', 'unauthorized', 401, corsHeaders)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return errorResponse('Backend configuration is missing', 'config', 500, corsHeaders)
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return errorResponse('Ogiltig förfrågan', 'invalid_request', 400, corsHeaders)
    }
    const { action, fields } = parsed.data
    const host = parsed.data.host || V2_CONTENT_HOST

    // This surface build serves guide pages only: /guider/<ascii-slug>.
    const path = normalizeGuidePath(parsed.data.path)
    if (!path) {
      return errorResponse(
        'Ogiltig sökväg. Använd /guider/<slug> med gemener, siffror och bindestreck.',
        'invalid_path',
        400,
        corsHeaders,
      )
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData.user) {
      return errorResponse('Du behöver logga in igen', 'unauthorized', 401, corsHeaders)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: isAdmin, error: roleError } = await admin.rpc('is_admin', { _user_id: userData.user.id })
    if (roleError) throw roleError
    if (!isAdmin) return errorResponse('Du saknar administratörsbehörighet', 'forbidden', 403, corsHeaders)

    const { data: existing, error: loadError } = await admin
      .from('v2_content_pages')
      .select('*')
      .eq('host', host)
      .eq('path', path)
      .maybeSingle()
    if (loadError) throw loadError

    const currentStatus = (existing?.status ?? 'draft') as Parameters<typeof nextContentStatus>[0]
    const nextStatus = nextContentStatus(currentStatus, action)
    if (!nextStatus) {
      return errorResponse(
        `Åtgärden ${action} är inte tillåten från status ${currentStatus}.`,
        'invalid_transition',
        409,
        corsHeaders,
      )
    }

    const merged = { ...(existing ?? {}), ...(fields ?? {}) }

    if (action === 'submit_review' || action === 'publish') {
      const allBlockers = contentPublishBlockers(merged)
      const blockers = action === 'submit_review'
        ? allBlockers.filter((b) => b === 'missing_title' || b === 'missing_body')
        : allBlockers
      if (blockers.length > 0) {
        return errorResponse(
          action === 'publish'
            ? 'Publicering kräver rubrik, brödtext samt namngiven granskare och granskningsdatum (redaktionell spärr).'
            : 'Granskning kräver minst rubrik och brödtext.',
          'editorial_gate',
          422,
          corsHeaders,
        )
      }
    }

    // Scaled-content guard (G-C1): max N newly published pages per 30 days.
    // Re-publishing a page that is already inside the window is always allowed.
    if (action === 'publish' && existing?.status !== 'published') {
      const windowStart = new Date(Date.now() - 30 * 86_400_000).toISOString()
      const { count, error: countError } = await admin
        .from('v2_content_pages')
        .select('id', { count: 'exact', head: true })
        .eq('host', host)
        .eq('status', 'published')
        .gte('published_at', windowStart)
      if (countError) throw countError
      if (publishCadenceExceeded(count ?? 0)) {
        return errorResponse(
          'Publiceringstaket är nått (max 6 nya sidor per 30 dagar, skydd mot massproducerat innehåll).',
          'publish_rate_limited',
          429,
          corsHeaders,
        )
      }
    }

    const now = new Date().toISOString()
    const row: Record<string, unknown> = {
      host,
      path,
      status: nextStatus,
      updated_at: now,
    }
    if (!existing) {
      row.page_type = fields?.page_type ?? 'guide'
      row.title = fields?.title ?? ''
    }
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) row[key] = value
      }
    }
    if (action === 'publish' && !existing?.published_at) row.published_at = now

    const { data: saved, error: saveError } = await admin
      .from('v2_content_pages')
      .upsert(row, { onConflict: 'host,path' })
      .select('id, status')
      .single()
    if (saveError) throw saveError

    if (action === 'publish') {
      await emitDomainEvent(admin, {
        eventName: 'content.published',
        actorType: 'admin',
        actorId: userData.user.id,
        payload: {
          path,
          page_type: fields?.page_type ?? existing?.page_type ?? 'guide',
          reviewer: merged.reviewer_name ?? null,
        },
      })
    }

    return jsonResponse({ page_id: saved.id, status: saved.status }, 200, corsHeaders)
  } catch (error) {
    console.error('v2-content-publish error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Något gick fel',
      'internal',
      500,
      corsHeaders,
    )
  }
})
