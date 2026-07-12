import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: existing } = await admin
    .from("stripe_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (existing) {
    console.log("duplicate stripe event ignored", event.id);
    return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });
  }

  const isSuccessfulCheckout = event.type === "checkout.session.completed"
    || event.type === "checkout.session.async_payment_succeeded";

  if (isSuccessfulCheckout) {
    const session = event.data.object as Stripe.Checkout.Session;

    // Some payment methods complete Checkout before the actual payment succeeds.
    // The async_payment_succeeded event will finalize those later.
    if (session.payment_status !== "paid") {
      console.log("checkout completed without paid status", session.id, session.payment_status);
    } else {
      const responseId = session.metadata?.response_id;
      const metadataRequestId = session.metadata?.request_id;
      const metadataWorkshopId = session.metadata?.workshop_id;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

      if (responseId) {
        // The database trigger serializes all paid responses for this request and
        // rejects the sixth one even if several payments finish simultaneously.
        const { data: responseRow, error: responseError } = await admin
          .from("workshop_responses")
          .update({
            paid: true,
            status: "sent",
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("id", responseId)
          .select("request_id, workshop_id")
          .maybeSingle();

        if (responseError?.message?.includes("bike_request_full")) {
          if (!paymentIntentId) throw new Error("Full request payment is missing payment intent");

          await stripe.refunds.create(
            { payment_intent: paymentIntentId, reason: "requested_by_customer" },
            { idempotencyKey: `bike-request-full-${session.id}` },
          );

          await Promise.all([
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

          console.log("response refunded because request already had five paid offers", responseId);
        } else {
          if (responseError) throw responseError;

          const requestId = responseRow?.request_id || metadataRequestId;
          const workshopId = responseRow?.workshop_id || metadataWorkshopId;

          const { error: chargeError } = await admin.from("lead_charges").update({
            status: "paid",
            stripe_payment_intent_id: paymentIntentId,
          }).eq("stripe_session_id", session.id);
          if (chargeError) throw chargeError;

          if (requestId) {
            await admin.from("bike_repair_requests").update({ status: "has_offers" }).eq("id", requestId);

            const [{ data: requestRow }, { data: workshopRow }] = await Promise.all([
              admin.from("bike_repair_requests")
                .select("customer_name, customer_email, repair_category, view_token")
                .eq("id", requestId)
                .maybeSingle(),
              workshopId
                ? admin.from("workshops").select("company_name").eq("id", workshopId).maybeSingle()
                : Promise.resolve({ data: null }),
            ]);

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
                      <p><strong>${escapeHtml(workshopRow?.company_name || "En cykelverkstad")}</strong> har lämnat ett nytt prisförslag på ditt ärende.</p>
                      <p><a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Se prisförslaget</a></p>
                    </div>
                  `,
                }),
              });
              if (!emailResponse.ok) console.error("customer offer email failed", emailResponse.status);
            }
          }
        }
      }
    }
  } else {
    console.log("unhandled stripe event type", event.type, event.id);
  }

  const { error: eventError } = await admin.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
  });
  if (eventError) throw eventError;

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
