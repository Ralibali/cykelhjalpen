import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Bike, Mail, Phone, Loader2, RefreshCw } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Button } from '@/components/ui/button'

interface Response {
  id: string
  message: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  estimated_time: string | null
  can_pickup: boolean
  workshop: { company_name: string; phone: string | null; email: string; website: string | null } | null
}

const CustomerResponses = () => {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [request, setRequest] = useState<any>(null)
  const [responses, setResponses] = useState<Response[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async (showSpinner = false) => {
    if (!token) return
    if (showSpinner) setRefreshing(true)
    setLoadError(null)

    try {
      const { data, error } = await supabase.functions.invoke('get-bike-request-by-token', {
        body: { token },
      })
      if (error) throw error
      setRequest(data?.request || null)
      setResponses(data?.responses || [])
    } catch (error) {
      setLoadError((error as Error)?.message || 'Kunde inte läsa ärendet just nu.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

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
                Ditt ärende är mottaget och granskas innan det publiceras för verkstäderna. Du får e-post när granskningen är klar och när nya prisförslag kommer in.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-xl font-bold">Prisförslag ({responses.length})</h2>
              <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
                {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Uppdatera
              </Button>
            </div>

            {responses.length === 0 ? (
              <div className="sticker bg-card p-6 text-center text-muted-foreground">
                Inga prisförslag ännu. När ärendet har godkänts brukar verkstäderna svara inom ett dygn.
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => (
                  <div key={response.id} className="sticker bg-card p-5">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h3 className="font-display font-bold text-lg">{response.workshop?.company_name || 'Cykelverkstad'}</h3>
                      {response.estimated_price_min !== null && (
                        <span className="font-bold text-accent whitespace-nowrap">
                          {response.estimated_price_min}{response.estimated_price_max ? `–${response.estimated_price_max}` : ''} kr
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-3 whitespace-pre-wrap">{response.message}</p>
                    {response.estimated_time && <p className="text-xs text-muted-foreground mb-2">Beräknad tid: {response.estimated_time}</p>}
                    {response.can_pickup && <p className="text-xs text-muted-foreground mb-2">Verkstaden kan erbjuda hämtning.</p>}
                    <div className="flex flex-wrap gap-3 text-sm pt-3 border-t border-border">
                      {response.workshop?.email && <a href={`mailto:${response.workshop.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="h-4 w-4" /> {response.workshop.email}</a>}
                      {response.workshop?.phone && <a href={`tel:${response.workshop.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-4 w-4" /> {response.workshop.phone}</a>}
                    </div>
                  </div>
                ))}
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
