import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Bike, Mail, Phone, Loader2 } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

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
  const [request, setRequest] = useState<any>(null)
  const [responses, setResponses] = useState<Response[]>([])

  useEffect(() => {
    const load = async () => {
      // Public read by token via edge function would be safer; using RPC-less query is blocked by RLS.
      // Fallback: call edge function for token-based view.
      try {
        const { data, error } = await supabase.functions.invoke('get-bike-request-by-token', {
          body: { token },
        })
        if (error) throw error
        setRequest(data?.request || null)
        setResponses(data?.responses || [])
      } catch (e) {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    if (token) load()
  }, [token])

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Mitt cykelärende | Cykelhjälpen</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <CykelNavbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
        ) : !request ? (
          <div className="sticker bg-card p-8 text-center">
            <h1 className="font-display text-2xl font-bold mb-2">Ärendet hittades inte</h1>
            <p className="text-muted-foreground">Länken kan ha gått ut. Kontakta info@cykelhjalpen.se om du behöver hjälp.</p>
          </div>
        ) : (
          <>
            <div className="sticker bg-brand-sun/30 p-6 mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Bike className="h-6 w-6" />
                <h1 className="font-display text-2xl font-bold">Tack {request.customer_name}!</h1>
              </div>
              <p className="text-sm">Ditt ärende är skickat till lokala cykelverkstäder i Linköping. Du får e-post när nya prisförslag kommer in.</p>
            </div>

            <h2 className="font-display text-xl font-bold mb-4">Prisförslag ({responses.length})</h2>
            {responses.length === 0 ? (
              <div className="sticker bg-card p-6 text-center text-muted-foreground">
                Inga svar än. Verkstäderna brukar svara inom ett dygn.
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((r) => (
                  <div key={r.id} className="sticker bg-card p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-display font-bold text-lg">{r.workshop?.company_name}</h3>
                      {r.estimated_price_min !== null && (
                        <span className="font-bold text-accent">
                          {r.estimated_price_min}{r.estimated_price_max ? `–${r.estimated_price_max}` : ''} kr
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-3">{r.message}</p>
                    {r.estimated_time && <p className="text-xs text-muted-foreground mb-2">Beräknad tid: {r.estimated_time}</p>}
                    <div className="flex flex-wrap gap-3 text-sm pt-3 border-t border-border">
                      {r.workshop?.email && <a href={`mailto:${r.workshop.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="h-4 w-4" /> {r.workshop.email}</a>}
                      {r.workshop?.phone && <a href={`tel:${r.workshop.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-4 w-4" /> {r.workshop.phone}</a>}
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
