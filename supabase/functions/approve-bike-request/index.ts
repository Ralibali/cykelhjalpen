import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsFor } from "../_shared/cors.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "Cykelhjälpen <info@cykelhjalpen.se>";

serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!u.user) throw new Error("Unauthenticated");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify admin
    const { data: prof } = await admin.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
    if (!prof || prof.role !== "admin") throw new Error("Forbidden");

    const { request_id, action, reason } = await req.json();
    if (!request_id || !["approve", "reject"].includes(action)) {
      throw new Error("request_id and action (approve|reject) required");
    }

    const { data: reqRow } = await admin
      .from("bike_repair_requests")
      .select("id, customer_name, customer_email, bike_type, repair_category, admin_status")
      .eq("id", request_id)
      .maybeSingle();
    if (!reqRow) throw new Error("Request not found");

    const newStatus = action === "approve" ? "approved" : "rejected";
    await admin
      .from("bike_repair_requests")
      .update({
        admin_status: newStatus,
        approved_at: action === "approve" ? new Date().toISOString() : null,
        rejected_reason: action === "reject" ? (reason || null) : null,
      })
      .eq("id", request_id);

    // Send email to customer
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (LOVABLE_API_KEY && RESEND_API_KEY && reqRow.customer_email) {
      const subject = action === "approve"
        ? "Din förfrågan är godkänd – vi skickar den till verkstäder"
        : "Vi kunde tyvärr inte ta emot din förfrågan";

      const html = action === "approve"
        ? `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6">
            <h2 style="color:#4338CA">Hej ${reqRow.customer_name || ""}!</h2>
            <p>Vi har granskat och godkänt din förfrågan om <strong>${reqRow.repair_category}</strong> för din ${reqRow.bike_type}.</p>
            <p>Den är nu synlig för verkstäder i Linköping. Du får besked direkt när någon svarar.</p>
            <p style="color:#555">Hälsningar,<br/>Cykelhjälpen</p>
          </div>`
        : `<div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6">
            <h2 style="color:#4338CA">Hej ${reqRow.customer_name || ""}!</h2>
            <p>Tyvärr kunde vi inte ta emot din förfrågan denna gång.</p>
            ${reason ? `<p><strong>Anledning:</strong> ${reason}</p>` : ""}
            <p>Du kan skicka in en ny förfrågan när som helst.</p>
            <p style="color:#555">Hälsningar,<br/>Cykelhjälpen</p>
          </div>`;

      try {
        await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [reqRow.customer_email],
            subject,
            html,
          }),
        });
      } catch (e) {
        console.error("[approve-bike-request] email send failed", e);
      }
    }

    // Audit log
    await admin.from("audit_log").insert({
      admin_id: u.user.id,
      action: action === "approve" ? "bike_request_approved" : "bike_request_rejected",
      target_type: "bike_repair_request",
      target_id: request_id,
      details: { reason: reason || null },
    });

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("[approve-bike-request]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
