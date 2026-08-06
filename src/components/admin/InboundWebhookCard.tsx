import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, ShieldCheck, ShieldAlert, Webhook, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'

/**
 * Visar status och adress för Resends inbound-webhook som tar emot
 * mejl till info@cykelhjalpen.se. Pingar funktionen (GET) för att se
 * att den är deployad; signaturhemligheten ligger som secret i backend.
 */
const WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/inbound-email-webhook`

const InboundWebhookCard = () => {
  const t = useT()
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(WEBHOOK_URL)
      .then((res) => res.json())
      .then((body: { ok?: boolean; version?: string }) => {
        if (!active) return
        setStatus(body?.ok ? 'ok' : 'error')
        setVersion(body?.version ?? null)
      })
      .catch(() => active && setStatus('error'))
    return () => { active = false }
  }, [])

  const copy = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL)
    toast.success(t('Webhook-adressen kopierad'))
  }

  return (
    <div className="mb-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold">
            <Webhook className="h-4 w-4" /> {t('Inkommande mejl-webhook')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Lägg denna adress som endpoint i Resend (event: email.received) för info@cykelhjalpen.se.')}
          </p>
          <code className="mt-2 block break-all rounded bg-muted px-2 py-1 text-xs">{WEBHOOK_URL}</code>
        </div>
        <div className="flex items-center gap-2">
          {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === 'ok' && (
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> {t('Aktiv, signatur verifieras')}
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              <ShieldAlert className="h-3.5 w-3.5" /> {t('Svarar inte')}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="mr-1.5 h-4 w-4" /> {t('Kopiera')}
          </Button>
        </div>
      </div>
      {version && (
        <p className="mt-2 text-xs text-muted-foreground">{t('Version')}: {version}</p>
      )}
    </div>
  )
}

export default InboundWebhookCard
