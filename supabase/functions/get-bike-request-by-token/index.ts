import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.25.76";
import { corsFor } from "../_shared/cors.ts";
import { toCustomerResponse } from "../_shared/token-view.ts";
import { v2FlagEnabled } from "../_shared/v2/flags.ts";
import { RETENTION_LIFECYCLE_FLAG } from "../_shared/v2/retention.ts";

const BodySchema = z.object({ token: z.string().uuid() });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
      .select("id, customer_name, customer_email, bike_type, repair_category, description, city, urgency, can_drop_off, wants_pickup, status, admin_status, rejected_reason, created_at, closed_at")
      .eq("view_token", parsed.data.token)
      .maybeSingle();
    if (requestError) throw requestError;

    if (!request) {
      return new Response(JSON.stringify({ request: null, responses: [], images: [] }), { headers });
    }

    // Kundens e-post används ENDAST server-side för historik-matchning och
    // samtyckesuppslag (S8) – den plockas bort innan svaret skickas.
    const { customer_email: customerEmail, ...publicRequest } = request;

    const [{ data: responses, error: responseError }, { data: imageRows, error: imageError }] = await Promise.all([
      admin
        .from("workshop_responses")
        .select("id, message, estimated_price_min, estimated_price_max, estimated_time, can_pickup, status, paid, created_at, workshops(id, company_name, phone, email, website)")
        .eq("request_id", request.id)
        .in("status", ["sent", "won", "lost"])
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

    const mapped = (responses || []).map((row: any) => toCustomerResponse(row));



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

    // --- S8 retention (flagg-gated, default AV): servicehistorik, outcome   ---
    // --- och samtyckesstatus för token-sidan. Kontrakt §2.7/§3.7.          ---
    let history: unknown[] = [];
    let outcome: unknown = null;
    let retention: { reminder_opt_in: boolean } | null = null;
    try {
      if (await v2FlagEnabled(admin, RETENTION_LIFECYCLE_FLAG)) {
        // Identitet = e-postmatchning bakom ett giltigt view_token (kontraktets
        // kontolösa modell). Samma e-post → kundens tidigare ärenden.
        const [{ data: historyRows }, { data: contactRow }] = await Promise.all([
          admin
            .from("bike_repair_requests")
            .select("id, bike_type, repair_category, city, status, created_at, view_token")
            .ilike("customer_email", customerEmail.replace(/[%_\\]/g, (m: string) => `\\${m}`))
            .neq("id", request.id)
            .order("created_at", { ascending: false })
            .limit(10),
          admin
            .from("v2_retention_contacts")
            .select("consent_basis, unsubscribed_at")
            .eq("subject_type", "customer")
            .eq("subject_key", await sha256Hex(customerEmail.trim().toLowerCase()))
            .maybeSingle(),
        ]);

        // S3:s outcome-tabell (read-only konsumtion) berikar historiken.
        const requestIds = [request.id, ...(historyRows || []).map((row) => row.id)];
        const { data: outcomeRows } = await admin
          .from("v2_job_outcomes")
          .select("request_id, state, final_price_sek")
          .in("request_id", requestIds)
          .in("state", ["reported_by_workshop", "confirmed_by_customer", "completed"]);
        const outcomeByRequest = new Map(
          (outcomeRows || []).map((row) => [row.request_id, { state: row.state, final_price_sek: row.final_price_sek }]),
        );
        outcome = outcomeByRequest.get(request.id) ?? null;
        history = (historyRows || []).map((row) => ({
          ...row,
          outcome: outcomeByRequest.get(row.id) ?? null,
        }));
        retention = {
          reminder_opt_in: Boolean(
            contactRow && contactRow.consent_basis === "marketing_consent" && !contactRow.unsubscribed_at,
          ),
        };
      }
    } catch (retentionError) {
      // Historiken är en bonusyta – den får aldrig störa ärendeläsningen.
      console.error("get-bike-request-by-token retention extras failed", retentionError);
    }

    return new Response(JSON.stringify({ request: publicRequest, responses: mapped, images, history, outcome, retention }), { headers });
  } catch (error) {
    console.error("get-bike-request-by-token", error);
    return new Response(JSON.stringify({ error: "Kunde inte läsa ärendet just nu." }), {
      status: 500,
      headers,
    });
  }
});
