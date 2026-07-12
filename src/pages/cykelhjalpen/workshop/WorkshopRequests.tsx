import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Bike, Loader2, Send, Check, CreditCard, MapPin, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { LEAD_FEE_KR } from '@/lib/pricing'
import type { WorkshopContext } from '@/components/cykelhjalpen/WorkshopLayout'

interface RequestImage {
  id: string
  url: string
}

interface RequestRow {
  id: string
  bike_type: string
  repair_category: string
  description: string
  area: string | null
  postcode: string | null
  urgency: string | null
  can_drop_off: boolean
  wants_pickup: boolean
  status: string
  created_at: string
  images?: RequestImage[]
}

interface ExistingResponse {
  id: string
  request_id: string
  paid: boolean
  status: string
}

const emptyForm = { message: '', estimated_price_min: '', estimated_price_max: '', estimated_time: '', can_pickup: false }

const WorkshopRequests = () => {
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [responses, setResponses] = useState<ExistingResponse[]>([])
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const responseByRequest = useMemo(
    () => new Map(responses.map((response) => [response.request_id, response])),
    [responses],
  )

  const load = async () => {
    setLoading(true)
    setLoadError(null)

    const [{ data: openData, error: openError }, { data: mine, error: mineError }] = await Promise.all([
      supabase.functions.invoke('list-open-bike-requests'),
      supabase.from('workshop_responses').select('id, request_id, paid, status').eq('workshop_id', workshop.id),
    ])

    if (openError || openData?.error) {
      setRequests([])
      setLoadError(openData?.error || openError?.message || 'Kunde inte läsa öppna ärenden.')
    } else {
      // The Edge Function now enforces the workshop city before returning any request details.
      setRequests((openData?.requests || []) as RequestRow[])
    }

    if (mineError) toast.error('Kunde inte läsa dina tidigare offerter.')
    setResponses((mine || []) as ExistingResponse[])
    setLoading(false)
  }

  useEffect(() => { load() }, [workshop.id, workshop.city])

  const confirmWebhookPaid = async () => {
    // Poll the database to verify Stripe webhook has flipped paid=true.
    // If it hasn't after ~15s, warn the user so they know something's off with the webhook.
    const toastId = toast.loading('Väntar på bekräftelse från Stripe…')
    const started = Date.now()
    const timeoutMs = 15000
    while (Date.now() - started < timeoutMs) {
      const { data } = await supabase
        .from('workshop_responses')
        .select('id, paid')
        .eq('workshop_id', workshop.id)
        .eq('paid', true)
        .order('created_at', { ascending: false })
        .limit(1)
      if (data && data.length > 0) {
        // Find the most recently paid one that wasn't paid before.
        const alreadyPaid = responses.some((r) => r.id === data[0].id && r.paid)
        if (!alreadyPaid) {
          toast.success('Betalning bekräftad – offerten är skickad till kunden. ✅', { id: toastId })
          await load()
          return
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    toast.warning('Betalningen registrerades men Stripe-webhooken har inte bekräftat den ännu.', {
      id: toastId,
      description: 'Kolla att STRIPE_WEBHOOK_SECRET_BIKE och endpointen i Stripe Dashboard är korrekt konfigurerade. Offerten skickas så snart webhook når fram.',
      duration: 12000,
    })
    await load()
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('paid') === 'true') {
      navigate(location.pathname, { replace: true })
      if (params.get('free') === '1') {
        toast.success('Offerten är skickad med en gratis-lead. ✅', {
          description: 'Kunden har fått ett mejl med ditt prisförslag.',
        })
        load()
      } else {
        confirmWebhookPaid()
      }
    } else if (params.get('canceled') === 'true') {
      toast.info('Betalningen avbröts.', {
        description: 'Din offert är sparad som utkast och kan skickas när du är redo.',
      })
      navigate(location.pathname, { replace: true })
    }
  }, [location.search])

  const openPayment = async (responseId: string, requestId: string) => {
    setSubmitting(requestId)
    const { data: payment, error } = await supabase.functions.invoke('create-bike-response-payment', {
      body: { response_id: responseId },
    })
    setSubmitting(null)

    if (error || payment?.error) {
      const msg = payment?.error || error?.message || 'Det gick inte att öppna betalningen.'
      const isStripeConfig = /stripe/i.test(msg) && /konfig|configuration|not set/i.test(msg)
      toast.error(isStripeConfig ? 'Stripe är inte korrekt konfigurerat.' : 'Kunde inte starta betalningen.', {
        description: msg + (isStripeConfig ? ' Kontrollera att STRIPE_SECRET_KEY är sparad som secret.' : ' Offerten är sparad och kan skickas senare.'),
        duration: 10000,
      })
      await load()
      return
    }
    if (payment?.url) {
      toast.success('Öppnar Stripe-checkout…')
      window.location.assign(payment.url)
    } else {
      toast.error('Ingen betalningslänk skapades.', {
        description: 'Stripe returnerade inget URL. Försök igen eller kontakta support om felet återkommer.',
      })
    }
  }

  const submitOffer = async (requestId: string) => {
    if (!validateOffer()) return
    const existing = responseByRequest.get(requestId)
    if (existing && !existing.paid) {
      await openPayment(existing.id, requestId)
      return
    }

    setSubmitting(requestId)
    const { data: response, error } = await supabase
      .from('workshop_responses')
      .insert({
        request_id: requestId,
        workshop_id: workshop.id,
        message: form.message.trim(),
        estimated_price_min: form.estimated_price_min ? Number(form.estimated_price_min) : null,
        estimated_price_max: form.estimated_price_max ? Number(form.estimated_price_max) : null,
        estimated_time: form.estimated_time.trim() || null,
        can_pickup: form.can_pickup,
        status: 'pending_payment',
      })
      .select('id, request_id, paid, status')
      .single()

    if (error || !response) {
      setSubmitting(null)
      toast.error(error?.message || 'Det gick inte att spara offerten.')
      return
    }

    setResponses((current) => [...current, response as ExistingResponse])
    setForm(emptyForm)
    setActive(null)
    await openPayment(response.id, requestId)
  }

  if (!workshop.approved) return <div className="sticker bg-card p-6 text-center text-muted-foreground">Ditt konto väntar på godkännande.</div>

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Öppna ärenden</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Endast {workshop.city}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Uppdatera
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      ) : loadError ? (
        <div className="sticker bg-card p-6 text-center">
          <p className="text-destructive mb-4">{loadError}</p>
          <Button onClick={load} variant="outline">Försök igen</Button>
        </div>
      ) : requests.length === 0 ? (
        <div className="sticker bg-card p-8 text-center text-muted-foreground">
          <Bike className="h-8 w-8 mx-auto mb-3 opacity-50" />
          Inga öppna ärenden i {workshop.city} just nu.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const existing = responseByRequest.get(request.id)
            const paid = Boolean(existing?.paid)
            const pendingPayment = Boolean(existing && !existing.paid)
            const isSubmitting = submitting === request.id

            return (
              <div key={request.id} className="sticker bg-card p-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Bike className="h-4 w-4" />
                      <span className="font-display font-bold">{request.bike_type}</span>
                      <span className="text-muted-foreground text-sm">· {request.repair_category}</span>
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{request.description}</p>
                    <div className="flex gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                      {request.area && <span>📍 {request.area}</span>}
                      {request.postcode && <span>{request.postcode}</span>}
                      {request.urgency && <span>⏱ {request.urgency}</span>}
                      {request.wants_pickup && <span>🚐 Önskar hämtning</span>}
                    </div>
                    {request.images && request.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                        {request.images.map((image) => (
                          <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border bg-muted">
                            <img src={image.url} alt="Bild på cykelproblemet" className="h-full w-full object-cover" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {paid ? (
                    <span className="text-sm text-green-700 flex items-center gap-1 bg-green-50 rounded-full px-3 py-1"><Check className="h-4 w-4" /> Offert skickad</span>
                  ) : pendingPayment ? (
                    <Button size="sm" onClick={() => openPayment(existing!.id, request.id)} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                      Fortsätt till betalning
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => toggleOffer(request.id)}>
                      {active === request.id ? 'Stäng' : 'Lämna offert'}
                    </Button>
                  )}
                </div>

                {pendingPayment && (
                  <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">Offerten är sparad men ännu inte skickad till kunden. Slutför betalningen när du är redo.</p>
                )}

                {active === request.id && !existing && (
                  <div className="border-t border-border mt-4 pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label htmlFor={`min-${request.id}`}>Pris från (kr)</Label><Input id={`min-${request.id}`} type="number" min="0" value={form.estimated_price_min} onChange={(event) => setForm({ ...form, estimated_price_min: event.target.value })} /></div>
                      <div><Label htmlFor={`max-${request.id}`}>Pris till (kr)</Label><Input id={`max-${request.id}`} type="number" min="0" value={form.estimated_price_max} onChange={(event) => setForm({ ...form, estimated_price_max: event.target.value })} /></div>
                    </div>
                    <div><Label htmlFor={`time-${request.id}`}>Beräknad tid</Label><Input id={`time-${request.id}`} value={form.estimated_time} onChange={(event) => setForm({ ...form, estimated_time: event.target.value })} placeholder="Exempel: cirka en timme eller två arbetsdagar" /></div>
                    <div><Label htmlFor={`message-${request.id}`}>Meddelande till kunden</Label><Textarea id={`message-${request.id}`} rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Beskriv vad ni rekommenderar, vad priset omfattar och när ni kan ta emot cykeln." /></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.can_pickup} onChange={(event) => setForm({ ...form, can_pickup: event.target.checked })} /> Vi kan hämta cykeln</label>
                    <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                      {workshop.free_leads_remaining > 0
                        ? `En av era ${workshop.free_leads_remaining} gratis-leads används. Ingen Stripe-betalning behövs.`
                        : `${LEAD_FEE_KR} kr exkl. moms debiteras via Stripe först när du går vidare. Kunden ser offerten efter genomförd betalning.`}
                    </div>
                    <Button onClick={() => submitOffer(request.id)} disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      {workshop.free_leads_remaining > 0 ? 'Skicka med gratis-lead' : `Granska och betala ${LEAD_FEE_KR} kr`}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WorkshopRequests
