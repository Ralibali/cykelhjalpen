import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { LEAD_FEE_ORE } from "../_shared/pricing.ts";
import { corsFor } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: uErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uErr || !userData.user) throw new Error("Unauthenticated");
    const user = userData.user;

    const { response_id } = await req.json();
    if (!response_id) throw new Error("response_id required");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: ws } = await admin.from("workshops").select("id, approved, company_name, stripe_customer_id, email, free_leads_remaining").eq("user_id", user.id).maybeSingle();
    if (!ws || !ws.approved) throw new Error("Workshop not approved");

    const { data: resp } = await admin.from("workshop_responses").select("id, request_id, workshop_id, paid").eq("id", response_id).maybeSingle();
    if (!resp || resp.workshop_id !== ws.id) throw new Error("Response not found");
    if (resp.paid) throw new Error("Already paid");

    // Cap of 5 paid responses
    const { count } = await admin.from("workshop_responses").select("*", { head: true, count: "exact" }).eq("request_id", resp.request_id).eq("paid", true);
    if ((count || 0) >= 5) throw new Error("Ärendet är fullt — max fem verkstäder har redan svarat.");

    // Free-lead path: if admin has granted free leads, consume one and unlock without Stripe
    if ((ws.free_leads_remaining || 0) > 0) {
      await admin.from("workshop_responses").update({ paid: true, used_free_lead: true }).eq("id", resp.id);
      await admin.from("workshops").update({ free_leads_remaining: ws.free_leads_remaining - 1 }).eq("id", ws.id);
      await admin.from("lead_charges").insert({
        response_id: resp.id,
        request_id: resp.request_id,
        workshop_id: ws.id,
        amount: 0,
        currency: "sek",
        status: "free_lead",
      });
      const origin = req.headers.get("origin") || "https://cykelhjalpen.se";
      return new Response(JSON.stringify({ url: `${origin}/dashboard/verkstad/arenden?paid=true&free=1`, free_lead: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    let customerId = ws.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: ws.email, name: ws.company_name });
      customerId = customer.id;
      await admin.from("workshops").update({ stripe_customer_id: customerId }).eq("id", ws.id);
    }

    const origin = req.headers.get("origin") || "https://cykelhjalpen.se";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      automatic_tax: { enabled: true },
      customer_update: { address: "auto", name: "auto" },
      billing_address_collection: "required",
      line_items: [{
        price_data: {
          currency: "sek",
          product_data: { name: "Cykelhjälpen — offert till kund", description: `Lead-avgift för ärende ${resp.request_id.slice(0, 8)}` },
          unit_amount: LEAD_FEE_ORE,
          tax_behavior: "exclusive",
        },
        quantity: 1,
      }],
      success_url: `${origin}/dashboard/verkstad/arenden?paid=true`,
      cancel_url: `${origin}/dashboard/verkstad/arenden?canceled=true`,
      metadata: { response_id: resp.id, request_id: resp.request_id, workshop_id: ws.id },
    });

    await admin.from("lead_charges").insert({
      response_id: resp.id,
      request_id: resp.request_id,
      workshop_id: ws.id,
      stripe_session_id: session.id,
      amount: LEAD_FEE_ORE,
      currency: "sek",
      status: "pending",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("[create-bike-response-payment]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
