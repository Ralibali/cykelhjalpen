import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Check, Download, ExternalLink, Loader2, Megaphone, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { exportCsv } from '@/lib/exportCsv'
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

type FilterKey = 'pending' | 'approved' | 'rejected' | 'all'

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
  const [filter, setFilter] = useState<FilterKey>('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)

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
    setSelected([])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => ({
    pending: items.filter((i) => i.admin_status === 'pending_approval' || (i.admin_status !== 'approved' && i.admin_status !== 'rejected')).length,
    approved: items.filter((i) => i.admin_status === 'approved').length,
    rejected: items.filter((i) => i.admin_status === 'rejected').length,
    all: items.length,
  }), [items])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesFilter =
        filter === 'all' ? true
          : filter === 'approved' ? item.admin_status === 'approved'
            : filter === 'rejected' ? item.admin_status === 'rejected'
              : item.admin_status !== 'approved' && item.admin_status !== 'rejected'
      if (!matchesFilter) return false
      if (!term) return true
      return [item.customer_name, item.customer_email, item.city, item.repair_category, item.bike_type]
        .some((value) => (value || '').toLowerCase().includes(term))
    })
  }, [items, filter, search])

  const selectablePending = visible.filter((item) => item.admin_status !== 'approved')
  const allSelected = selectablePending.length > 0 && selectablePending.every((item) => selected.includes(item.id))

  const toggleAll = () => {
    setSelected(allSelected ? [] : selectablePending.map((item) => item.id))
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))
  }

  const reviewOne = async (item: BikeRequestRow, decision: 'approved' | 'rejected', reason: string | null) => {
    const { data, error } = await supabase.functions.invoke('review-bike-request', {
      body: { request_id: item.id, decision, reason },
    })
    if (error || data?.error) {
      throw new Error(data?.error || await functionError(error, t('Kunde inte uppdatera ärendet.')))
    }
  }

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
    try {
      await reviewOne(item, decision, reason)
      toast.success(decision === 'approved'
        ? t('Ärendet är godkänt. Kunden och lokala verkstäder har meddelats.')
        : t('Ärendet är avvisat och kunden har fått anledningen.'))
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Kunde inte uppdatera ärendet.'))
    } finally {
      setBusy(null)
    }
  }

  const bulkApprove = async () => {
    const targets = items.filter((item) => selected.includes(item.id) && item.admin_status !== 'approved')
    if (targets.length === 0) return
    if (!window.confirm(t('Godkänn {count} ärenden och meddela verkstäderna?', { count: targets.length }))) return

    setBulkBusy(true)
    let ok = 0
    const failed: string[] = []
    for (const item of targets) {
      try {
        await reviewOne(item, 'approved', null)
        ok += 1
      } catch (error) {
        failed.push(`${item.customer_name}: ${error instanceof Error ? error.message : 'fel'}`)
      }
    }
    setBulkBusy(false)
    if (ok > 0) toast.success(t('{count} ärenden godkändes.', { count: ok }))
    if (failed.length > 0) toast.error(failed.slice(0, 3).join(' · '))
    await load()
  }

  const nudge = async (item: BikeRequestRow) => {
    setBusy(item.id)
    const { data, error } = await supabase.functions.invoke('nudge-workshops', { body: { request_id: item.id } })
    setBusy(null)
    if (error || data?.error) {
      toast.error(data?.error || await functionError(error, t('Kunde inte puffa verkstäderna.')))
      return
    }
    toast.success(t('Påminnelse skickad till {count} verkstäder.', { count: data?.emails_sent ?? 0 }))
  }

  const handleExport = () => {
    if (visible.length === 0) {
      toast.error(t('Inget att exportera.'))
      return
    }
    exportCsv(
      visible.map((item) => ({
        datum: new Date(item.created_at).toLocaleString('sv-SE'),
        kund: item.customer_name,
        epost: item.customer_email,
        stad: item.city,
        cykel: item.bike_type,
        problem: item.repair_category,
        beskrivning: item.description,
        granskning: item.admin_status,
        status: item.status,
        offerter: (item.workshop_responses || []).length,
        betalda: (item.workshop_responses || []).filter((r) => r.paid).length,
      })),
      'cykelarenden',
    )
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'pending', label: t('Väntar') },
    { key: 'approved', label: t('Godkända') },
    { key: 'rejected', label: t('Avvisade') },
    { key: 'all', label: t('Alla') },
  ]

  return (
    <CykelAdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('Cykelärenden')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Granska förfrågningar innan de blir synliga för verkstäder.')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> {t('Exportera CSV')}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('Uppdatera')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filters.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setFilter(tab.key); setSelected([]) }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
              filter === tab.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'
            }`}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('Sök kund, e-post eller stad…')}
          className="h-9 w-full sm:w-64 sm:ml-auto"
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 rounded-xl border bg-card p-3">
          <span className="text-sm font-medium">{t('{count} valda', { count: selected.length })}</span>
          <Button size="sm" onClick={bulkApprove} disabled={bulkBusy}>
            {bulkBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            {t('Godkänn valda')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])} disabled={bulkBusy}>{t('Avmarkera')}</Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">{t('Inga cykelärenden ännu.')}</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl bg-card">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-muted/60">
              <tr>
                <th className="p-3 w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label={t('Markera alla')} disabled={selectablePending.length === 0} />
                </th>
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
              {visible.map((item) => {
                const responses = item.workshop_responses || []
                const paidResponses = responses.filter((response) => response.paid).length
                const isBusy = busy === item.id
                return (
                  <tr key={item.id} className="border-t align-top">
                    <td className="p-3">
                      {item.admin_status !== 'approved' && (
                        <Checkbox
                          checked={selected.includes(item.id)}
                          onCheckedChange={() => toggleOne(item.id)}
                          aria-label={t('Markera ärende')}
                        />
                      )}
                    </td>
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
                        {item.admin_status === 'approved' && responses.length === 0 && (
                          <Button size="sm" variant="outline" onClick={() => nudge(item)} disabled={isBusy}>
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4 mr-1" />}
                            {t('Puffa verkstäder')}
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
