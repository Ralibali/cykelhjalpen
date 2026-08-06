import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Mail, Phone, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface ResponseRow {
  id: string
  created_at: string
  message: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  estimated_time: string | null
  can_pickup: boolean
  status: string
  paid: boolean
  used_free_lead: boolean
  workshops: { id: string; company_name: string; city: string; email: string; phone: string | null } | null
  bike_repair_requests: {
    id: string
    repair_category: string
    bike_type: string
    city: string
    status: string
    admin_status: string
    customer_name: string
    customer_email: string
    customer_phone: string | null
    description: string
    created_at: string
    view_token: string
  } | null
}

const FILTERS = ['alla', 'skickade', 'utkast', 'vunna', 'forlorade'] as const
type Filter = typeof FILTERS[number]

const statusStyle = (row: ResponseRow) => {
  if (row.status === 'won') return 'bg-emerald-100 text-emerald-800'
  if (row.status === 'lost') return 'bg-muted text-muted-foreground'
  if (row.status === 'sent') return 'bg-primary/10 text-primary'
  return 'bg-amber-100 text-amber-800'
}

const AdminBikeResponses = () => {
  const t = useT()
  const [rows, setRows] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('alla')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [requests, setRequests] = useState<{ id: string; repair_category: string; city: string; customer_name: string }[]>([])
  const [workshops, setWorkshops] = useState<{ id: string; company_name: string; city: string }[]>([])
  const [manual, setManual] = useState({
    request_id: '',
    workshop_id: '',
    message: '',
    price_min: '',
    price_max: '',
    estimated_time: '',
    can_pickup: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('workshop_responses')
      .select(`id, created_at, message, estimated_price_min, estimated_price_max, estimated_time, can_pickup, status, paid, used_free_lead,
        workshops(id, company_name, city, email, phone),
        bike_repair_requests(id, repair_category, bike_type, city, status, admin_status, customer_name, customer_email, customer_phone, description, created_at, view_token)`)
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) {
      toast.error(t('Kunde inte läsa offerter: {msg}', { msg: error.message }))
      setRows([])
    } else {
      setRows((data as unknown as ResponseRow[]) || [])
    }
    setLoading(false)
  }, [t])

  const loadPickers = useCallback(async () => {
    const [requestResult, workshopResult] = await Promise.all([
      supabase.from('bike_repair_requests')
        .select('id, repair_category, city, customer_name')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('workshops')
        .select('id, company_name, city').eq('approved', true).order('company_name'),
    ])
    setRequests(requestResult.data || [])
    setWorkshops(workshopResult.data || [])
  }, [])

  useEffect(() => { load(); loadPickers() }, [load, loadPickers])

  const deleteResponse = async (id: string) => {
    if (!window.confirm(t('Ta bort offerten permanent?'))) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-tools', {
      body: { action: 'delete_response', response_id: id },
    })
    setBusy(false)
    if (error || data?.error) {
      toast.error(data?.error || t('Kunde inte ta bort offerten.'))
      return
    }
    toast.success(t('Offerten är borttagen.'))
    setRows((current) => current.filter((row) => row.id !== id))
  }

  const createManual = async () => {
    if (!manual.request_id || !manual.workshop_id) return toast.error(t('Välj ärende och verkstad.'))
    if (manual.message.trim().length < 5) return toast.error(t('Skriv ett meddelande till kunden.'))
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-tools', {
      body: {
        action: 'create_response',
        request_id: manual.request_id,
        workshop_id: manual.workshop_id,
        message: manual.message.trim(),
        estimated_price_min: manual.price_min ? Number(manual.price_min) : null,
        estimated_price_max: manual.price_max ? Number(manual.price_max) : null,
        estimated_time: manual.estimated_time.trim() || null,
        can_pickup: manual.can_pickup,
      },
    })
    setBusy(false)
    if (error || data?.error) {
      toast.error(data?.error || t('Kunde inte skapa offerten.'))
      return
    }
    toast.success(t('Manuell offert är tillagd.'))
    setManualOpen(false)
    setManual({ request_id: '', workshop_id: '', message: '', price_min: '', price_max: '', estimated_time: '', can_pickup: false })
    await load()
  }


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter === 'skickade' && row.status !== 'sent') return false
      if (filter === 'utkast' && !['draft', 'pending_payment'].includes(row.status)) return false
      if (filter === 'vunna' && row.status !== 'won') return false
      if (filter === 'forlorade' && row.status !== 'lost') return false
      if (!q) return true
      return [
        row.workshops?.company_name,
        row.bike_repair_requests?.customer_name,
        row.bike_repair_requests?.customer_email,
        row.bike_repair_requests?.repair_category,
        row.bike_repair_requests?.city,
        row.message,
      ].some((value) => value?.toLowerCase().includes(q))
    })
  }, [rows, filter, search])

  const stats = useMemo(() => ({
    total: rows.length,
    sent: rows.filter((r) => r.status === 'sent').length,
    won: rows.filter((r) => r.status === 'won').length,
    free: rows.filter((r) => r.used_free_lead).length,
  }), [rows])

  const label = (row: ResponseRow) => {
    if (row.status === 'won') return t('Vunnen')
    if (row.status === 'lost') return t('Förlorad')
    if (row.status === 'sent') return row.used_free_lead ? t('Skickad · gratis') : t('Skickad')
    return t('Utkast')
  }

  return (
    <CykelAdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('Offerter och kommunikation')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Alla svar som verkstäderna har skickat, med ärende, kund och meddelandetext.')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> {t('Uppdatera')}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: t('Totalt'), value: stats.total },
          { label: t('Skickade'), value: stats.sent },
          { label: t('Vunna'), value: stats.won },
          { label: t('Gratis-leads använda'), value: stats.free },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="font-display text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((key) => (
          <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)}>
            {key === 'alla' ? t('Alla') : key === 'skickade' ? t('Skickade') : key === 'utkast' ? t('Utkast') : key === 'vunna' ? t('Vunna') : t('Förlorade')}
          </Button>
        ))}
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('Sök verkstad, kund eller ärende...')}
          className="sm:max-w-xs"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">{t('Inga offerter matchar filtret.')}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const open = openId === row.id
            const request = row.bike_repair_requests
            return (
              <div key={row.id} className="rounded-xl border bg-card">
                <button
                  onClick={() => setOpenId(open ? null : row.id)}
                  className="w-full flex items-start gap-3 p-4 text-left"
                >
                  {open ? <ChevronDown className="h-4 w-4 mt-1 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-1 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {row.workshops?.company_name || t('Okänd verkstad')}
                      {request ? ` → ${request.repair_category} · ${request.city}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString('sv-SE')}
                      {request ? ` · ${t('Kund')}: ${request.customer_name}` : ''}
                      {row.estimated_price_min ? ` · ${row.estimated_price_min}${row.estimated_price_max ? `–${row.estimated_price_max}` : ''} kr` : ''}
                    </p>
                  </div>
                  <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1 shrink-0', statusStyle(row))}>
                    {label(row)}
                  </span>
                </button>

                {open && (
                  <div className="border-t p-4 space-y-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t('Verkstadens meddelande')}</p>
                      <p className="whitespace-pre-wrap">{row.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {row.estimated_time ? `${t('Tid')}: ${row.estimated_time} · ` : ''}
                        {row.can_pickup ? t('Erbjuder upphämtning') : t('Ingen upphämtning')}
                      </p>
                    </div>

                    {request && (
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t('Uppdraget')}</p>
                        <p className="whitespace-pre-wrap">{request.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {request.bike_type} · {request.repair_category} · {request.city} · {t('Status')}: {request.status}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs">
                          <a href={`mailto:${request.customer_email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                            <Mail className="h-3.5 w-3.5" /> {request.customer_email}
                          </a>
                          {request.customer_phone && (
                            <a href={`tel:${request.customer_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Phone className="h-3.5 w-3.5" /> {request.customer_phone}
                            </a>
                          )}
                          <Link to={`/mina-svar/${request.view_token}`} className="text-primary hover:underline">{t('Öppna kundvy')}</Link>
                        </div>
                      </div>
                    )}

                    {row.workshops && (
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <Link to={`/admin/verkstader/${row.workshops.id}`} className="text-primary hover:underline">{t('Öppna verkstaden')}</Link>
                        <span>{row.workshops.email}</span>
                        {row.workshops.phone && <span>{row.workshops.phone}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </CykelAdminLayout>
  )
}

export default AdminBikeResponses
