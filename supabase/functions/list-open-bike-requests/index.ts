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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("no auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("backend configuration missing");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: u, error: userError } = await userClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (userError || !u.user) throw new Error("unauthenticated");

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: ws, error: workshopError } = await admin
      .from("workshops")
      .select("id, approved, city")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (workshopError) throw workshopError;
    if (!ws || !ws.approved) throw new Error("not approved");
    if (!ws.city) throw new Error("workshop city missing");

    // City filtering must happen before returning data. Client-side filtering is not access control.
    const { data, error } = await admin
      .from("bike_repair_requests")
      .select("id, bike_type, repair_category, description, area, postcode, urgency, can_drop_off, wants_pickup, status, created_at")
      .in("status", ["new", "has_offers"])
      .eq("admin_status", "approved")
      .eq("city", ws.city)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const initialRequests = data || [];
    const initialIds = initialRequests.map((row) => row.id);
    const paidCounts = new Map<string, number>();

    if (initialIds.length > 0) {
      const { data: paidRows, error: paidError } = await admin
        .from("workshop_responses")
        .select("request_id")
        .in("request_id", initialIds)
        .eq("paid", true);
      if (paidError) throw paidError;

      for (const row of paidRows || []) {
        paidCounts.set(row.request_id, (paidCounts.get(row.request_id) || 0) + 1);
      }
    }

    // The database trigger is the final guard, but full requests should disappear
    // from the product before a workshop spends time writing an offer.
    const requests = initialRequests.filter((row) => (paidCounts.get(row.id) || 0) < 5);
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
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    const status = message === "unauthenticated" || message === "no auth" ? 401 : message === "not approved" ? 403 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
