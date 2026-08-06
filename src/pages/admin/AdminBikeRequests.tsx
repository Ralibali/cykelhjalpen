import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Check, ExternalLink, Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { useT } from '@/lib/i18n'

interface BikeRequestRow {
  id: string
  view_token: string | null
  created_at: string
  customer_name: string
  customer_email: string
  bike_type: string
  repair_category: string
  description: string
  city: string
  status: string
  admin_status: string
  rejected_reason?: string | null
  workshop_responses?: { id: string; paid: boolean; workshop_id: string }[]
}

const functionError = async (error: unknown, fallback: string) => {
  const response = (error as any)?.context
  if (response instanceof Response) {
    try {
      const payload = await response.clone().json()
      if (typeof payload?.error === 'string') return payload.error
    } catch {
      // Fall through to the standard message.
    }
  }
  return (error as any)?.message || fallback
}

const AdminBikeRequests = () => {
  const t = useT()
  const [items, setItems] = useState<BikeRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bike_repair_requests')
      .select('id, view_token, created_at, customer_name, customer_email, bike_type, repair_category, description, city, status, admin_status, rejected_reason, workshop_responses(id, paid, workshop_id)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(t('Kunde inte läsa cykelärenden: {msg}', { msg: error.message }))
      setItems([])
    } else {
      setItems((data as BikeRequestRow[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const review = async (item: BikeRequestRow, decision: 'approved' | 'rejected') => {
    let reason: string | null = null
    if (decision === 'rejected') {
      reason = window.prompt(
        t('Skriv en kort och tydlig anledning som kunden får se:'),
        item.rejected_reason || t('Beskrivningen behöver kompletteras innan ärendet kan publiceras.'),
      )
      if (reason === null) return
      if (reason.trim().length < 5) {
        toast.error(t('Skriv en tydligare anledning innan ärendet avvisas.'))
        return
      }
    }

    setBusy(item.id)
    const { data, error } = await supabase.functions.invoke('review-bike-request', {
      body: { request_id: item.id, decision, reason },
    })
    setBusy(null)

    if (error || data?.error) {
      toast.error(data?.error || await functionError(error, t('Kunde inte uppdatera ärendet.')))
      return
    }

    toast.success(decision === 'approved'
      ? t('Ärendet är godkänt. Kunden och lokala verkstäder har meddelats.')
      : t('Ärendet är avvisat och kunden har fått anledningen.'))
    await load()
  }

  return (
    <CykelAdminLayout>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('Cykelärenden')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Granska förfrågningar innan de blir synliga för verkstäder.')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('Uppdatera')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">{t('Inga cykelärenden ännu.')}</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl bg-card">
          <table className="w-full text-sm min-w-[1050px]">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left p-3">{t('Datum')}</th>
                <th className="text-left p-3">{t('Kund')}</th>
                <th className="text-left p-3">{t('Ärende')}</th>
                <th className="text-left p-3">{t('Stad')}</th>
                <th className="text-left p-3">{t('Granskning')}</th>
                <th className="text-left p-3">{t('Offerter')}</th>
                <th className="text-right p-3">{t('Åtgärder')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const responses = item.workshop_responses || []
                const paidResponses = responses.filter((response) => response.paid).length
                const isBusy = busy === item.id
                return (
                  <tr key={item.id} className="border-t align-top">
                    <td className="p-3 whitespace-nowrap">{new Date(item.created_at).toLocaleString('sv-SE')}</td>
                    <td className="p-3">
                      <div className="font-medium">{item.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{item.customer_email}</div>
                    </td>
                    <td className="p-3 max-w-sm">
                      <div className="font-medium">{item.bike_type} · {item.repair_category}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.description}</div>
                      {item.admin_status === 'rejected' && item.rejected_reason && (
                        <div className="text-xs text-destructive mt-2">{t('Anledning:')} {item.rejected_reason}</div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">{item.city}</td>
                    <td className="p-3">
                      <span className={`text-xs rounded-full px-2 py-1 font-medium ${
                        item.admin_status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.admin_status === 'rejected'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.admin_status === 'approved' ? t('Godkänd') : item.admin_status === 'rejected' ? t('Avvisad') : t('Väntar')}
                      </span>
                    </td>
                    <td className="p-3">{t('{paid} betalda / {total} totalt', { paid: paidResponses, total: responses.length })}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {item.view_token && (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/mitt-arende/${item.view_token}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">{t('Öppna kundvy')}</span>
                            </Link>
                          </Button>
                        )}
                        {item.admin_status !== 'approved' && (
                          <Button size="sm" onClick={() => review(item, 'approved')} disabled={isBusy}>
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                            {t('Godkänn')}
                          </Button>
                        )}
                        {item.admin_status !== 'rejected' && (
                          <Button size="sm" variant="outline" onClick={() => review(item, 'rejected')} disabled={isBusy}>
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                            {t('Avvisa')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </CykelAdminLayout>
  )
}

export default AdminBikeRequests
