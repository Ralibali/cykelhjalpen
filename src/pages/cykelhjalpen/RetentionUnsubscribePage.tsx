// V2 S8: avregistrering från servicepåminnelser (kunder, kontolösa).
// Token = unsubscribe_token på v2_retention_contacts. Samma mönster som
// UnsubscribePage (verkstads-outreach) men mot v2-retention-unsubscribe.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v2-retention-unsubscribe`
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

type Status = 'loading' | 'ready' | 'already' | 'success' | 'invalid' | 'error'

const RetentionUnsubscribePage = () => {
  const t = useT()
  const { token = '' } = useParams()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        })
        const data = await res.json().catch(() => null) as { ok?: boolean; already_unsubscribed?: boolean; error?: string } | null
        if (!res.ok || !data?.ok) {
          setStatus('invalid')
          setErrorMsg(t('Länken är ogiltig eller har gått ut.'))
          return
        }
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
        setErrorMsg(data?.error || t('Något gick fel. Kontakta info@cykelhjalpen.se.'))
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
        <title>{t('Avsluta påminnelser – Cykelhjälpen')}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <div className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-sm space-y-5">
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl font-bold">{t('Avsluta servicepåminnelser')}</h1>
          <p className="text-sm text-muted-foreground">{t('Cykelhjälpen – påminnelser till dig som kund')}</p>
        </div>

        {status === 'loading' && (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}

        {status === 'ready' && (
          <div className="space-y-4">
            <p className="text-sm">
              {t('Vill du avsluta våra servicepåminnelser? Du får då inga fler mejl om vårservice eller underhåll. Mejl om pågående ärenden påverkas inte.')}
            </p>
            <Button onClick={confirmUnsubscribe} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('Ja, avsluta påminnelserna')}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t('Har vi kontaktat dig av misstag? Mejla')} <a className="underline" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a>.
            </p>
          </div>
        )}

        {status === 'already' && (
          <div className="space-y-2 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
            <p className="text-sm">{t('Påminnelserna är redan avstängda. Vi skickar inga fler.')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-2 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
            <p className="text-sm">{t('Klart. Påminnelserna är avstängda och schemalagda utskick har stoppats.')}</p>
            <p className="text-xs text-muted-foreground">{t('Kontakta')} <a className="underline" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a> {t('för rättelse eller radering.')}</p>
          </div>
        )}

        {(status === 'invalid' || status === 'error') && (
          <div className="space-y-2 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-600" />
            <p className="text-sm">{errorMsg || t('Länken kunde inte verifieras.')}</p>
            <p className="text-xs text-muted-foreground">{t('Mejla')} <a className="underline" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a> {t('så hjälper vi till manuellt.')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RetentionUnsubscribePage
