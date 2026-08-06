import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Check, X, RefreshCw, Gift } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { useT } from '@/lib/i18n'

interface WorkshopRow {
  id: string
  company_name: string
  email: string
  phone: string | null
  city: string | null
  approved: boolean
  free_leads_remaining: number
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
  const [grantTarget, setGrantTarget] = useState<WorkshopRow | null>(null)
  const [grantMode, setGrantMode] = useState<'add' | 'remove'>('add')
  const [grantAmount, setGrantAmount] = useState(2)
  const [grantReason, setGrantReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('workshops')
      .select('id, company_name, email, phone, city, approved, free_leads_remaining, created_at')
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

  const openGrantDialog = (workshop: WorkshopRow, mode: 'add' | 'remove' = 'add') => {
    setGrantTarget(workshop)
    setGrantMode(mode)
    setGrantAmount(mode === 'remove' ? Math.min(1, workshop.free_leads_remaining || 1) : 2)
    setGrantReason('')
  }

  const submitGrant = async () => {
    if (!grantTarget) return
    const amount = Math.floor(grantAmount)
    if (!Number.isFinite(amount) || amount < 1 || amount > 50) {
      toast.error(t('Ange ett antal mellan 1 och 50.'))
      return
    }
    const delta = grantMode === 'remove' ? -amount : amount
    setBusy(grantTarget.id)

    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('free_lead_grants').insert({
      workshop_id: grantTarget.id,
      admin_id: userData?.user?.id || '',
      amount: delta,
      reason: grantReason.trim() || null,
    })

    if (error) {
      setBusy(null)
      toast.error(t('Kunde inte uppdatera leads: {msg}', { msg: error.message }))
      return
    }

    // Triggern uppdaterar saldot – hämta det nya värdet för bekräftelsen.
    const { data: updated } = await supabase
      .from('workshops')
      .select('free_leads_remaining')
      .eq('id', grantTarget.id)
      .single()
    setBusy(null)

    toast.success(grantMode === 'remove'
      ? t('{amount} gratis-leads borttagna', { amount })
      : t('{amount} gratis-leads tillagda', { amount }), {
      description: t('{name} har nu {count} kvar.', {
        name: grantTarget.company_name,
        count: (updated as { free_leads_remaining?: number } | null)?.free_leads_remaining ?? '–',
      }),
    })
    setGrantTarget(null)
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
                <th className="text-left p-3">{t('Gratis-leads')}</th>
                <th className="text-left p-3">{t('Registrerad')}</th>
                <th className="text-left p-3">{t('Status')}</th>
                <th className="text-right p-3">{t('Åtgärd')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((workshop) => (
                <tr key={workshop.id} className="border-t align-top">
                  <td className="p-3">
                    <Link to={`/admin/verkstader/${workshop.id}`} className="font-medium text-primary hover:underline">
                      {workshop.company_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{workshop.city || t('Stad saknas')}</div>
                  </td>
                  <td className="p-3">
                    <div>{workshop.email}</div>
                    <div className="text-xs text-muted-foreground">{workshop.phone || t('Telefon saknas')}</div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`font-medium ${(workshop.free_leads_remaining || 0) === 0 ? 'text-muted-foreground' : ''}`}>
                      {workshop.free_leads_remaining ?? 0}
                    </span>
                    <Button size="sm" variant="ghost" className="ml-1" onClick={() => openGrantDialog(workshop, 'add')} disabled={busy === workshop.id}>
                      <Gift className="h-4 w-4 mr-1" /> {t('Fyll på')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openGrantDialog(workshop, 'remove')}
                      disabled={busy === workshop.id || (workshop.free_leads_remaining || 0) === 0}
                    >
                      <Minus className="h-4 w-4 mr-1" /> {t('Dra av')}
                    </Button>
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

      <Dialog open={Boolean(grantTarget)} onOpenChange={(open) => !open && setGrantTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Fyll på gratis-leads')}</DialogTitle>
            <DialogDescription>
              {grantTarget
                ? t('{name} har {count} gratis-leads kvar.', { name: grantTarget.company_name, count: grantTarget.free_leads_remaining ?? 0 })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="grant-amount">{t('Antal leads att lägga till')}</label>
              <Input
                id="grant-amount"
                type="number"
                min={1}
                max={50}
                value={grantAmount}
                onChange={(event) => setGrantAmount(Number(event.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="grant-reason">{t('Anledning (valfritt)')}</label>
              <Input
                id="grant-reason"
                value={grantReason}
                onChange={(event) => setGrantReason(event.target.value)}
                placeholder={t('Exempel: kompensation för strul')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantTarget(null)}>{t('Avbryt')}</Button>
            <Button onClick={submitGrant} disabled={!grantTarget || busy === grantTarget.id}>
              {busy === grantTarget?.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Gift className="h-4 w-4 mr-1" />}
              {t('Fyll på')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CykelAdminLayout>
  )
}

export default AdminWorkshops
