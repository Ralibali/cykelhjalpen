import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, Check, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { useT } from '@/lib/i18n'

interface WorkshopRow {
  id: string
  company_name: string
  email: string
  phone: string | null
  city: string | null
  approved: boolean
  created_at: string
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

const AdminWorkshops = () => {
  const t = useT()
  const [items, setItems] = useState<WorkshopRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('workshops')
      .select('id, company_name, email, phone, city, approved, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(t('Kunde inte läsa verkstäder: {msg}', { msg: error.message }))
      setItems([])
    } else {
      setItems((data as WorkshopRow[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setApproved = async (workshop: WorkshopRow, approved: boolean) => {
    if (!approved && !window.confirm(t('Pausa åtkomsten för {name}? Verkstaden kan inte svara på nya ärenden förrän den godkänns igen.', { name: workshop.company_name }))) return

    setBusy(workshop.id)
    const { data, error } = await supabase.functions.invoke('review-workshop', {
      body: { workshop_id: workshop.id, action: approved ? 'approve' : 'reject' },
    })
    setBusy(null)

    if (error || data?.error) {
      toast.error(data?.error || await functionError(error, t('Kunde inte uppdatera verkstaden.')))
      return
    }

    toast.success(approved
      ? t('{name} är godkänd och har meddelats.', { name: workshop.company_name })
      : t('{name} är pausad och har meddelats.', { name: workshop.company_name }))
    await load()
  }

  return (
    <CykelAdminLayout>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('Verkstäder')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Godkänn nya verkstäder eller pausa åtkomsten utan att radera kontot.')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('Uppdatera')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">{t('Inga verkstäder har registrerat sig ännu.')}</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left p-3">{t('Företag')}</th>
                <th className="text-left p-3">{t('Kontakt')}</th>
                <th className="text-left p-3">{t('Registrerad')}</th>
                <th className="text-left p-3">{t('Status')}</th>
                <th className="text-right p-3">{t('Åtgärd')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((workshop) => (
                <tr key={workshop.id} className="border-t align-top">
                  <td className="p-3">
                    <div className="font-medium">{workshop.company_name}</div>
                    <div className="text-xs text-muted-foreground">{workshop.city || t('Stad saknas')}</div>
                  </td>
                  <td className="p-3">
                    <div>{workshop.email}</div>
                    <div className="text-xs text-muted-foreground">{workshop.phone || t('Telefon saknas')}</div>
                  </td>
                  <td className="p-3 whitespace-nowrap">{new Date(workshop.created_at).toLocaleDateString('sv-SE')}</td>
                  <td className="p-3">
                    <span className={`text-xs rounded-full px-2 py-1 font-medium ${workshop.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {workshop.approved ? t('Godkänd') : t('Väntar/pausad')}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {workshop.approved ? (
                      <Button size="sm" variant="outline" onClick={() => setApproved(workshop, false)} disabled={busy === workshop.id}>
                        {busy === workshop.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4 mr-1" /> {t('Pausa')}</>}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setApproved(workshop, true)} disabled={busy === workshop.id || !workshop.city}>
                        {busy === workshop.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> {t('Godkänn')}</>}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CykelAdminLayout>
  )
}

export default AdminWorkshops
