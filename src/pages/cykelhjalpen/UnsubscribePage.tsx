import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-unsubscribe`
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

type Status = 'loading' | 'ready' | 'already' | 'success' | 'invalid' | 'error'

const UnsubscribePage = () => {
  const { token = '' } = useParams()
  const [status, setStatus] = useState<Status>('loading')
  const [company, setCompany] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        })
        const data = await res.json().catch(() => null) as { ok?: boolean; company_name?: string; city?: string; already_unsubscribed?: boolean; error?: string } | null
        if (!res.ok || !data?.ok) {
          setStatus('invalid')
          setErrorMsg(data?.error || 'Länken är ogiltig eller har gått ut.')
          return
        }
        setCompany(data.company_name || null)
        setCity(data.city || null)
        setStatus(data.already_unsubscribed ? 'already' : 'ready')
      } catch (error) {
        setStatus('error')
        setErrorMsg((error as Error).message)
      }
    }
    if (token) load(); else setStatus('invalid')
  }, [token])

  const confirmUnsubscribe = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null
      if (!res.ok || !data?.ok) {
        setStatus('error')
        setErrorMsg(data?.error || 'Något gick fel. Kontakta info@cykelhjalpen.se.')
        return
      }
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMsg((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-12">
      <Helmet>
        <title>Avregistrering – Cykelhjalpen.se</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <div className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-sm space-y-5">
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl font-bold">Avregistrering</h1>
          <p className="text-sm text-muted-foreground">Cykelhjalpen.se – utskick till verkstäder</p>
        </div>

        {status === 'loading' && (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}

        {status === 'ready' && (
          <div className="space-y-4">
            <p className="text-sm">
              Vill ni avregistrera <strong>{company || 'er verkstad'}</strong>
              {city ? ` i ${city}` : ''} från våra rekryteringsmejl? Vi lägger då till er
              e-post och domän på vår spärrlista och kontaktar er inte igen.
            </p>
            <Button onClick={confirmUnsubscribe} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Ja, avregistrera oss
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Har vi kontaktat er av misstag? Mejla oss på <a className="underline" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a>.
            </p>
          </div>
        )}

        {status === 'already' && (
          <div className="space-y-2 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
            <p className="text-sm">{company || 'Er verkstad'} är redan avregistrerad. Vi skickar inte fler mejl.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-2 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
            <p className="text-sm">Klart. {company || 'Er verkstad'} är avregistrerad och kommer inte att få fler mejl från oss.</p>
            <p className="text-xs text-muted-foreground">Kontakta <a className="underline" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a> för rättelse eller radering.</p>
          </div>
        )}

        {(status === 'invalid' || status === 'error') && (
          <div className="space-y-2 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-600" />
            <p className="text-sm">{errorMsg || 'Länken kunde inte verifieras.'}</p>
            <p className="text-xs text-muted-foreground">Mejla <a className="underline" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a> så hjälper vi till manuellt.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UnsubscribePage
