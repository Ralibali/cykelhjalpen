import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("no signature", { status: 400 });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET_BIKE")!);
  } catch (e) {
    console.error("webhook signature failed", e);
    return new Response("bad signature", { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Idempotency: skip if event already processed
  const { data: existing } = await admin
    .from("stripe_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (existing) {
    console.log("duplicate stripe event ignored", event.id);
    return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const responseId = s.metadata?.response_id;
    if (responseId) {
      await admin.from("lead_charges").update({
        status: "paid",
        stripe_payment_intent_id: typeof s.payment_intent === "string" ? s.payment_intent : null,
      }).eq("stripe_session_id", s.id);

      await admin.from("workshop_responses").update({
        paid: true,
        status: "sent",
        stripe_payment_intent_id: typeof s.payment_intent === "string" ? s.payment_intent : null,
      }).eq("id", responseId);
    }
  } else {
    console.log("unhandled stripe event type", event.type, event.id);
  }

  // Record event to prevent reprocessing
  await admin.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
  });

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});

