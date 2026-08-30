import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsFor } from "../_shared/cors.ts";
import { v2FlagEnabledFor } from "../_shared/v2/flags.ts";
import { getV2CityConfigs, v2ClusterCityNames } from "../_shared/v2/city-state.ts";
import { citySlugFromName } from "../_shared/v2/config-schema.ts";
import {
  matchWorkshopToRequestCity,
  visibleCityNamesForWorkshop,
} from "../_shared/v2/eligibility.ts";

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
      .select("id, approved, city, areas_served, service_area_mode, cluster_opt_in, services")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (workshopError) throw workshopError;
    if (!ws || !ws.approved) throw new Error("not approved");
    if (!ws.city) throw new Error("workshop city missing");

    // V2 (gate G-L1, flag v2.liquidity.areas_served_matching): the workshop
    // board resolves visible cities through the eligibility engine —
    // areas_served[] and cluster membership (Östergötland) in addition to the
    // exact home city. Flag OFF = exact-city only (live behavior unchanged).
    const matchingOn = await v2FlagEnabledFor(admin, "v2.liquidity.areas_served_matching", {
      citySlug: citySlugFromName(ws.city),
      subjectId: ws.id,
    });

    let visibleCities = [ws.city];
    let knownCityNames: string[] = [];
    let workshopClusterCityNames: string[] = [];
    if (matchingOn) {
      const configs = await getV2CityConfigs(admin);
      knownCityNames = Object.values(configs).map((config) => config.cityName);
      workshopClusterCityNames = await v2ClusterCityNames(admin, ws.city);
      visibleCities = visibleCityNamesForWorkshop(
        {
          city: ws.city,
          areasServed: ws.areas_served,
          serviceAreaMode: ws.service_area_mode,
          clusterOptIn: ws.cluster_opt_in,
        },
        { areasServedMatchingOn: true, knownCityNames, workshopClusterCityNames },
      );
    }

    // City filtering must happen before returning data. Client-side filtering is not access control.
    const { data, error } = await admin
      .from("bike_repair_requests")
      .select("id, bike_type, repair_category, description, area, postcode, urgency, can_drop_off, wants_pickup, status, created_at, customer_language, city")
      .in("status", ["new", "has_offers"])
      .eq("admin_status", "approved")
      .in("city", visibleCities)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const workshopServices: string[] = ws.services || [];
    const initialRequests = (data || []).filter((row) =>
      // Service-category awareness where supported: a workshop that declared
      // services only sees requests in those categories (flag-gated).
      !matchingOn || workshopServices.length === 0 || workshopServices.includes(row.repair_category)
    );
    const initialIds = initialRequests.map((row) => row.id);
    const sentCounts = new Map<string, number>();

    if (initialIds.length > 0) {
      // Betala-vid-vinst: svar är synliga direkt när de skickas, så det är
      // antalet skickade svar (inte betalda) som avgör när ärendet är fullt.
      const { data: sentRows, error: sentError } = await admin
        .from("workshop_responses")
        .select("request_id")
        .in("request_id", initialIds)
        .in("status", ["sent", "won"]);
      if (sentError) throw sentError;

      for (const row of sentRows || []) {
        sentCounts.set(row.request_id, (sentCounts.get(row.request_id) || 0) + 1);
      }
    }

    // The database trigger is the final guard, but full requests should disappear
    // from the product before a workshop spends time writing an offer.
    const requests = initialRequests.filter((row) => (sentCounts.get(row.id) || 0) < 3);
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
      requests: requests.map((row) => ({
        ...row,
        images: imagesByRequest.get(row.id) || [],
        // How this workshop matched the request's city (only meaningful when
        // the areas/cluster matching flag is on; always "city" otherwise).
        matched_via: matchWorkshopToRequestCity(
          {
            city: ws.city,
            areasServed: ws.areas_served,
            serviceAreaMode: ws.service_area_mode,
            clusterOptIn: ws.cluster_opt_in,
          },
          row.city,
          { areasServedMatchingOn: matchingOn, clusterCityNames: workshopClusterCityNames },
        ) || "city",
      })),
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
