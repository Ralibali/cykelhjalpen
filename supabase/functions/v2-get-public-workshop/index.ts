// V2 S4 — public workshop profile (contract docs/v2/CONTRACTS.md §3.4).
// Public, anon-safe: reads ONLY the whitelisted security_invoker view
// v2_public_workshop_directory (approved + public_profile_opt_in enforced by
// the view + policy from migration 06) plus published reviews without author
// PII (invariant I3/I5). 404 when the flag is off or the workshop is not in
// the scoped directory — never reveals why.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'

const BodySchema = z.object({ slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/) })

// Gate G-D1: at least this many opted-in approved workshops in the city.
const DIRECTORY_MIN_WORKSHOPS = 3

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  })

const notFound = (req: Request) =>
  json(req, 404, { error: 'Verkstaden hittades inte.', code: 'not_found' })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) })
  if (req.method !== 'POST') {
    return json(req, 405, { error: 'Metoden stöds inte.', code: 'method_not_allowed' })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, 500, { error: 'Backend configuration is missing', code: 'config' })
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    // Feature flag (§5): off => behave as if the profile does not exist.
    const flagOn = await v2FlagEnabled(admin, 'v2.directory.public_profiles')
    if (!flagOn) return notFound(req)

    const parsed = BodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return notFound(req)

    // The view only exposes whitelisted columns and opted-in/approved rows.
    const { data: workshop, error: workshopError } = await admin
      .from('v2_public_workshop_directory')
      .select('workshop_id, slug, company_name, city, city_slug, cluster_slug, services, areas_served, logo_url, website, bio_short, created_year, published_review_count, avg_rating, last_review_at')
      .eq('slug', parsed.data.slug)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop) return notFound(req)

    const [{ data: reviewRows, error: reviewError }, { data: cityConfig }, { count: cityWorkshops }] = await Promise.all([
      admin
        .from('v2_reviews')
        .select('rating, body, workshop_response, moderated_at, updated_at')
        .eq('workshop_id', workshop.workshop_id)
        .eq('state', 'published')
        .order('moderated_at', { ascending: false })
        .limit(20),
      workshop.city_slug
        ? admin
            .from('v2_city_configs')
            .select('state, directory_indexable')
            .eq('city_slug', workshop.city_slug)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      workshop.city_slug
        ? admin
            .from('v2_public_workshop_directory')
            .select('workshop_id', { count: 'exact', head: true })
            .eq('city_slug', workshop.city_slug)
        : Promise.resolve({ count: 0, error: null }),
    ])
    if (reviewError) throw reviewError

    // G-D1 indexability: city ACTIVE/LIMITED + admin directory_indexable + >= 3 opted-in workshops.
    const indexable = Boolean(
      cityConfig
        && (cityConfig.state === 'ACTIVE' || cityConfig.state === 'LIMITED')
        && cityConfig.directory_indexable === true
        && (cityWorkshops ?? 0) >= DIRECTORY_MIN_WORKSHOPS,
    )

    const reviews = (reviewRows ?? []).map((row) => ({
      rating: row.rating,
      body: row.body,
      published_at: row.moderated_at ?? row.updated_at,
      workshop_response: row.workshop_response,
    }))

    return json(req, 200, { workshop, reviews, indexable, min_workshops: DIRECTORY_MIN_WORKSHOPS })
  } catch (error) {
    console.error('v2-get-public-workshop failed', error)
    return json(req, 500, { error: 'Något gick fel.', code: 'internal' })
  }
})
