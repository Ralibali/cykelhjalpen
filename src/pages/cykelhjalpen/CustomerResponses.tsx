import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Bike, Mail, Phone, Loader2, RefreshCw } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { trackClick } from '@/hooks/usePageTracking'

interface Response {
  id: string
  message: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  estimated_time: string | null
  can_pickup: boolean
  workshop: { id?: string; company_name: string; phone: string | null; email: string; website: string | null } | null
}

const POLL_MS = 30_000

const CustomerResponses = () => {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [request, setRequest] = useState<any>(null)
  const [responses, setResponses] = useState<Response[]>([])
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
      const nextResponses: Response[] = data?.responses || []
      setRequest(data?.request || null)

      if (firstLoadRef.current) {
        knownIdsRef.current = new Set(nextResponses.map((r) => r.id))
        firstLoadRef.current = false
      } else {
        for (const r of nextResponses) {
          if (!knownIdsRef.current.has(r.id)) {
            knownIdsRef.current.add(r.id)
            toast.success(`Nytt prisförslag från ${r.workshop?.company_name || 'verkstad'}`)
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
    if (!token) return
    const id = window.setInterval(() => { load() }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, load])

  const handleContact = (response: Response, channel: 'phone' | 'email') => {
    trackClick('quote_contact_clicked', response.workshop?.company_name || 'verkstad', {
      workshop_id: response.workshop?.id,
      workshop_name: response.workshop?.company_name,
      channel,
      response_id: response.id,
    })
  }

  const mailSubject = (companyName?: string) =>
    encodeURIComponent(`Angående prisförslag på cykelreparation${companyName ? ` från ${companyName}` : ''}`)

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mitt cykelärende | Cykelhjälpen</title>
        <meta name="robots" content="noindex, nofollow" />
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
            <div className="sticker bg-brand-sun/30 p-6 mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Bike className="h-6 w-6" />
                <h1 className="font-display text-2xl font-bold">Tack {request.customer_name}!</h1>
              </div>
              <p className="text-sm">
                Ditt ärende är mottaget och granskas innan det publiceras för verkstäderna. Nya prisförslag dyker upp här automatiskt.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-xl font-bold">Prisförslag ({responses.length})</h2>
              <span className="text-xs text-muted-foreground">Uppdateras automatiskt</span>
            </div>

            {responses.length === 0 ? (
              <div className="sticker bg-card p-6 text-center text-muted-foreground">
                Inga prisförslag ännu. När ärendet har godkänts brukar verkstäderna svara inom ett dygn.
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => {
                  const email = response.workshop?.email
                  const phone = response.workshop?.phone
                  const company = response.workshop?.company_name
                  return (
                    <div key={response.id} className="sticker bg-card p-5">
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
                      </div>
                    </div>
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
