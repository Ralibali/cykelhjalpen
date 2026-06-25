import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const BodySchema = z.object({
  bike_type: z.string().min(1).max(80),
  repair_category: z.string().min(1).max(80),
  description: z.string().trim().min(10).max(2000),
  area: z.string().trim().max(80).optional().nullable(),
  postcode: z.string().trim().max(10).optional().nullable(),
  urgency: z.string().min(1).max(40),
  can_drop_off: z.boolean(),
  wants_pickup: z.boolean(),
  customer_name: z.string().trim().min(2).max(80),
  customer_email: z.string().trim().email().max(160),
  customer_phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(80).optional().default('Linköping'),
  turnstile_token: z.string().min(10).max(4096),
})

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const json = await req.json()
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const body = parsed.data

    const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Turnstile not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: body.turnstile_token, remoteip: ip }),
    })
    const verify = await verifyRes.json()
    if (!verify.success || (verify.action && verify.action !== 'submit_bike_request')) {
      return new Response(JSON.stringify({ error: 'Säkerhetskontrollen gick ut eller misslyckades. Bekräfta den igen och försök på nytt.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await supabase.rpc('submit_bike_repair_request', {
      p_bike_type: body.bike_type,
      p_repair_category: body.repair_category,
      p_description: body.description,
      p_area: body.area ?? null,
      p_postcode: body.postcode ?? null,
      p_urgency: body.urgency,
      p_can_drop_off: body.can_drop_off,
      p_wants_pickup: body.wants_pickup,
      p_customer_name: body.customer_name,
      p_customer_email: body.customer_email,
      p_customer_phone: body.customer_phone ?? null,
      p_city: body.city ?? 'Linköping',
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data

    // Vänta in notiserna innan svaret skickas. Tidigare kunde edge-körningen
    // avslutas medan mejl och SMS fortfarande låg i en frikopplad async-uppgift.
    await (async () => {
      try {
        const { data: workshops } = await supabase
          .from('workshops')
          .select('email, company_name, city, phone, sms_notifications')
          .eq('approved', true)
          .eq('city', body.city ?? 'Linköping')

        if (!workshops || workshops.length === 0) return

        const subject = `Ny cykelförfrågan i ${body.city ?? 'Linköping'} – ${body.repair_category}`
        const dashboardUrl = 'https://cykelhjalpen.se/dashboard/verkstad'
        const descShort = body.description.length > 240
          ? body.description.slice(0, 240) + '…'
          : body.description

        const safeCity = escapeHtml(body.city ?? 'Linköping')
        const safeBikeType = escapeHtml(body.bike_type)
        const safeRepairCategory = escapeHtml(body.repair_category)
        const safeUrgency = escapeHtml(body.urgency)
        const safeArea = escapeHtml(body.area)
        const safeDescription = escapeHtml(descShort)

        await Promise.allSettled(workshops.map((w: any) => {
          const safeCompanyName = escapeHtml(w.company_name)
          return fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              to: w.email,
              subject,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
                  <h2 style="margin:0 0 16px">Ny cykelförfrågan i ${safeCity}</h2>
                  <p>Hej ${safeCompanyName},</p>
                  <p>En ny kund söker hjälp med sin cykel:</p>
                  <table style="border-collapse:collapse;margin:16px 0">
                    <tr><td style="padding:4px 12px 4px 0;color:#555">Cykeltyp:</td><td><strong>${safeBikeType}</strong></td></tr>
                    <tr><td style="padding:4px 12px 4px 0;color:#555">Kategori:</td><td><strong>${safeRepairCategory}</strong></td></tr>
                    <tr><td style="padding:4px 12px 4px 0;color:#555">Brådska:</td><td><strong>${safeUrgency}</strong></td></tr>
                    ${body.area ? `<tr><td style="padding:4px 12px 4px 0;color:#555">Område:</td><td>${safeArea}</td></tr>` : ''}
                  </table>
                  <p style="background:#f5f5f5;padding:12px;border-radius:6px">${safeDescription}</p>
                  <p style="margin-top:24px">
                    <a href="${dashboardUrl}" style="display:inline-block;background:#4338CA;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">
                      Logga in och lägg offert
                    </a>
                  </p>
                  <p style="color:#888;font-size:12px;margin-top:32px">
                    Cykelhjälpen – Linköping. Du får detta mejl som godkänd verkstad i vårt nätverk.
                  </p>
                </div>
              `,
            }),
          }).catch((err) => console.error('Notify workshop failed', w.email, err))
        }))

        const elksUser = Deno.env.get('ELKS_API_USERNAME')
        const elksPass = Deno.env.get('ELKS_API_PASSWORD')
        if (elksUser && elksPass) {
          const smsRecipients = workshops.filter((w: any) => w.sms_notifications && w.phone)
          if (smsRecipients.length > 0) {
            const toE164 = (raw: string) => {
              const digits = raw.replace(/[^\d+]/g, '')
              if (digits.startsWith('+')) return digits
              if (digits.startsWith('00')) return '+' + digits.slice(2)
              if (digits.startsWith('0')) return '+46' + digits.slice(1)
              return digits
            }
            const cityForSms = body.city ?? 'Linköping'
            const message = `Nytt cykelärende i ${cityForSms}: ${body.repair_category}. Logga in och svara — max 5 verkstäder kan lämna offert. cykelhjalpen.se/dashboard/verkstad`
            const auth = btoa(`${elksUser}:${elksPass}`)
            await Promise.allSettled(smsRecipients.map((w: any) =>
              fetch('https://api.46elks.com/a1/sms', {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${auth}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  from: 'CykelHjalp',
                  to: toE164(w.phone),
                  message,
                }).toString(),
              }).catch((err) => console.error('SMS failed', w.phone, err))
            ))
          }
        } else {
          console.log('46elks credentials missing — skipping SMS notifications')
        }
      } catch (err) {
        console.error('Workshop notification batch failed', err)
      }
    })()

    return new Response(JSON.stringify(row), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
