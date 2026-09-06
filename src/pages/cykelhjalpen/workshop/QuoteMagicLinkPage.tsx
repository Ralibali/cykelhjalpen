import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Bike, Check, Clock3, Loader2, MapPin, Send, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { QuoteDisclaimer } from '@/components/legal/QuoteDisclaimer'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { supabase } from '@/integrations/supabase/client'
import { useT } from '@/lib/i18n'
import { formatKrFromOre, useV2Pricing } from '@/lib/v2/pricing'
import { validateQuoteForm } from '@/lib/workshopMagicQuote'

interface MagicRequest {
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
  customer_language: string | null
  city: string
  images?: { id: string; url: string }[]
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'disabled'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; request: MagicRequest; workshopName: string; alreadyQuoted: boolean }
  | { kind: 'success' }

const emptyForm = {
  message: '',
  estimated_price_min: '',
  estimated_price_max: '',
}

const QuoteMagicLinkPage = () => {
  const t = useT()
  const { token = '' } = useParams()
  const feeKr = formatKrFromOre(useV2Pricing().amountOre)
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data, error } = await supabase.functions.invoke('get-workshop-quote-link', {
        body: { token },
      })
      if (cancelled) return
      if (data?.disabled || data?.reason === 'flag_off') {
        setState({
          kind: 'disabled',
          message: data?.error || t('Funktionen är avstängd just nu.'),
        })
        return
      }
      if (error || data?.error || !data?.ok || !data.request) {
        setState({
          kind: 'error',
          message: data?.error || t('Länken är ogiltig eller har gått ut.'),
        })
        return
      }
      setState({
        kind: 'ready',
        request: data.request as MagicRequest,
        workshopName: data.workshop?.company_name || t('din verkstad'),
        alreadyQuoted: Boolean(data.already_quoted),
      })
    }
    if (token) load()
    else setState({ kind: 'error', message: t('Länken är ogiltig eller har gått ut.') })
    return () => { cancelled = true }
  }, [token, t])

  const submit = async () => {
    if (state.kind !== 'ready' || submitting) return
    const parsed = validateQuoteForm({
      message: form.message,
      estimated_price_min: form.estimated_price_min,
      estimated_price_max: form.estimated_price_max,
    })
    if (!parsed.ok) {
      setFormError(parsed.error)
      return
    }
    setFormError(null)
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('submit-workshop-quote-link', {
      body: {
        token,
        message: parsed.message,
        estimated_price_min: parsed.estimated_price_min,
        estimated_price_max: parsed.estimated_price_max,
      },
    })
    setSubmitting(false)
    if (data?.disabled || data?.reason === 'flag_off') {
      setState({ kind: 'disabled', message: data?.error || t('Funktionen är avstängd just nu.') })
      return
    }
    if (error || data?.error) {
      setFormError(data?.error || t('Kunde inte skicka offerten. Försök igen om en stund.'))
      return
    }
    setState({ kind: 'success' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Helmet>
        <title>{t('Lämna offert – Cykelhjälpen')}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <CykelNavbar />
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto w-full max-w-xl">
          {state.kind === 'loading' && (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
          )}

          {state.kind === 'disabled' && (
            <div className="rounded-3xl border bg-card p-8 text-center space-y-3">
              <h1 className="font-display text-2xl font-bold">{t('Funktionen är avstängd')}</h1>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <p className="text-sm text-muted-foreground">
                {t('Logga in på dashboarden om du redan har ett konto, eller hör av dig till oss.')}
              </p>
            </div>
          )}

          {state.kind === 'error' && (
            <div className="rounded-3xl border bg-card p-8 text-center space-y-3">
              <h1 className="font-display text-2xl font-bold">{t('Länken fungerar inte')}</h1>
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}

          {state.kind === 'success' && (
            <div className="rounded-3xl border bg-card p-8 text-center space-y-3">
              <div className="inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 p-3">
                <Check className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold">{t('Offerten är skickad')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('Kunden har fått den. Du betalar bara om kunden väljer dig.')}
              </p>
            </div>
          )}

          {state.kind === 'ready' && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">{state.workshopName}</p>
                <h1 className="font-display text-2xl font-bold">{t('Lämna offert')}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('Inget konto behövs – skicka svaret direkt här.')}
                </p>
              </div>

              <div className="sticker rounded-3xl bg-card p-5 md:p-6 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center justify-center rounded-xl bg-primary/10 p-1.5">
                    <Bike className="h-4 w-4 text-primary" />
                  </span>
                  <span className="font-display font-bold">{state.request.bike_type}</span>
                  <span className="text-muted-foreground text-sm">· {state.request.repair_category}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{state.request.description}</p>
                <div className="flex gap-2 text-xs flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {state.request.city}
                    {state.request.area ? ` · ${state.request.area}` : ''}
                  </span>
                  {state.request.postcode && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                      {state.request.postcode}
                    </span>
                  )}
                  {state.request.urgency && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-sun/40 px-2.5 py-1 font-medium">
                      <Clock3 className="h-3 w-3" /> {state.request.urgency}
                    </span>
                  )}
                  {state.request.wants_pickup && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                      <Truck className="h-3 w-3" /> {t('Önskar hämtning')}
                    </span>
                  )}
                </div>
                {state.request.images && state.request.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {state.request.images.map((image) => (
                      <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border bg-muted">
                        <img src={image.url} alt={t('Bild på cykelproblemet')} className="h-full w-full object-cover" loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {state.alreadyQuoted ? (
                <div className="rounded-3xl border bg-card p-6 text-center text-sm text-muted-foreground">
                  {t('Ni har redan skickat en offert på det här ärendet.')}
                </div>
              ) : (
                <div className="rounded-3xl border bg-card p-5 md:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="magic-min">{t('Pris från (kr, inkl. moms)')}</Label>
                      <Input
                        id="magic-min"
                        type="number"
                        min="0"
                        value={form.estimated_price_min}
                        onChange={(event) => setForm({ ...form, estimated_price_min: event.target.value })}
                        className="rounded-xl border-2 bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="magic-max">{t('Pris till (kr, inkl. moms)')}</Label>
                      <Input
                        id="magic-max"
                        type="number"
                        min="0"
                        value={form.estimated_price_max}
                        onChange={(event) => setForm({ ...form, estimated_price_max: event.target.value })}
                        className="rounded-xl border-2 bg-background"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="magic-message">{t('Kort meddelande till kunden')}</Label>
                    <Textarea
                      id="magic-message"
                      rows={4}
                      value={form.message}
                      onChange={(event) => setForm({ ...form, message: event.target.value })}
                      placeholder={t('Vad ni rekommenderar, vad priset täcker och när ni kan ta emot cykeln.')}
                      className="rounded-xl border-2 bg-background"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground rounded-xl bg-muted/50 px-3 py-2">
                    {t('Det är kostnadsfritt att svara. Först om kunden väljer dig betalar du {price} kr exkl. moms – eller så dras ett gratis-lead automatiskt om du har kvar.', { price: feeKr })}
                  </p>
                  <QuoteDisclaimer variant="workshop" />
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                  <Button
                    onClick={submit}
                    disabled={submitting}
                    className="w-full rounded-xl cta-playful bg-accent text-accent-foreground hover:bg-accent/90 h-11"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    {submitting ? t('Skickar offerten…') : t('Skicka offerten – kostnadsfritt')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <CykelFooter />
    </div>
  )
}

export default QuoteMagicLinkPage
