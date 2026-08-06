import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Bike, Loader2, Send, Check, MapPin, RefreshCw, Clock3, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QuoteDisclaimer } from '@/components/legal/QuoteDisclaimer'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { LEAD_FEE_KR } from '@/lib/pricing'
import { trackEvent } from '@/lib/analytics'
import type { WorkshopContext } from '@/components/cykelhjalpen/WorkshopLayout'
import { useT } from '@/lib/i18n'

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
  customer_language?: string | null
  images?: RequestImage[]
}

interface ExistingResponse {
  id: string
  request_id: string
  paid: boolean
  status: string
}

const emptyForm = {
  message: '',
  estimated_price_min: '',
  estimated_price_max: '',
  estimated_time: '',
  can_pickup: false,
}

const WorkshopRequests = () => {
  const t = useT()
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>()
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
      setLoadError(openData?.error || openError?.message || t('Kunde inte läsa öppna ärenden.'))
    } else {
      setRequests((openData?.requests || []) as RequestRow[])
    }

    if (mineError) toast.error(t('Kunde inte läsa dina tidigare offerter.'))
    setResponses((mine || []) as ExistingResponse[])
    setLoading(false)
  }

  useEffect(() => { load() }, [workshop.id, workshop.city])

  const toggleOffer = (requestId: string) => {
    setActive((current) => current === requestId ? null : requestId)
    setForm(emptyForm)
  }

  const validateOffer = () => {
    if (form.message.trim().length < 20) {
      toast.error(t('Beskriv ditt svar lite mer, minst tjugo tecken.'))
      return false
    }

    const min = form.estimated_price_min ? Number(form.estimated_price_min) : null
    const max = form.estimated_price_max ? Number(form.estimated_price_max) : null

    if ((min !== null && min < 0) || (max !== null && max < 0)) {
      toast.error(t('Priset kan inte vara negativt.'))
      return false
    }
    if (min !== null && max !== null && max < min) {
      toast.error(t('Pris till måste vara samma som eller högre än pris från.'))
      return false
    }
    return true
  }

  const readFunctionError = async (error: unknown, fallback = '') => {
    const context = (error as { context?: Response } | null)?.context
    if (!context || typeof context.json !== 'function') return fallback

    try {
      const body = await context.clone().json()
      return String(body?.error ?? fallback)
    } catch {
      return fallback
    }
  }

  const handleSendError = async (error: unknown, result: { error?: string } | null | undefined) => {
    const serverMessage = await readFunctionError(error)
    const message = String(result?.error || serverMessage || (error as Error | null)?.message || '')
    const isFull = /bike_request_full|ärendet är fullt/i.test(message)
    const isCompleted = /valt en (annan )?verkstad/i.test(message)

    if (isFull) {
      toast.error(t('Ärendet är fullt – tre verkstäder har redan svarat.'), {
        description: t('Offerten kunde inte skickas eftersom ärendet redan är fullt.'),
        duration: 10000,
      })
    } else if (isCompleted) {
      toast.info(t('Kunden har redan valt en verkstad för det här ärendet.'), { duration: 8000 })
    } else {
      toast.error(t('Kunde inte skicka offerten.'), {
        description: message || t('Något gick fel. Dina uppgifter finns kvar så att du kan försöka igen.'),
        duration: 8000,
      })
    }
  }

  const submitOffer = async (requestId: string) => {
    if (submitting || !validateOffer()) return
    setSubmitting(requestId)

    try {
      let response = responseByRequest.get(requestId)

      if (!response) {
        const { data, error } = await supabase
          .from('workshop_responses')
          .insert({
            request_id: requestId,
            workshop_id: workshop.id,
            message: form.message.trim(),
            estimated_price_min: form.estimated_price_min ? Number(form.estimated_price_min) : null,
            estimated_price_max: form.estimated_price_max ? Number(form.estimated_price_max) : null,
            estimated_time: form.estimated_time.trim() || null,
            can_pickup: form.can_pickup,
            status: 'draft',
          })
          .select('id, request_id, paid, status')
          .single()

        if (error || !data) {
          toast.error(t('Kunde inte spara offerten.'), {
            description: error?.message || t('Försök igen om en stund.'),
          })
          return
        }

        response = data as ExistingResponse
        setResponses((current) => [...current, response!])
      }

      const { data: result, error } = await supabase.functions.invoke('submit-bike-response', {
        body: { response_id: response.id },
      })

      if (error || result?.error) {
        await handleSendError(error, result)
        return
      }

      const sentResponse: ExistingResponse = {
        ...response,
        paid: Boolean(result?.paid ?? response.paid),
        status: 'sent',
      }

      setResponses((current) => {
        const withoutCurrent = current.filter((item) => item.request_id !== requestId)
        return [...withoutCurrent, sentResponse]
      })
      setActive(null)
      setForm(emptyForm)

      if (!result?.already_sent) {
        toast.success(t('Offerten är skickad! ✅'), {
          description: t('Kunden har fått ett mejl. Du betalar bara om kunden väljer dig.'),
        })
        trackEvent('Offer Submitted', { city: workshop.city, source: 'free_to_answer' })
      }
    } finally {
      setSubmitting(null)
    }
  }

  if (!workshop.approved) {
    return <div className="sticker bg-card p-6 text-center text-muted-foreground">{t('Ditt konto väntar på godkännande.')}</div>
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('Öppna ärenden')}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {t('Endast {city}', { city: workshop.city })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('Uppdatera')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      ) : loadError ? (
        <div className="sticker bg-card p-6 text-center">
          <p className="text-destructive mb-4">{loadError}</p>
          <Button onClick={load} variant="outline">{t('Försök igen')}</Button>
        </div>
      ) : requests.length === 0 ? (
        <div className="sticker rounded-3xl bg-card p-10 text-center">
          <div className="inline-flex items-center justify-center rounded-2xl bg-muted p-4 mb-4">
            <Bike className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-display text-xl mb-1">{t('Inga öppna ärenden i {city} just nu', { city: workshop.city })}</p>
          <p className="text-sm text-muted-foreground">{t('Nya ärenden dyker upp här så fort cyklister i din stad skickar in.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const existing = responseByRequest.get(request.id)
            const sent = existing?.status === 'sent' || existing?.status === 'won' || (existing?.paid && existing?.status !== 'lost')
            const isSubmitting = submitting === request.id

            return (
              <div key={request.id} className="sticker rounded-3xl bg-card p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center justify-center rounded-xl bg-primary/10 p-1.5"><Bike className="h-4 w-4 text-primary" /></span>
                      <span className="font-display font-bold">{request.bike_type}</span>
                      <span className="text-muted-foreground text-sm">· {request.repair_category}</span>
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{request.description}</p>
                    <div className="flex gap-2 mt-3 text-xs flex-wrap">
                      {request.area && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {request.area}
                        </span>
                      )}
                      {request.postcode && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">{request.postcode}</span>
                      )}
                      {request.urgency && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-sun/40 px-2.5 py-1 font-medium">
                          <Clock3 className="h-3 w-3" /> {request.urgency}
                        </span>
                      )}
                      {request.customer_language === 'en' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-mint/40 px-2.5 py-1 font-bold" title={t('Kunden skickade ärendet på engelska och förväntar sig svar på engelska.')}>
                          🇬🇧 {t('Svara på engelska')}
                        </span>
                      )}
                      {request.wants_pickup && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                          <Truck className="h-3 w-3" /> {t('Önskar hämtning')}
                        </span>
                      )}
                    </div>
                    {request.images && request.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                        {request.images.map((image) => (
                          <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border bg-muted">
                            <img src={image.url} alt={t('Bild på cykelproblemet')} className="h-full w-full object-cover" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {sent ? (
                    <span className="text-sm flex items-center gap-1.5 rounded-full bg-[hsl(var(--brand-mint)/0.15)] text-[hsl(var(--brand-mint))] font-medium px-3 py-1.5">
                      <Check className="h-4 w-4" /> {t('Offert skickad')}
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => toggleOffer(request.id)} disabled={isSubmitting}>
                      {active === request.id ? t('Stäng') : t('Lämna offert')}
                    </Button>
                  )}
                </div>

                {active === request.id && !sent && (
                  <div className="mt-5 space-y-4 rounded-2xl border-2 border-dashed border-border bg-muted/40 p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`min-${request.id}`}>{t('Pris från (kr, inkl. moms)')}</Label>
                        <Input id={`min-${request.id}`} type="number" min="0" value={form.estimated_price_min} onChange={(event) => setForm({ ...form, estimated_price_min: event.target.value })} className="rounded-xl border-2 bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`max-${request.id}`}>{t('Pris till (kr, inkl. moms)')}</Label>
                        <Input id={`max-${request.id}`} type="number" min="0" value={form.estimated_price_max} onChange={(event) => setForm({ ...form, estimated_price_max: event.target.value })} className="rounded-xl border-2 bg-background" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`time-${request.id}`}>{t('Beräknad tid')}</Label>
                      <Input id={`time-${request.id}`} value={form.estimated_time} onChange={(event) => setForm({ ...form, estimated_time: event.target.value })} placeholder={t('Exempel: cirka en timme eller två arbetsdagar')} className="rounded-xl border-2 bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`message-${request.id}`}>{t('Meddelande till kunden')}</Label>
                      <Textarea id={`message-${request.id}`} rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder={t('Beskriv vad ni rekommenderar, vad priset omfattar och när ni kan ta emot cykeln.')} className="rounded-xl border-2 bg-background" />
                    </div>
                    <p className="text-xs text-muted-foreground rounded-xl bg-background border border-border px-3 py-2">
                      {t('Offerten ska gälla det problem kunden beskrivit ovan. Avviker felet från beskrivningen ska kunden informeras och godkänna det nya priset innan arbetet fortsätter.')}
                    </p>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" className="h-4 w-4 rounded" checked={form.can_pickup} onChange={(event) => setForm({ ...form, can_pickup: event.target.checked })} />
                      {t('Vi kan hämta cykeln')}
                    </label>
                    <div className="rounded-xl bg-background p-3.5 text-xs text-muted-foreground border">
                      {t('Det är kostnadsfritt att svara. Först om kunden väljer dig betalar du {price} kr exkl. moms – eller så dras ett gratis-lead automatiskt om du har kvar.', { price: LEAD_FEE_KR })}
                    </div>
                    <QuoteDisclaimer variant="workshop" />
                    <Button onClick={() => submitOffer(request.id)} disabled={isSubmitting} className="w-full rounded-xl cta-playful bg-accent text-accent-foreground hover:bg-accent/90 h-11">
                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      {isSubmitting ? t('Skickar offerten…') : t('Skicka offerten – kostnadsfritt')}
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
