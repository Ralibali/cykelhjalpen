import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const MAX_BYTES = 5 * 1024 * 1024
const MAX_IMAGES_PER_REQUEST = 4
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const json = (body: unknown, status: number, headers: Record<string, string>) => new Response(
  JSON.stringify(body),
  { status, headers: { ...headers, 'Content-Type': 'application/json' } },
)

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Backend konfiguration saknas.' }, 500, corsHeaders)
  }

  try {
    const form = await req.formData()
    const requestId = String(form.get('request_id') ?? '')
    const viewToken = String(form.get('view_token') ?? '')
    const file = form.get('file')

    if (!UUID_RE.test(requestId) || !UUID_RE.test(viewToken)) {
      return json({ error: 'Ogiltigt ärende.' }, 400, corsHeaders)
    }
    if (!(file instanceof File)) {
      return json({ error: 'Ingen fil bifogad.' }, 400, corsHeaders)
    }

    const extension = ALLOWED_TYPES[file.type]
    if (!extension) {
      return json({ error: 'Endast JPEG, PNG eller WebP tillåts.' }, 400, corsHeaders)
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return json({ error: 'Filen är större än fem MB.' }, 400, corsHeaders)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    // Ägarkontroll: bara den som har ärendets hemliga view_token får ladda upp bilder.
    const { data: request, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id')
      .eq('id', requestId)
      .eq('view_token', viewToken)
      .maybeSingle()

    if (requestError) throw requestError
    if (!request) return json({ error: 'Ogiltigt ärende.' }, 403, corsHeaders)

    const { count, error: countError } = await admin
      .from('bike_request_images')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', requestId)

    if (countError) throw countError
    if ((count ?? 0) >= MAX_IMAGES_PER_REQUEST) {
      return json({ error: 'Max fyra bilder per ärende.' }, 400, corsHeaders)
    }

    const path = `${requestId}/${crypto.randomUUID()}.${extension}`
    const bytes = new Uint8Array(await file.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from('bike-images')
      .upload(path, bytes, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { error: insertError } = await admin
      .from('bike_request_images')
      .insert({ request_id: requestId, image_url: path })

    if (insertError) {
      await admin.storage.from('bike-images').remove([path]).catch(() => undefined)
      throw insertError
    }

    return json({ success: true, path }, 200, corsHeaders)
  } catch (error) {
    console.error('upload-bike-image error', error)
    return json({ error: 'Bilden kunde inte laddas upp.' }, 500, corsHeaders)
  }
})
