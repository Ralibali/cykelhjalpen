import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsFor } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token) throw new Error("token required");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: request } = await admin
      .from("bike_repair_requests")
      .select("id, customer_name, bike_type, repair_category, description, status, created_at")
      .eq("view_token", token)
      .maybeSingle();

    if (!request) {
      return new Response(JSON.stringify({ request: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: responses } = await admin
      .from("workshop_responses")
      .select("id, message, estimated_price_min, estimated_price_max, estimated_time, can_pickup, workshops(company_name, phone, email, website)")
      .eq("request_id", request.id)
      .eq("paid", true)
      .order("created_at", { ascending: true });

    const mapped = (responses || []).map((r: any) => ({
      ...r,
      workshop: r.workshops,
    }));

    // Fetch images for this request and return signed URLs (1 hour)
    const { data: imageRows } = await admin
      .from("bike_request_images")
      .select("id, image_url, created_at")
      .eq("request_id", request.id)
      .order("created_at", { ascending: true });

    const images: { id: string; url: string }[] = [];
    for (const row of imageRows || []) {
      // image_url is stored as the storage path inside the bike-images bucket
      let path = row.image_url as string;
      // If a full URL was stored, extract the path after the bucket name
      const marker = "/bike-images/";
      const idx = path.indexOf(marker);
      if (idx !== -1) path = path.slice(idx + marker.length);

      const { data: signed } = await admin.storage
        .from("bike-images")
        .createSignedUrl(path, 3600);

      if (signed?.signedUrl) {
        images.push({ id: row.id, url: signed.signedUrl });
      }
    }

    return new Response(JSON.stringify({ request, responses: mapped, images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
