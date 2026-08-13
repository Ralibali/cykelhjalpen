import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { QuoteDisclaimer } from '@/components/legal/QuoteDisclaimer'
import { motion } from 'framer-motion'
import { AlertTriangle, Bike, CheckCircle2, Clock3, Crown, ExternalLink, Loader2, Mail, MapPin, Phone, RefreshCw, Truck } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { trackClick } from '@/hooks/usePageTracking'
import { trackEvent } from '@/lib/analytics'
import { useT } from '@/lib/i18n'

interface WorkshopResponse {
  id: string
  message: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  estimated_time: string | null
  can_pickup: boolean
  status: string
  /** Backend sätter true först när vinsten är reglerad – då finns kontaktvägar. */
  contact_unlocked?: boolean
  workshop: {
    id?: string
    company_name: string
    phone: string | null
    email: string | null
    website: string | null
  } | null
}


interface RequestData {
  id: string
  customer_name: string
  bike_type: string
  repair_category: string
  description: string
  city: string
  urgency: string | null
  can_drop_off: boolean
  wants_pickup: boolean
  status: string
  admin_status: string
  rejected_reason: string | null
  created_at: string
}

interface RequestImage {
  id: string
  url: string
}

const POLL_MS = 30_000

const safeWebsite = (website: string | null | undefined) => {
  if (!website) return null
  try {
    const url = new URL(website)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

const CustomerResponses = () => {
  const t = useT()
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [request, setRequest] = useState<RequestData | null>(null)
  const [responses, setResponses] = useState<WorkshopResponse[]>([])
  const [images, setImages] = useState<RequestImage[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const knownIdsRef = useRef<Set<string>>(new Set())
  const firstLoadRef = useRef(true)

  const winner = responses.find((response) => response.status === 'won') || null
  const hasWinner = Boolean(winner) || request?.status === 'completed'
  // Vinsten är reglerad först när backend släppt kontaktuppgifterna.
  const winnerSettled = Boolean(winner?.contact_unlocked)


  const load = useCallback(async (showSpinner = false) => {
    if (!token) return
    if (showSpinner) setRefreshing(true)
    setLoadError(null)

    try {
      const { data, error } = await supabase.functions.invoke('get-bike-request-by-token', {
        body: { token },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const nextResponses: WorkshopResponse[] = data?.responses || []
      setRequest(data?.request || null)
      setImages(data?.images || [])

      if (firstLoadRef.current) {
        knownIdsRef.current = new Set(nextResponses.map((response) => response.id))
        firstLoadRef.current = false
      } else {
        for (const response of nextResponses) {
          if (!knownIdsRef.current.has(response.id)) {
            knownIdsRef.current.add(response.id)
            toast.success(t('Nytt prisförslag från {name}', { name: response.workshop?.company_name || t('verkstad') }))
          }
        }
      }
      setResponses(nextResponses)
    } catch (error) {
      setLoadError((error as Error)?.message || t('Kunde inte läsa ärendet just nu.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!token || request?.admin_status === 'rejected' || request?.status === 'closed_for_responses' || request?.status === 'full' || request?.status === 'expired' || request?.status === 'completed') return
    const id = window.setInterval(() => { load() }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, load, request?.admin_status, request?.status])

  const handleContact = (response: WorkshopResponse, channel: 'phone' | 'email' | 'website') => {
    trackClick('quote_contact_clicked', response.workshop?.company_name || 'verkstad', {
      workshop_id: response.workshop?.id,
      workshop_name: response.workshop?.company_name,
      channel,
      response_id: response.id,
    })
    // Buyer initiating contact with a workshop is our strongest client-side
    // "offer accepted" signal. Only pass low-cardinality city – no IDs, names
    // or free text – so this stays privacy-safe in Plausible.
    if (request?.city) trackEvent('Offer Accepted', { city: request.city })
  }

  // Kunden väljer vinnande verkstad. Valet är slutgiltigt och reglerar
  // ärendet: vinnaren betalar vinstavgiften (eller drar ett gratis-lead) och
  // får kundens kontaktuppgifter, övriga svar markeras som ej valda.
  const pickWinner = async (response: WorkshopResponse) => {
    if (!token) return
    setSelectingId(response.id)
    try {
      const { data, error } = await supabase.functions.invoke('select-bike-winner', {
        body: { token, response_id: response.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success(t('Du har valt {name}!', { name: response.workshop?.company_name || t('verkstaden') }), {
        description: data?.settled
          ? t('Verkstaden har fått dina kontaktuppgifter och hör av sig till dig inom kort.')
          : t('Verkstaden har meddelats och hör av sig så snart uppdraget är aktiverat.'),
      })

      if (request?.city) trackEvent('Winner Selected', { city: request.city })
      setConfirmingId(null)
      await load()
    } catch (error) {
      toast.error(t('Kunde inte registrera valet.'), {
        description: (error as Error)?.message || t('Försök igen om en stund.'),
      })
    } finally {
      setSelectingId(null)
    }
  }

  const mailSubject = (companyName?: string) =>
    encodeURIComponent(companyName ? t('Angående prisförslag på cykelreparation från {name}', { name: companyName }) : t('Angående prisförslag på cykelreparation'))

  const statusCard = () => {
    if (!request) return null

    if (request.admin_status === 'rejected') {
      return (
        <div className="sticker rounded-3xl border-destructive/30 bg-destructive/5 p-6 md:p-7 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center justify-center rounded-2xl bg-destructive/10 p-2.5">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </span>
            <h1 className="font-display text-2xl">{t('Ärendet behöver hjälp')}</h1>
          </div>
          <p className="text-sm">{t('Vi kunde inte publicera ärendet i sin nuvarande form.')}</p>
          {request.rejected_reason && <p className="text-sm mt-2"><strong>{t('Anledning:')}</strong> {request.rejected_reason}</p>}
          <p className="text-sm mt-3">{t('Kontakta')} <a className="underline font-medium" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a> {t('så hjälper vi dig vidare.')}</p>
        </div>
      )
    }

    if (request.admin_status !== 'approved') {
      return (
        <div className="sticker rounded-3xl bg-brand-sun/30 p-6 md:p-7 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center justify-center rounded-2xl bg-background/60 p-2.5">
              <Bike className="h-5 w-5" />
            </span>
            <h1 className="font-display text-2xl">{t('Tack {name}!', { name: request.customer_name })}</h1>
          </div>
          <p className="text-sm">{t('Ditt ärende är mottaget och granskas innan det publiceras för verkstäder i {city}. Du får ett mejl när granskningen är klar.', { city: request.city })}</p>
        </div>
      )
    }

    if (request.status === 'completed') {
      return (
        <div className="sticker rounded-3xl bg-[hsl(var(--brand-mint)/0.12)] p-6 md:p-7 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center justify-center rounded-2xl bg-[hsl(var(--brand-mint)/0.2)] p-2.5">
              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--brand-mint))]" />
            </span>
            <h1 className="font-display text-2xl">{t('Du har valt verkstad')}</h1>
          </div>
          <p className="text-sm">
            {winnerSettled
              ? t('{name} har fått dina kontaktuppgifter och hör av sig till dig inom kort.', { name: winner?.workshop?.company_name || t('Verkstaden') })
              : t('{name} har meddelats och hör av sig så snart uppdraget är aktiverat.', { name: winner?.workshop?.company_name || t('Verkstaden') })}
          </p>

        </div>
      )
    }

    return (
      <div className="sticker rounded-3xl bg-[hsl(var(--brand-mint)/0.12)] p-6 md:p-7 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center justify-center rounded-2xl bg-[hsl(var(--brand-mint)/0.2)] p-2.5">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--brand-mint))]" />
          </span>
          <h1 className="font-display text-2xl">{t('Ärendet är publicerat')}</h1>
        </div>
        <p className="text-sm">
          {request.status === 'expired'
            ? t('Svarstiden på tre dagar har gått ut och ingen verkstad hann svara. Du kan lägga upp ett nytt ärende när du vill.')
            : (request.status === 'closed_for_responses' || request.status === 'full')
              ? t('Ärendet är stängt för nya offerter. Jämför prisförslagen nedan och välj den verkstad du vill gå vidare med.')
              : responses.length > 0
                ? t('Du har fått prisförslag. Fler kan tillkomma tills tre verkstäder har svarat eller svarstiden på tre dagar går ut. Välj den verkstad du vill gå vidare med.')
                : t('Anslutna verkstäder i {city} kan nu se ärendet i tre dagar. Nya prisförslag visas här automatiskt.', { city: request.city })}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('Mitt cykelärende | Cykelhjälpen')}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <CykelNavbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
        ) : loadError ? (
          <div className="sticker bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold mb-2">{t('Kunde inte läsa ärendet')}</h1>
            <p className="text-muted-foreground mb-5">{loadError}</p>
            <Button onClick={() => load(true)} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {t('Försök igen')}
            </Button>
          </div>
        ) : !request ? (
          <div className="sticker bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold mb-2">{t('Ärendet hittades inte')}</h1>
            <p className="text-muted-foreground">{t('Kontakta info@cykelhjalpen.se om du behöver hjälp.')}</p>
          </div>
        ) : (
          <>
            {statusCard()}

            <section className="sticker rounded-3xl bg-card p-6 mb-8" aria-labelledby="request-summary-heading">
              <h2 id="request-summary-heading" className="font-display text-lg mb-3">{t('Ditt ärende')}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium"><MapPin className="h-3.5 w-3.5 text-primary" /> {request.city}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium"><Bike className="h-3.5 w-3.5 text-primary" /> {request.bike_type}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">{request.repair_category}</span>
                {request.urgency && <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-sun/40 px-3 py-1.5 text-xs font-medium"><Clock3 className="h-3.5 w-3.5" /> {request.urgency}</span>}
                {request.wants_pickup && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"><Truck className="h-3.5 w-3.5" /> {t('Önskar hämtning')}</span>}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{request.description}</p>
            </section>

            {images.length > 0 && (
              <section className="mb-8" aria-labelledby="request-images-heading">
                <h2 id="request-images-heading" className="font-display text-xl mb-3">{t('Dina bilder')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((image) => (
                    <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-2xl border-2 border-foreground bg-muted hover:opacity-90 transition">
                      <img src={image.url} alt={t('Uppladdad bild på cykelproblemet')} className="h-full w-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-xl">{t('Prisförslag ({count})', { count: responses.length })}</h2>
              {request.admin_status === 'approved' && request.status !== 'closed_for_responses' && request.status !== 'full' && request.status !== 'completed' && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--brand-mint))] opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--brand-mint))]" /></span>
                  {t('Uppdateras automatiskt')}
                </span>
              )}
            </div>

            {responses.length === 0 ? (
              <div className="sticker rounded-3xl bg-card p-8 text-center">
                <span className="inline-flex items-center justify-center rounded-2xl bg-muted p-4 mb-3">
                  <Clock3 className="h-6 w-6 text-muted-foreground" />
                </span>
                <p className="text-sm text-muted-foreground">
                  {request.admin_status === 'approved'
                    ? t('Inga prisförslag ännu. Verkstäderna svarar utifrån kapacitet och typ av reparation.')
                    : t('Prisförslag visas här efter att ärendet har godkänts och en verkstad har svarat.')}
                </p>
              </div>
            ) : (
              (() => {
                const priceOf = (r: WorkshopResponse) => (
                  r.estimated_price_min ?? r.estimated_price_max ?? Number.POSITIVE_INFINITY
                )
                const sorted = [...responses].sort((a, b) => priceOf(a) - priceOf(b))
                const cheapestId = sorted.find((r) => priceOf(r) !== Number.POSITIVE_INFINITY)?.id
                return (
                  <ol className="space-y-4 list-none p-0">
                    {sorted.map((response, index) => {
                      const email = response.workshop?.email
                      const phone = response.workshop?.phone
                      const website = safeWebsite(response.workshop?.website)
                      const company = response.workshop?.company_name
                      const isWinner = response.status === 'won'
                      const isLoser = hasWinner && !isWinner
                      // Kontaktvägar visas bara för en vald verkstad vars vinst är reglerad.
                      const contactUnlocked = isWinner && Boolean(response.contact_unlocked)
                      const isCheapest = response.id === cheapestId && sorted.length > 1 && !hasWinner

                      return (
                        <motion.li
                          key={response.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                          className={isLoser ? 'opacity-60' : ''}
                        >
                          <article className={`sticker rounded-3xl bg-card p-6 ${isWinner ? 'ring-2 ring-[hsl(var(--brand-mint))] ring-offset-2 ring-offset-background' : isCheapest ? 'ring-2 ring-[hsl(var(--brand-mint))] ring-offset-2 ring-offset-background' : ''}`}>
                            <div className="flex justify-between items-start gap-3 mb-3">
                              <div className="min-w-0 flex items-start gap-3">
                                <span className="hidden sm:inline-flex shrink-0 items-center justify-center h-11 w-11 rounded-2xl bg-primary/10 font-display text-lg text-primary">
                                  {(company || t('C')).charAt(0).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <h3 className="font-display text-xl leading-tight">{company || t('Cykelverkstad')}</h3>
                                  {isWinner && (
                                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold bg-[hsl(var(--brand-mint)/0.15)] text-[hsl(var(--brand-mint))] px-2.5 py-1 rounded-full">
                                      <CheckCircle2 className="h-3 w-3" /> {t('Ditt val')}
                                    </span>
                                  )}
                                  {isLoser && (
                                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                                      {t('Ej vald')}
                                    </span>
                                  )}
                                  {isCheapest && (
                                    <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold bg-[hsl(var(--brand-mint)/0.15)] text-[hsl(var(--brand-mint))] px-2.5 py-1 rounded-full">
                                      <Crown className="h-3 w-3" /> {t('Bästa pris')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {response.estimated_price_min !== null && (
                                <span className="text-right">
                                  <span className="block font-display text-2xl text-accent whitespace-nowrap">
                                    {response.estimated_price_min}{response.estimated_price_max ? `–${response.estimated_price_max}` : ''} kr
                                  </span>
                                  <span className="block text-[11px] text-muted-foreground mt-0.5">{t('inkl. moms')}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-sm mb-3 whitespace-pre-wrap leading-relaxed">{response.message}</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {response.estimated_time && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                  <Clock3 className="h-3 w-3" /> {response.estimated_time}
                                </span>
                              )}
                              {response.can_pickup && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                  <Truck className="h-3 w-3" /> {t('Kan hämta cykeln')}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                              {contactUnlocked && phone && (
                                <Button asChild size="sm" className="rounded-full shadow-brand" onClick={() => handleContact(response, 'phone')}>
                                  <a href={`tel:${phone}`} aria-label={t('Ring {name}', { name: company || t('verkstaden') })}><Phone className="h-4 w-4 mr-1.5" /> {t('Ring')}</a>
                                </Button>
                              )}
                              {contactUnlocked && email && (
                                <Button asChild size="sm" variant="outline" className="rounded-full border-2" onClick={() => handleContact(response, 'email')}>
                                  <a href={`mailto:${email}?subject=${mailSubject(company)}`} aria-label={t('Mejla {name}', { name: company || t('verkstaden') })}><Mail className="h-4 w-4 mr-1.5" /> {t('Mejla')}</a>
                                </Button>
                              )}
                              {contactUnlocked && website && (
                                <Button asChild size="sm" variant="outline" className="rounded-full border-2" onClick={() => handleContact(response, 'website')}>
                                  <a href={website} target="_blank" rel="noreferrer" aria-label={t('Öppna webbplatsen för {name}', { name: company || t('verkstaden') })}><ExternalLink className="h-4 w-4 mr-1.5" /> {t('Webbplats')}</a>
                                </Button>
                              )}
                              {isWinner && !contactUnlocked && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                                  <Clock3 className="h-3.5 w-3.5" /> {t('Verkstaden har meddelats och hör av sig så snart uppdraget är aktiverat.')}
                                </span>
                              )}
                              {!hasWinner && request.admin_status === 'approved' && response.status === 'sent' && (
                                confirmingId === response.id ? (
                                  <span className="flex flex-wrap items-center gap-2 rounded-2xl bg-[hsl(var(--brand-mint)/0.1)] px-3 py-2">

                                    <span className="text-xs font-medium">{t('Valet är slutgiltigt. Gå vidare med {name}?', { name: company || t('verkstaden') })}</span>
                                    <Button size="sm" className="rounded-full" disabled={selectingId === response.id} onClick={() => pickWinner(response)}>
                                      {selectingId === response.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                                      {t('Ja, välj verkstaden')}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="rounded-full" disabled={selectingId === response.id} onClick={() => setConfirmingId(null)}>
                                      {t('Avbryt')}
                                    </Button>
                                  </span>
                                ) : (
                                  <Button size="sm" variant="outline" className="rounded-full border-2 border-[hsl(var(--brand-mint))] text-[hsl(var(--brand-mint))] font-semibold" onClick={() => setConfirmingId(response.id)}>
                                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> {t('Välj denna verkstad')}
                                  </Button>
                                )
                              )}
                            </div>
                          </article>
                        </motion.li>
                      )
                    })}
                  </ol>
                )
              })()
            )}

            {responses.length > 0 && (
              <div className="mt-6">
                <QuoteDisclaimer variant="customer" />
              </div>
            )}
          </>
        )}
      </main>
      <CykelFooter />
    </div>
  )
}

export default CustomerResponses
