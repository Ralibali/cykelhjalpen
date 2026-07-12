import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.25.76";
import { corsFor } from "../_shared/cors.ts";

const BodySchema = z.object({ token: z.string().uuid() });

const storagePath = (value: string) => {
  const marker = "/bike-images/";
  const index = value.indexOf(marker);
  return index === -1 ? value : value.slice(index + marker.length);
};

const responseHeaders = (req: Request) => ({
  ...corsFor(req),
  "Content-Type": "application/json",
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
});

serve(async (req) => {
  const headers = responseHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ request: null, responses: [], images: [] }), { headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("backend configuration missing");

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: request, error: requestError } = await admin
      .from("bike_repair_requests")
      .select("id, customer_name, bike_type, repair_category, description, city, urgency, can_drop_off, wants_pickup, status, admin_status, rejected_reason, created_at")
      .eq("view_token", parsed.data.token)
      .maybeSingle();
    if (requestError) throw requestError;

    if (!request) {
      return new Response(JSON.stringify({ request: null, responses: [], images: [] }), { headers });
    }

    const [{ data: responses, error: responseError }, { data: imageRows, error: imageError }] = await Promise.all([
      admin
        .from("workshop_responses")
        .select("id, message, estimated_price_min, estimated_price_max, estimated_time, can_pickup, created_at, workshops(id, company_name, phone, email, website)")
        .eq("request_id", request.id)
        .eq("paid", true)
        .eq("status", "sent")
        .order("created_at", { ascending: true })
        .limit(5),
      admin
        .from("bike_request_images")
        .select("id, image_url, created_at")
        .eq("request_id", request.id)
        .order("created_at", { ascending: true })
        .limit(4),
    ]);
    if (responseError) throw responseError;
    if (imageError) throw imageError;

    const mapped = (responses || []).map((row: any) => ({
      id: row.id,
      message: row.message,
      estimated_price_min: row.estimated_price_min,
      estimated_price_max: row.estimated_price_max,
      estimated_time: row.estimated_time,
      can_pickup: row.can_pickup,
      created_at: row.created_at,
      workshop: row.workshops,
    }));

    const paths = (imageRows || []).map((row) => storagePath(row.image_url));
    const images: { id: string; url: string }[] = [];

    if (paths.length > 0) {
      const { data: signedRows, error: signedError } = await admin.storage
        .from("bike-images")
        .createSignedUrls(paths, 3600);
      if (signedError) throw signedError;

      const signedByPath = new Map((signedRows || []).map((row) => [row.path, row.signedUrl]));
      for (const row of imageRows || []) {
        const path = storagePath(row.image_url);
        const url = signedByPath.get(path);
        if (url) images.push({ id: row.id, url });
      }
    }

    return new Response(JSON.stringify({ request, responses: mapped, images }), { headers });
  } catch (error) {
    console.error("get-bike-request-by-token", error);
    return new Response(JSON.stringify({ error: "Kunde inte läsa ärendet just nu." }), {
      status: 500,
      headers,
    });
  }
});
