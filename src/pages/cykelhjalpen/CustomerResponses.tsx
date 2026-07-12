import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { AlertTriangle, Bike, CheckCircle2, ExternalLink, Loader2, Mail, MapPin, Phone, RefreshCw } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { trackClick } from '@/hooks/usePageTracking'

interface WorkshopResponse {
  id: string
  message: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  estimated_time: string | null
  can_pickup: boolean
  workshop: {
    id?: string
    company_name: string
    phone: string | null
    email: string
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
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [request, setRequest] = useState<RequestData | null>(null)
  const [responses, setResponses] = useState<WorkshopResponse[]>([])
  const [images, setImages] = useState<RequestImage[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const knownIdsRef = useRef<Set<string>>(new Set())
  const firstLoadRef = useRef(true)

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
            toast.success(`Nytt prisförslag från ${response.workshop?.company_name || 'verkstad'}`)
          }
        }
      }
      setResponses(nextResponses)
    } catch (error) {
      setLoadError((error as Error)?.message || 'Kunde inte läsa ärendet just nu.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!token || request?.admin_status === 'rejected' || request?.status === 'full') return
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
  }

  const mailSubject = (companyName?: string) =>
    encodeURIComponent(`Angående prisförslag på cykelreparation${companyName ? ` från ${companyName}` : ''}`)

  const statusCard = () => {
    if (!request) return null

    if (request.admin_status === 'rejected') {
      return (
        <div className="sticker border-destructive/30 bg-destructive/5 p-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <h1 className="font-display text-2xl font-bold">Ärendet behöver hjälp</h1>
          </div>
          <p className="text-sm">Vi kunde inte publicera ärendet i sin nuvarande form.</p>
          {request.rejected_reason && <p className="text-sm mt-2"><strong>Anledning:</strong> {request.rejected_reason}</p>}
          <p className="text-sm mt-3">Kontakta <a className="underline" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a> så hjälper vi dig vidare.</p>
        </div>
      )
    }

    if (request.admin_status !== 'approved') {
      return (
        <div className="sticker bg-brand-sun/30 p-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bike className="h-6 w-6" />
            <h1 className="font-display text-2xl font-bold">Tack {request.customer_name}!</h1>
          </div>
          <p className="text-sm">Ditt ärende är mottaget och granskas innan det publiceras för verkstäder i {request.city}. Du får ett mejl när granskningen är klar.</p>
        </div>
      )
    }

    return (
      <div className="sticker bg-emerald-50 p-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          <h1 className="font-display text-2xl font-bold">Ärendet är publicerat</h1>
        </div>
        <p className="text-sm">
          {request.status === 'full'
            ? 'Du har fått maximalt fem prisförslag. Jämför dem nedan och kontakta den verkstad som passar dig bäst.'
            : responses.length > 0
              ? 'Du har fått prisförslag. Fler kan tillkomma tills fem verkstäder har svarat.'
              : `Anslutna verkstäder i ${request.city} kan nu se ärendet. Nya prisförslag visas här automatiskt.`}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mitt cykelärende | Cykelhjälpen</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <CykelNavbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
        ) : loadError ? (
          <div className="sticker bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold mb-2">Kunde inte läsa ärendet</h1>
            <p className="text-muted-foreground mb-5">{loadError}</p>
            <Button onClick={() => load(true)} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Försök igen
            </Button>
          </div>
        ) : !request ? (
          <div className="sticker bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold mb-2">Ärendet hittades inte</h1>
            <p className="text-muted-foreground">Kontakta info@cykelhjalpen.se om du behöver hjälp.</p>
          </div>
        ) : (
          <>
            {statusCard()}

            <section className="sticker bg-card p-5 mb-8" aria-labelledby="request-summary-heading">
              <h2 id="request-summary-heading" className="font-display font-bold text-lg mb-2">Ditt ärende</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {request.city}</span>
                <span>{request.bike_type}</span>
                <span>{request.repair_category}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{request.description}</p>
            </section>

            {images.length > 0 && (
              <section className="mb-8" aria-labelledby="request-images-heading">
                <h2 id="request-images-heading" className="font-display text-xl font-bold mb-3">Dina bilder</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((image) => (
                    <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-xl border bg-muted">
                      <img src={image.url} alt="Uppladdad bild på cykelproblemet" className="h-full w-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-xl font-bold">Prisförslag ({responses.length})</h2>
              {request.admin_status === 'approved' && request.status !== 'full' && <span className="text-xs text-muted-foreground">Uppdateras automatiskt</span>}
            </div>

            {responses.length === 0 ? (
              <div className="sticker bg-card p-6 text-center text-muted-foreground">
                {request.admin_status === 'approved'
                  ? 'Inga prisförslag ännu. Verkstäderna svarar utifrån kapacitet och typ av reparation.'
                  : 'Prisförslag visas här efter att ärendet har godkänts och en verkstad har svarat.'}
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => {
                  const email = response.workshop?.email
                  const phone = response.workshop?.phone
                  const website = safeWebsite(response.workshop?.website)
                  const company = response.workshop?.company_name
                  return (
                    <article key={response.id} className="sticker bg-card p-5">
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <h3 className="font-display font-bold text-lg">{company || 'Cykelverkstad'}</h3>
                        {response.estimated_price_min !== null && (
                          <span className="font-bold text-accent whitespace-nowrap">
                            {response.estimated_price_min}{response.estimated_price_max ? `–${response.estimated_price_max}` : ''} kr
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-3 whitespace-pre-wrap">{response.message}</p>
                      {response.estimated_time && <p className="text-xs text-muted-foreground mb-2">Beräknad tid: {response.estimated_time}</p>}
                      {response.can_pickup && <p className="text-xs text-muted-foreground mb-2">Verkstaden kan erbjuda hämtning.</p>}
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                        {phone && (
                          <Button asChild size="sm" variant="default" onClick={() => handleContact(response, 'phone')}>
                            <a href={`tel:${phone}`}><Phone className="h-4 w-4 mr-1.5" /> Ring</a>
                          </Button>
                        )}
                        {email && (
                          <Button asChild size="sm" variant="outline" onClick={() => handleContact(response, 'email')}>
                            <a href={`mailto:${email}?subject=${mailSubject(company)}`}><Mail className="h-4 w-4 mr-1.5" /> Mejla</a>
                          </Button>
                        )}
                        {website && (
                          <Button asChild size="sm" variant="outline" onClick={() => handleContact(response, 'website')}>
                            <a href={website} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" /> Webbplats</a>
                          </Button>
                        )}
                      </div>
                    </article>
                  )
                })}
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
