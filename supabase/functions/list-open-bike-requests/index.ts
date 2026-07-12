import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsFor } from "../_shared/cors.ts";

const storagePath = (value: string) => {
  const marker = "/bike-images/";
  const index = value.indexOf(marker);
  return index === -1 ? value : value.slice(index + marker.length);
};

serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("no auth");

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!u.user) throw new Error("unauthenticated");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ws } = await admin
      .from("workshops")
      .select("id, approved, city")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (!ws || !ws.approved) throw new Error("not approved");
    if (!ws.city) throw new Error("workshop city missing");

    // City filtering must happen before returning data. Client-side filtering is not an access control.
    const { data, error } = await admin
      .from("bike_repair_requests")
      .select("id, bike_type, repair_category, description, area, postcode, urgency, can_drop_off, wants_pickup, status, created_at")
      .in("status", ["new", "has_offers"])
      .eq("admin_status", "approved")
      .eq("city", ws.city)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const requests = data || [];
    const requestIds = requests.map((row) => row.id);
    const imagesByRequest = new Map<string, { id: string; url: string }[]>();

    if (requestIds.length > 0) {
      const { data: imageRows, error: imageError } = await admin
        .from("bike_request_images")
        .select("id, request_id, image_url")
        .in("request_id", requestIds);
      if (imageError) throw imageError;

      const paths = (imageRows || []).map((row) => storagePath(row.image_url));
      if (paths.length > 0) {
        const { data: signedRows, error: signedError } = await admin.storage
          .from("bike-images")
          .createSignedUrls(paths, 3600);
        if (signedError) throw signedError;

        const signedByPath = new Map((signedRows || []).map((row) => [row.path, row.signedUrl]));
        for (const row of imageRows || []) {
          const path = storagePath(row.image_url);
          const url = signedByPath.get(path);
          if (!url) continue;
          const current = imagesByRequest.get(row.request_id) || [];
          current.push({ id: row.id, url });
          imagesByRequest.set(row.request_id, current);
        }
      }
    }

    return new Response(JSON.stringify({
      requests: requests.map((row) => ({ ...row, images: imagesByRequest.get(row.id) || [] })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
