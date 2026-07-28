import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const LEAD_CREDIT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("no signature", { status: 400 });

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_LEAD_CREDITS");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("stripe webhook configuration missing");
    return jsonResponse({ error: "configuration missing" }, 500);
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (error) {
    console.error("webhook signature failed", error);
    return new Response("bad signature", { status: 400 });
  }

  if (!LEAD_CREDIT_EVENTS.has(event.type)) {
    return jsonResponse({ received: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const workshopId = session.metadata?.workshop_id;
  const type = session.metadata?.type;
  const quantity = parseInt(session.metadata?.quantity || "0", 10);

  if (type !== "lead_credits" || !workshopId || !quantity) {
    return jsonResponse({ received: true, ignored: true, reason: "not lead credits" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { error: reservationError } = await admin.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
  });

  if (reservationError?.code === "23505") {
    return jsonResponse({ received: true, duplicate: true });
  }
  if (reservationError) {
    return jsonResponse({ error: "event reservation failed" }, 500);
  }

  try {
    const isSuccessful = event.type === "checkout.session.completed" 
      || event.type === "checkout.session.async_payment_succeeded";

    if (isSuccessful && session.payment_status === "paid") {
      await admin.from("lead_credit_purchases")
        .update({ status: "paid", stripe_payment_intent_id: session.payment_intent as string })
        .eq("stripe_session_id", session.id)
        .eq("status", "pending");

      const { data: workshop } = await admin.from("workshops")
        .select("free_leads_remaining")
        .eq("id", workshopId)
        .single();

      const newTotal = (workshop?.free_leads_remaining ?? 0) + quantity;

      await admin.from("workshops")
        .update({ free_leads_remaining: newTotal })
        .eq("id", workshopId);

      try {
        const { data: ws } = await admin.from("workshops")
          .select("email, company_name")
          .eq("id", workshopId)
          .single();
        if (ws?.email) {
          fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              to: ws.email,
              subject: `Dina ${quantity} lead-credits är aktiverade!`,
              html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
                <h2 style="color:#157A6E">Lead-credits aktiverade!</h2>
                <p>Hej ${ws.company_name}!</p>
                <p>Din betalning för <strong>${quantity} lead-credits</strong> har genomförts.</p>
                <p>Du har nu <strong>${newTotal} leads</strong> tillgängliga totalt.</p>
                <p><a href="https://cykelhjalpen.se/dashboard/verkstad" style="display:inline-block;background:#157A6E;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700">Gå till dashboard</a></p>
              </div>`,
            }),
          });
        }
      } catch (e) { console.error("confirmation email failed", e); }

      return jsonResponse({ received: true, credits_added: quantity, new_total: newTotal });
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      await admin.from("lead_credit_purchases")
        .update({ status: event.type.includes("expired") ? "expired" : "failed" })
        .eq("stripe_session_id", session.id)
        .eq("status", "pending");
      return jsonResponse({ received: true, status: "updated" });
    }

    return jsonResponse({ received: true });
  } catch (error) {
    await admin.from("stripe_events").delete().eq("stripe_event_id", event.id);
    console.error("stripe webhook processing failed", event.id, error);
    return jsonResponse({ error: "processing failed" }, 500);
  }
});
