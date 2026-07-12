import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const BIKE_SESSION_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("no signature", { status: 400 });

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_BIKE");
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

  // The Stripe account may serve several products. Only reserve and process
  // Checkout sessions that explicitly belong to a Cykelhjälpen response.
  if (!BIKE_SESSION_EVENTS.has(event.type)) {
    return jsonResponse({ received: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const bikeResponseId = session.metadata?.response_id || session.client_reference_id;
  if (!bikeResponseId) {
    return jsonResponse({ received: true, ignored: true });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Reserve the event before doing any side effects. The unique index makes
  // concurrent deliveries safe, not only sequential retries.
  const { error: reservationError } = await admin.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
  });

  if (reservationError?.code === "23505") {
    console.log("duplicate stripe event ignored", event.id);
    return jsonResponse({ received: true, duplicate: true });
  }
  if (reservationError) {
    console.error("could not reserve stripe event", reservationError);
    return jsonResponse({ error: "event reservation failed" }, 500);
  }

  try {
    const isSuccessfulCheckout = event.type === "checkout.session.completed"
      || event.type === "checkout.session.async_payment_succeeded";

    if (isSuccessfulCheckout) {
      // Some payment methods complete Checkout before the actual payment succeeds.
      // The async_payment_succeeded event will finalize those later.
      if (session.payment_status !== "paid") {
        console.log("checkout completed without paid status", session.id, session.payment_status);
      } else {
        const responseId = bikeResponseId;
        const metadataRequestId = session.metadata?.request_id;
        const metadataWorkshopId = session.metadata?.workshop_id;
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

        const { data: existingResponse, error: existingResponseError } = await admin
          .from("workshop_responses")
          .select("id, request_id, workshop_id, paid, status")
          .eq("id", responseId)
          .maybeSingle();
        if (existingResponseError) throw existingResponseError;
        if (!existingResponse) throw new Error(`Response ${responseId} was not found`);

        let responseRow = existingResponse;
        let newlyPaid = false;

        if (!existingResponse.paid) {
          // The database trigger serializes paid responses for this request and
          // rejects the sixth one even if several payments finish simultaneously.
          const { data: updatedResponse, error: responseError } = await admin
            .from("workshop_responses")
            .update({
              paid: true,
              status: "sent",
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("id", responseId)
            .eq("paid", false)
            .select("id, request_id, workshop_id, paid, status")
            .maybeSingle();

          if (responseError?.message?.includes("bike_request_full")) {
            if (!paymentIntentId) throw new Error("Full request payment is missing payment intent");

            await stripe.refunds.create(
              { payment_intent: paymentIntentId, reason: "requested_by_customer" },
              { idempotencyKey: `bike-request-full-${session.id}` },
            );

            const [{ error: chargeRefundError }, { error: responseFullError }] = await Promise.all([
              admin.from("lead_charges").update({
                status: "refunded",
                stripe_payment_intent_id: paymentIntentId,
              }).eq("stripe_session_id", session.id),
              admin.from("workshop_responses").update({
                paid: false,
                status: "full",
                stripe_payment_intent_id: paymentIntentId,
              }).eq("id", responseId),
            ]);
            if (chargeRefundError) throw chargeRefundError;
            if (responseFullError) throw responseFullError;

            console.log("response refunded because request already had five paid offers", responseId);
            return jsonResponse({ received: true, refunded: true });
          }

          if (responseError) throw responseError;
          if (updatedResponse) {
            responseRow = updatedResponse;
            newlyPaid = true;
          }
        }

        const { error: chargeError } = await admin.from("lead_charges").update({
          status: "paid",
          stripe_payment_intent_id: paymentIntentId,
        }).eq("stripe_session_id", session.id);
        if (chargeError) throw chargeError;

        const requestId = responseRow.request_id || metadataRequestId;
        const workshopId = responseRow.workshop_id || metadataWorkshopId;

        if (requestId) {
          const { count: paidCount, error: paidCountError } = await admin
            .from("workshop_responses")
            .select("*", { head: true, count: "exact" })
            .eq("request_id", requestId)
            .eq("paid", true);
          if (paidCountError) throw paidCountError;

          const { error: requestStatusError } = await admin
            .from("bike_repair_requests")
            .update({
              status: (paidCount || 0) >= 5 ? "full" : "has_offers",
              updated_at: new Date().toISOString(),
            })
            .eq("id", requestId);
          if (requestStatusError) throw requestStatusError;
        }

        // Only the transition from unpaid to paid sends a customer notification.
        if (newlyPaid && requestId) {
          const [{ data: requestRow, error: requestError }, workshopResult] = await Promise.all([
            admin.from("bike_repair_requests")
              .select("customer_name, customer_email, repair_category, view_token")
              .eq("id", requestId)
              .maybeSingle(),
            workshopId
              ? admin.from("workshops").select("company_name").eq("id", workshopId).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);
          if (requestError) throw requestError;
          if (workshopResult.error) throw workshopResult.error;

          if (requestRow?.customer_email && requestRow?.view_token) {
            const requestUrl = `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(requestRow.view_token)}`;
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                to: requestRow.customer_email,
                subject: `Nytt prisförslag på din cykel – ${requestRow.repair_category}`,
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
                    <h2>Hej ${escapeHtml(requestRow.customer_name)}!</h2>
                    <p><strong>${escapeHtml(workshopResult.data?.company_name || "En cykelverkstad")}</strong> har lämnat ett nytt prisförslag på ditt ärende.</p>
                    <p><a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Se prisförslaget</a></p>
                  </div>
                `,
              }),
            });
            if (!emailResponse.ok) {
              console.error("customer offer email failed", emailResponse.status, await emailResponse.text().catch(() => ""));
            }
          }
        }
      }
    } else if (event.type === "checkout.session.expired") {
      const { error } = await admin.from("lead_charges")
        .update({ status: "expired" })
        .eq("stripe_session_id", session.id)
        .eq("status", "pending");
      if (error) throw error;
    } else if (event.type === "checkout.session.async_payment_failed") {
      const { error } = await admin.from("lead_charges")
        .update({ status: "failed" })
        .eq("stripe_session_id", session.id)
        .eq("status", "pending");
      if (error) throw error;
    }

    return jsonResponse({ received: true });
  } catch (error) {
    // Let Stripe retry genuine processing failures. Removing the reservation is
    // safe because all external Stripe writes use idempotency keys where needed.
    const { error: cleanupError } = await admin
      .from("stripe_events")
      .delete()
      .eq("stripe_event_id", event.id);
    if (cleanupError) console.error("could not release failed stripe event reservation", cleanupError);

    console.error("stripe webhook processing failed", event.id, error);
    return jsonResponse({ error: "processing failed" }, 500);
  }
});
