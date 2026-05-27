import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsFor } from "../_shared/cors.ts";

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
    const { data: ws } = await admin.from("workshops").select("id, approved").eq("user_id", u.user.id).maybeSingle();
    if (!ws || !ws.approved) throw new Error("not approved");

    // Get admin-approved open requests, exclude PII
    const { data } = await admin
      .from("bike_repair_requests")
      .select("id, bike_type, repair_category, description, area, postcode, urgency, can_drop_off, wants_pickup, status, created_at")
      .in("status", ["new", "has_offers"])
      .eq("admin_status", "approved")
      .order("created_at", { ascending: false })
      .limit(100);

    return new Response(JSON.stringify({ requests: data || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
