import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find projects with pending offers but no accepted offer, older than 5 days
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: projects, error: projErr } = await supabase
      .from("projects")
      .select("id, title, buyer_id, offer_count")
      .eq("status", "active")
      .gt("offer_count", 0)
      .lt("created_at", fiveDaysAgo);

    if (projErr) throw projErr;

    let notificationsSent = 0;

    for (const project of projects || []) {
      // Check if there are pending offers
      const { data: pendingOffers } = await supabase
        .from("offers")
        .select("id, created_at")
        .eq("project_id", project.id)
        .eq("status", "pending");

      if (!pendingOffers || pendingOffers.length === 0) continue;

      // Check oldest pending offer is at least 5 days old
      const oldestOffer = pendingOffers.reduce((oldest, o) =>
        new Date(o.created_at) < new Date(oldest.created_at) ? o : oldest
      );
      if (new Date(oldestOffer.created_at).getTime() > Date.now() - 5 * 24 * 60 * 60 * 1000) continue;

      // Check if we already sent a reminder in the last 3 days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", project.buyer_id)
        .eq("type", "offer_reminder")
        .gte("created_at", threeDaysAgo)
        .limit(1);

      if (existingNotif && existingNotif.length > 0) continue;

      // Send reminder notification
      await supabase.from("notifications").insert({
        user_id: project.buyer_id,
        type: "offer_reminder",
        title: "Dina offerter väntar på svar",
        message: `Du har ${pendingOffers.length} intresserade ${pendingOffers.length === 1 ? "byrå" : "byråer"} på "${project.title}" som väntar på ditt beslut.`,
        link: `/dashboard/buyer/uppdrag/${project.id}`,
      });

      notificationsSent++;
    }

    return new Response(
      JSON.stringify({ success: true, notificationsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
