import { useEffect, useMemo, useState } from 'react'
import { Copy, Loader2, MessageSquare, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useT } from '@/lib/i18n'
import { setWorkshopMagicQuoteEnabled, useWorkshopMagicQuoteFlag } from '@/lib/workshopMagicQuote'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OpenRequest {
  id: string
  city: string
  repair_category: string
  bike_type: string
  created_at: string
}

const functionError = async (error: unknown, fallback: string) => {
  const response = (error as { context?: Response })?.context
  if (response instanceof Response) {
    try {
      const payload = await response.clone().json()
      if (typeof payload?.error === 'string') return payload.error
    } catch { /* fallback */ }
  }
  return (error as { message?: string })?.message || fallback
}

export function CopyQuoteSmsCard(props: {
  workshopId: string
  workshopCity: string
  workshopApproved: boolean
}) {
  const t = useT()
  const [flagOn, reloadFlag] = useWorkshopMagicQuoteFlag()
  const [toggling, setToggling] = useState(false)
  const [requests, setRequests] = useState<OpenRequest[]>([])
  const [requestId, setRequestId] = useState<string>('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data, error } = await supabase
        .from('bike_repair_requests')
        .select('id, city, repair_category, bike_type, created_at')
        .eq('admin_status', 'approved')
        .in('status', ['new', 'has_offers'])
        .order('created_at', { ascending: false })
        .limit(60)
      if (cancelled) return
      if (error) {
        setRequests([])
        return
      }
      const rows = (data || []) as OpenRequest[]
      rows.sort((a, b) => {
        const aSame = a.city === props.workshopCity ? 0 : 1
        const bSame = b.city === props.workshopCity ? 0 : 1
        return aSame - bSame
      })
      setRequests(rows)
    }
    load()
    return () => { cancelled = true }
  }, [props.workshopCity])

  const selected = useMemo(
    () => requests.find((row) => row.id === requestId) || null,
    [requests, requestId],
  )

  const copySms = async () => {
    if (!requestId) {
      toast.error(t('Välj ett ärende först.'))
      return
    }
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('create-workshop-quote-link', {
      body: { workshop_id: props.workshopId, request_id: requestId },
    })
    setBusy(false)
    if (error || data?.error) {
      toast.error(data?.error || await functionError(error, t('Kunde inte skapa länken.')))
      return
    }
    try {
      await navigator.clipboard.writeText(String(data.sms || ''))
      toast.success(
        data.same_city === false
          ? t('SMS kopierat. Observera: ärendet är i en annan stad än verkstaden.')
          : t('Offert-SMS kopierat. Klistra in det i valfri SMS-app.'),
      )
    } catch {
      toast.error(t('Länken skapades men gick inte att kopiera. Kopiera manuellt: {sms}', { sms: data.sms }))
    }
  }

  const toggleFlag = async (enabled: boolean) => {
    setToggling(true)
    try {
      await setWorkshopMagicQuoteEnabled(enabled)
      const { data: auth } = await supabase.auth.getUser()
      if (auth.user) {
        await supabase.from('audit_log').insert({
          admin_id: auth.user.id,
          action: enabled ? 'feature_flag_enabled' : 'feature_flag_disabled',
          target_type: 'feature_flag',
          details: { key: 'workshop_magic_quote' },
        })
      }
      toast.success(enabled ? t('Offert-SMS är påslaget.') : t('Offert-SMS är avstängt.'))
      reloadFlag()
    } catch {
      toast.error(t('Kunde inte ändra inställningen. Är du inloggad som admin?'))
    } finally {
      setToggling(false)
    }
  }

  if (flagOn === false) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div>
          <h2 className="font-display font-semibold mb-1">{t('Offert-SMS')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('Avstängt. När det är påslaget kan du kopiera ett SMS med en länk där verkstaden lämnar offert på ett riktigt ärende utan att logga in. Inget skickas automatiskt.')}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" disabled={toggling}>
              {toggling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Power className="h-4 w-4 mr-1" />}
              {t('Slå på offert-SMS')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('Slå på offert-SMS?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('Admins kan då skapa engångslänkar (giltiga i 48 timmar) som låter en godkänd verkstad lämna offert utan att logga in. Ni skickar själva SMS:et. Du kan stänga av det här igen när som helst, och då slutar alla oanvända länkar att fungera direkt.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('Avbryt')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => toggleFlag(true)}>{t('Slå på')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-semibold">{t('Offert-SMS')}</h2>
          {flagOn === true && (
            <Button variant="ghost" size="sm" disabled={toggling} onClick={() => toggleFlag(false)}>
              {t('Stäng av')}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t('Kopiera ett SMS med länk så verkstaden kan lämna offert utan att logga in. Skickas inte automatiskt.')}
        </p>
      </div>
      {!props.workshopApproved ? (
        <p className="text-sm text-muted-foreground">{t('Godkänn verkstaden först.')}</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('Inga öppna godkända ärenden just nu.')}</p>
      ) : (
        <>
          <Select value={requestId} onValueChange={setRequestId} disabled={flagOn !== true}>
            <SelectTrigger aria-label={t('Välj ärende')}>
              <SelectValue placeholder={t('Välj ärende')} />
            </SelectTrigger>
            <SelectContent>
              {requests.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.city === props.workshopCity ? '★ ' : ''}
                  {row.city} · {row.repair_category} · {row.bike_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && selected.city !== props.workshopCity && (
            <p className="text-xs text-amber-700">
              {t('Annan stad än verkstaden ({city}). Fungerar, men samma stad är bättre.', { city: selected.city })}
            </p>
          )}
          <Button onClick={copySms} disabled={busy || flagOn !== true || !requestId} size="sm">
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
            <MessageSquare className="h-4 w-4 mr-1" />
            {t('Kopiera offert-SMS')}
          </Button>
        </>
      )}
    </div>
  )
}
