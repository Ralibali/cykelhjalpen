import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { notifyWorkshopsOfApprovedRequest, logSmsAttempt } from './notifications.ts'
import { v2FlagEnabledFor } from './v2/flags.ts'
import { v2ClusterCityNames } from './v2/city-state.ts'
import { citySlugFromName } from './v2/config-schema.ts'
import { matchWorkshopToRequestCity } from './v2/eligibility.ts'

/** Keep in sync with src/lib/cykelMarketplaceHealth.ts (PR #9). */
export const ACTIVE_WORKSHOP_QUOTE_WINDOW_DAYS = 30

export const APPROVED_ADMIN_STATUS = 'approved'

export type PublishableBikeRequest = {
  id: string
  view_token: string | null
  customer_name: string
  customer_email: string
  bike_type: string
  repair_category: string
  description: string
  area: string | null
  city: string | null
  urgency: string | null
  admin_status: string
  preferred_workshop_id?: string | null
}

export type PublishApprovedResult = {
  already_applied: boolean
  workshops_notified: number
  workshop_emails_sent: number
  sms_sent: number
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const urgencyLabel = (value: string | null) => ({
  asap: 'Så snart som möjligt',
  this_week: 'Den här veckan',
  flexible: 'Flexibel',
}[value || ''] || value || 'Ej angivet')

/**
 * Eligibility is the admin-health "active workshop" definition:
 * approved AND at least one workshop_responses row in the last 30 days.
 * City match is exact canonical name — same as list-open-bike-requests / admin approve.
 */
export async function cityHasActiveWorkshop(
  admin: SupabaseClient,
  city: string,
  now: Date = new Date(),
): Promise<boolean> {
  const { data: workshops, error } = await admin
    .from('workshops')
    .select('id')
    .eq('approved', true)
    .eq('city', city)
  if (error) throw error
  if (!workshops?.length) return false

  const since = new Date(now.getTime() - ACTIVE_WORKSHOP_QUOTE_WINDOW_DAYS * 86_400_000).toISOString()
  const { data: quotes, error: quoteError } = await admin
    .from('workshop_responses')
    .select('workshop_id')
    .in('workshop_id', workshops.map((workshop) => workshop.id))
    .gte('created_at', since)
    .limit(1)
  if (quoteError) throw quoteError
  return (quotes?.length ?? 0) > 0
}

const sendEmail = async (supabaseUrl: string, serviceRoleKey: string, to: string, subject: string, html: string) => {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ to, subject, html }),
  })
  if (!response.ok) {
    throw new Error(`E-postfel ${response.status}: ${(await response.text().catch(() => '')).slice(0, 160)}`)
  }
}

/**
 * Shared approve path used by the admin UI and by auto-approve on create.
 * Writes admin_status=approved, sets approved_at, then notifies workshops
 * so the request appears on list-open-bike-requests / the workshop board.
 */
export async function publishApprovedBikeRequest(opts: {
  admin: SupabaseClient
  supabaseUrl: string
  serviceRoleKey: string
  requestRow: PublishableBikeRequest
  approvedAt?: string
}): Promise<PublishApprovedResult> {
  const { admin, supabaseUrl, serviceRoleKey, requestRow } = opts

  if (requestRow.admin_status === APPROVED_ADMIN_STATUS) {
    return { already_applied: true, workshops_notified: 0, workshop_emails_sent: 0, sms_sent: 0 }
  }

  const { error: updateError } = await admin
    .from('bike_repair_requests')
    .update({
      admin_status: APPROVED_ADMIN_STATUS,
      approved_at: opts.approvedAt ?? new Date().toISOString(),
      rejected_reason: null,
    })
    .eq('id', requestRow.id)
  if (updateError) throw updateError

  const requestUrl = requestRow.view_token
    ? `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(requestRow.view_token)}`
    : 'https://cykelhjalpen.se/'
  const safeName = escapeHtml(requestRow.customer_name)
  const safeBikeType = escapeHtml(requestRow.bike_type)
  const safeCategory = escapeHtml(requestRow.repair_category)
  const city = requestRow.city || 'Linköping'

  const customerEmail = sendEmail(
    supabaseUrl,
    serviceRoleKey,
    requestRow.customer_email,
    'Ditt cykelärende är godkänt och skickat till verkstäder',
    `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
        <h2 style="margin:0 0 16px">Hej ${safeName}!</h2>
        <p>Ditt ärende om <strong>${safeCategory}</strong> för din ${safeBikeType} är nu godkänt.</p>
        <p>Det har skickats till anslutna cykelverkstäder i ${escapeHtml(city)}. Du får besked när en verkstad lämnar offert.</p>
        <p style="margin-top:24px"><a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Följ ditt ärende</a></p>
      </div>
    `,
  ).catch((error) => console.error('Customer status email failed', error))

  let workshopsQuery = admin
    .from('workshops')
    .select('id, email, company_name, phone, sms_notifications, user_id, city, areas_served, service_area_mode, cluster_opt_in, services')
    .eq('approved', true)
  if (requestRow.preferred_workshop_id) {
    workshopsQuery = workshopsQuery.eq('id', requestRow.preferred_workshop_id)
  } else {
    workshopsQuery = workshopsQuery.eq('city', city)
  }

  // V2 (flag v2.liquidity.areas_served_matching, gate G-L1): eligible supply
  // resolves through the eligibility engine — areas_served[] and cluster
  // membership (Östergötland) count, not just exact city. Flag OFF = the
  // exact-city query above is used unchanged.
  let matchingOn = false
  let clusterCityNames: string[] = []
  if (!requestRow.preferred_workshop_id) {
    matchingOn = await v2FlagEnabledFor(admin, 'v2.liquidity.areas_served_matching', {
      citySlug: citySlugFromName(city),
    }).catch(() => false)
    if (matchingOn) {
      clusterCityNames = await v2ClusterCityNames(admin, city).catch(() => [city])
      // No SQL city filter: 'areas' workshops may live outside the cluster.
      // The eligibility engine filters below (tiny approved-workshop set).
      workshopsQuery = admin
        .from('workshops')
        .select('id, email, company_name, phone, sms_notifications, user_id, city, areas_served, service_area_mode, cluster_opt_in, services')
        .eq('approved', true)
    }
  }

  let { data: workshops, error: workshopsError } = await workshopsQuery
  if (workshopsError) throw workshopsError

  if (matchingOn && !requestRow.preferred_workshop_id) {
    workshops = (workshops || []).filter((workshop) => {
      const matched = matchWorkshopToRequestCity(
        {
          city: workshop.city,
          areasServed: workshop.areas_served,
          serviceAreaMode: workshop.service_area_mode,
          clusterOptIn: workshop.cluster_opt_in,
        },
        city,
        { areasServedMatchingOn: true, clusterCityNames },
      )
      if (!matched) return false
      const services: string[] = workshop.services || []
      return services.length === 0 || services.includes(requestRow.repair_category)
    })
  }

  const notifiedWorkshops = workshops?.length || 0
  const description = requestRow.description.length > 300
    ? `${requestRow.description.slice(0, 300)}…`
    : requestRow.description
  const dashboardUrl = 'https://cykelhjalpen.se/dashboard/verkstad/arenden'

  const workshopEmailResults = await Promise.allSettled((workshops || []).map((workshop) => sendEmail(
    supabaseUrl,
    serviceRoleKey,
    workshop.email,
    `Nytt godkänt cykelärende i ${city} – ${requestRow.repair_category}`,
    `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
        <h2 style="margin:0 0 16px">Nytt cykelärende i ${escapeHtml(city)}</h2>
        <p>Hej ${escapeHtml(workshop.company_name)}, en kund söker hjälp:</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 12px 4px 0;color:#555">Cykel:</td><td><strong>${safeBikeType}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555">Problem:</td><td><strong>${safeCategory}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#555">När:</td><td>${escapeHtml(urgencyLabel(requestRow.urgency))}</td></tr>
          ${requestRow.area ? `<tr><td style="padding:4px 12px 4px 0;color:#555">Område:</td><td>${escapeHtml(requestRow.area)}</td></tr>` : ''}
        </table>
        <p style="background:#f5f5f5;padding:12px;border-radius:6px">${escapeHtml(description)}</p>
        <p style="margin-top:24px"><a href="${dashboardUrl}" style="display:inline-block;background:#4338CA;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Öppna ärendet och lämna offert</a></p>
      </div>
    `,
  )))

  await notifyWorkshopsOfApprovedRequest(admin, workshops || [], {
    city,
    repair_category: requestRow.repair_category,
    bike_type: requestRow.bike_type,
    request_id: requestRow.id,
  }).catch((notifyError) => console.error('Workshop in-app notification failed', notifyError))

  const recipients = (workshops || []).filter((workshop) => workshop.sms_notifications && workshop.phone)
  const message = `Nytt godkänt cykelärende i ${city}: ${requestRow.repair_category}. Svara i verkstadsvyn: cykelhjalpen.se/dashboard/verkstad/arenden`
  const smsResults = await Promise.allSettled(recipients.map((workshop) => logSmsAttempt(admin, {
    to: workshop.phone || '',
    message,
    idempotencyKey: `bike_request_approved_sms:${requestRow.id}:${workshop.id}`,
    reason: 'bike_request_approved',
  })))
  const smsSent = smsResults.filter((result) => result.status === 'fulfilled' && (result.value as { status: string }).status === 'sent').length

  await customerEmail

  return {
    already_applied: false,
    workshops_notified: notifiedWorkshops,
    workshop_emails_sent: workshopEmailResults.filter((result) => result.status === 'fulfilled').length,
    sms_sent: smsSent,
  }
}
