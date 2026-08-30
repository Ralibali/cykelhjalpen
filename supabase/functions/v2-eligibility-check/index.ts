// v2-eligibility-check (workshop) — contract: docs/v2/CONTRACTS.md §3.1.
// Answers "does this workshop see / may it quote on this request?" using the
// pure eligibility engine (_shared/v2/eligibility.ts): city/cluster/areas
// matching, category awareness, activity standing, 3-slot availability.
//
// req  { "workshop_id"?: uuid, "request_id": uuid }  (workshop_id defaults to
//      the caller's own workshop; another id requires admin role)
// res  { "eligible": boolean, "reasons": string[],
//        "matched_via": "city"|"areas"|"cluster"|null,
//        "request_summary": { "city": string, "repair_category": string,
//                             "status": string } }
// errs { "error": string, "code": string }

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'
import { corsFor } from '../_shared/cors.ts'
import { v2FlagEnabledFor } from '../_shared/v2/flags.ts'
import { v2ClusterCityNames } from '../_shared/v2/city-state.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import {
  evaluateWorkshopEligibility,
  V2_MAX_QUOTES_PER_REQUEST,
} from '../_shared/v2/eligibility.ts'

const json = (payload: unknown, status: number, corsHeaders: HeadersInit) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

const fail = (code: string, message: string, status: number, corsHeaders: HeadersInit) =>
  json({ error: message, code }, status, corsHeaders)

serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return fail('method_not_allowed', 'method not allowed', 405, corsHeaders)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return fail('unauthenticated', 'no auth', 401, corsHeaders)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return fail('backend_config', 'backend configuration missing', 500, corsHeaders)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const { data: u, error: userError } = await userClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
    if (userError || !u.user) return fail('unauthenticated', 'unauthenticated', 401, corsHeaders)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    let body: { workshop_id?: string; request_id?: string }
    try {
      body = await req.json()
    } catch {
      return fail('bad_request', 'invalid JSON body', 400, corsHeaders)
    }
    if (!body.request_id) return fail('bad_request', 'request_id is required', 400, corsHeaders)

    // Resolve the workshop: default = caller's own; explicit other id = admin only.
    let workshopId = body.workshop_id ?? null
    if (workshopId) {
      const { data: callerWs } = await admin
        .from('workshops')
        .select('id')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (callerWs?.id !== workshopId) {
        const { data: profile } = await admin
          .from('profiles')
          .select('role')
          .eq('id', u.user.id)
          .maybeSingle()
        if (profile?.role !== 'admin') {
          return fail('forbidden', 'workshop_id does not belong to caller', 403, corsHeaders)
        }
      }
    } else {
      const { data: callerWs, error: wsError } = await admin
        .from('workshops')
        .select('id')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (wsError) throw wsError
      if (!callerWs) return fail('not_found', 'no workshop for caller', 404, corsHeaders)
      workshopId = callerWs.id
    }

    const [{ data: ws, error: workshopError }, { data: request, error: requestError }] = await Promise.all([
      admin
        .from('workshops')
        .select('id, approved, city, areas_served, service_area_mode, cluster_opt_in, services, onboarding_state')
        .eq('id', workshopId)
        .maybeSingle(),
      admin
        .from('bike_repair_requests')
        .select('id, city, repair_category, status, admin_status')
        .eq('id', body.request_id)
        .maybeSingle(),
    ])
    if (workshopError) throw workshopError
    if (requestError) throw requestError
    if (!ws) return fail('not_found', 'workshop not found', 404, corsHeaders)
    if (!request) return fail('not_found', 'request not found', 404, corsHeaders)

    const requestCitySlug = citySlugFromName(request.city)
    const [matchingOn, clusterCityNames, sentQuoteRows] = await Promise.all([
      v2FlagEnabledFor(admin, 'v2.liquidity.areas_served_matching', {
        citySlug: requestCitySlug,
        subjectId: ws.id,
      }),
      v2ClusterCityNames(admin, request.city),
      admin
        .from('workshop_responses')
        .select('id')
        .eq('request_id', request.id)
        .in('status', ['sent', 'won']),
    ])

    const result = evaluateWorkshopEligibility(
      {
        id: ws.id,
        approved: ws.approved,
        city: ws.city,
        areasServed: ws.areas_served,
        serviceAreaMode: ws.service_area_mode,
        clusterOptIn: ws.cluster_opt_in,
        services: ws.services,
        onboardingState: ws.onboarding_state,
      },
      {
        id: request.id,
        city: request.city,
        repairCategory: request.repair_category,
        status: request.status,
        adminStatus: request.admin_status,
        sentQuotes: sentQuoteRows.data?.length ?? 0,
      },
      { areasServedMatchingOn: matchingOn, clusterCityNames },
    )

    return json({
      eligible: result.eligible,
      reasons: result.reasons,
      matched_via: result.matchedVia,
      request_summary: {
        city: request.city,
        repair_category: request.repair_category,
        status: request.status,
      },
      max_quotes_per_request: V2_MAX_QUOTES_PER_REQUEST,
    }, 200, corsHeaders)
  } catch (error) {
    console.error('v2-eligibility-check error', error)
    return fail('internal', error instanceof Error ? error.message : 'unknown', 500, corsHeaders)
  }
})
