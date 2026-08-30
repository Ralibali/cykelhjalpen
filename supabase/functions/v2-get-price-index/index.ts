// v2-get-price-index — public, sample-gated Cykelprisindex read (S5).
// Contract: docs/v2/CONTRACTS.md §3.5.
//
// Thin public wrapper over the SECURITY DEFINER RPC public.v2_get_price_index.
// The SAMPLE GATE LIVES IN SQL (migration 20260830_v2_contracts_05): real
// stats only when flag v2.prisindex.public_display is on AND the city has
// price_index_public = true AND confidence >= 'low' (n >= 3); otherwise the
// RPC returns v2_guide_prices rows labelled kind='riktpris'. This function
// adds no data of its own — it just validates input and relays the payload.
//
// Customers are account-less: this runs with the anon key, exactly like the
// direct RPC grant (anon, authenticated). No PII is ever returned.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const BodySchema = z.object({
  city_slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  repair_category: z.string().min(1).max(120).nullish(),
})

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  })

  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.', code: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  if (!supabaseUrl || !anonKey) return json({ error: 'Backend configuration is missing', code: 'config_missing' }, 500)

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return json({ error: 'Ogiltig förfrågan.', code: 'bad_request' }, 400)

    // Anon client on purpose: proves the public grant path and inherits the
    // SQL-side sample gate verbatim.
    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
    const { data, error } = await anon.rpc('v2_get_price_index', {
      p_city_slug: parsed.data.city_slug,
      p_category: parsed.data.repair_category ?? null,
    })
    if (error) throw error

    const payload = (data ?? { rows: [], sample_gated: true }) as { rows?: unknown; sample_gated?: boolean }
    return json({
      rows: Array.isArray(payload.rows) ? payload.rows : [],
      sample_gated: payload.sample_gated !== false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('v2-get-price-index', message)
    return json({ error: message, code: 'price_index_failed' }, 500)
  }
})
