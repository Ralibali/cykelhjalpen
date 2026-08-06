import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft, Check, Copy, Gift, Loader2, Mail, MapPin, Phone, RefreshCw, X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface WorkshopDetail {
  id: string
  company_name: string
  email: string
  phone: string | null
  address: string | null
  city: string
  areas_served: string[] | null
  services: string[] | null
  approved: boolean
  free_leads_remaining: number
  sms_notifications: boolean
  stripe_customer_id: string | null
  created_at: string
}

interface GrantRow {
  id: string
  amount: number
  reason: string | null
  created_at: string
}

interface ResponseRow {
  id: string
  created_at: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  paid: boolean
  status: string
  used_free_lead: boolean
  bike_repair_requests: { repair_category: string; city: string } | null
}

interface ChargeRow {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
}

const formatMoney = (ore: number) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format((ore || 0) / 100)

const functionError = async (error: unknown, fallback: string) => {
  const response = (error as { context?: Response })?.context
  if (response instanceof Response) {
    try {
      const payload = await response.clone().json()
      if (typeof payload?.error === 'string') return payload.error
    } catch { /* standard fallback */ }
  }
  return (error as { message?: string })?.message || fallback
}

const AdminWorkshopDetail = () => {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null)
  const [grants, setGrants] = useState<GrantRow[]>([])
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [charges, setCharges] = useState<ChargeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [grantOpen, setGrantOpen] = useState(false)
  const [grantMode, setGrantMode] = useState<'add' | 'remove'>('add')
  const [grantAmount, setGrantAmount] = useState(2)
  const [grantReason, setGrantReason] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [workshopResult, grantsResult, responsesResult, chargesResult] = await Promise.all([
      supabase
        .from('workshops')
        .select('id, company_name, email, phone, address, city, areas_served, services, approved, free_leads_remaining, sms_notifications, stripe_customer_id, created_at')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('free_lead_grants').select('id, amount, reason, created_at')
        .eq('workshop_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('workshop_responses')
        .select('id, created_at, estimated_price_min, estimated_price_max, paid, status, used_free_lead, bike_repair_requests(repair_category, city)')
        .eq('workshop_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('lead_charges').select('id, amount, currency, status, created_at')
        .eq('workshop_id', id).order('created_at', { ascending: false }).limit(10),
    ])

    if (workshopResult.error || !workshopResult.data) {
      toast.error(t('Kunde inte läsa verkstaden.'))
      setWorkshop(null)
    } else {
      setWorkshop(workshopResult.data as unknown as WorkshopDetail)
    }
    setGrants((grantsResult.data as GrantRow[]) || [])
    setResponses((responsesResult.data as unknown as ResponseRow[]) || [])
    setCharges((chargesResult.data as ChargeRow[]) || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const setApproved = async (approved: boolean) => {
    if (!workshop) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('review-workshop', {
      body: { workshop_id: workshop.id, action: approved ? 'approve' : 'reject' },
    })
    setBusy(false)
    if (error || data?.error) {
      toast.error(data?.error || await functionError(error, t('Kunde inte uppdatera verkstaden.')))
      return
    }
    toast.success(approved
      ? t('{name} är godkänd och har meddelats.', { name: workshop.company_name })
      : t('{name} är pausad och har meddelats.', { name: workshop.company_name }))
    await load()
  }

  const submitGrant = async () => {
    if (!workshop) return
    const amount = Math.floor(grantAmount)
    if (!Number.isFinite(amount) || amount < 1 || amount > 50) {
      toast.error(t('Ange ett antal mellan 1 och 50.'))
      return
    }
    const delta = grantMode === 'remove' ? -amount : amount
    setBusy(true)
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('free_lead_grants').insert({
      workshop_id: workshop.id,
      admin_id: userData?.user?.id || '',
      amount: delta,
      reason: grantReason.trim() || null,
    })
    setBusy(false)
    if (error) {
      toast.error(t('Kunde inte uppdatera leads: {msg}', { msg: error.message }))
      return
    }
    toast.success(grantMode === 'remove'
      ? t('{amount} gratis-leads borttagna', { amount })
      : t('{amount} gratis-leads tillagda', { amount }))
    setGrantOpen(false)
    setGrantReason('')
    setGrantAmount(2)
    await load()
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t('{label} kopierat.', { label }))
    } catch {
      toast.error(t('Kunde inte kopiera.'))
    }
  }

  const paidResponses = responses.filter((r) => r.paid).length
  const revenue = charges.filter((c) => c.status === 'paid').reduce((sum, c) => sum + (c.amount || 0), 0)

  return (
    <CykelAdminLayout>
      <Link to="/admin/verkstader" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> {t('Alla verkstäder')}
      </Link>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
      ) : !workshop ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">{t('Verkstaden hittades inte.')}</div>
      ) : (
        <div className="max-w-4xl space-y-5">
          {/* Huvud */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold">{workshop.company_name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {workshop.city} · {t('Registrerad')} {new Date(workshop.created_at).toLocaleDateString('sv-SE')}
                </p>
                <span className={cn('inline-block mt-2 text-xs rounded-full px-2 py-1 font-medium',
                  workshop.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                  {workshop.approved ? t('Godkänd') : t('Väntar/pausad')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
                {workshop.approved ? (
                  <Button variant="outline" size="sm" onClick={() => setApproved(false)} disabled={busy}>
                    <X className="h-4 w-4 mr-1" /> {t('Pausa')}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setApproved(true)} disabled={busy}>
                    <Check className="h-4 w-4 mr-1" /> {t('Godkänn')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Leads */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display font-semibold">{t('Gratis-leads')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('Saldot dras automatiskt när verkstaden skickar ett svar.')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-bold">{workshop.free_leads_remaining ?? 0}</span>
                <Button size="sm" onClick={() => { setGrantMode('add'); setGrantAmount(2); setGrantOpen(true) }}>
                  <Gift className="h-4 w-4 mr-1" /> {t('Fyll på')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(workshop.free_leads_remaining ?? 0) === 0}
                  onClick={() => { setGrantMode('remove'); setGrantAmount(1); setGrantOpen(true) }}
                >
                  <Minus className="h-4 w-4 mr-1" /> {t('Dra av')}
                </Button>
              </div>
            </div>
            {grants.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('Tidigare påfyllningar')}</p>
                <div className="space-y-1.5">
                  {grants.map((grant) => (
                    <div key={grant.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(grant.created_at).toLocaleDateString('sv-SE')}
                        {grant.reason ? ` · ${grant.reason}` : ''}
                      </span>
                      <span className="font-medium text-emerald-700">+{grant.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kontakt + info */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-display font-semibold mb-3">{t('Kontakt och info')}</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <button onClick={() => copy(workshop.email, t('E-post'))} className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/40 text-left transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{workshop.email}</span>
                <Copy className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />
              </button>
              <button onClick={() => workshop.phone && copy(workshop.phone, t('Telefon'))} className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/40 text-left transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{workshop.phone || t('Telefon saknas')}</span>
                {workshop.phone && <Copy className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />}
              </button>
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{workshop.address || workshop.city}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border p-3 text-muted-foreground">
                <span>{t('SMS-notiser')}: {workshop.sms_notifications ? t('På') : t('Av')} · Stripe: {workshop.stripe_customer_id ? t('Kopplad') : t('Saknas')}</span>
              </div>
            </div>
            {(workshop.services?.length || workshop.areas_served?.length) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(workshop.services || []).map((service) => (
                  <span key={service} className="text-xs bg-muted rounded-full px-2 py-1">{service}</span>
                ))}
                {(workshop.areas_served || []).map((area) => (
                  <span key={area} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-1">{area}</span>
                ))}
              </div>
            )}
          </div>

          {/* Offerter */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold">{t('Senaste offerter')}</h2>
              <span className="text-sm text-muted-foreground">{paidResponses} {t('skickade')} · {formatMoney(revenue)} {t('intäkt')}</span>
            </div>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('Inga offerter ännu.')}</p>
            ) : (
              <div className="divide-y">
                {responses.map((row) => (
                  <div key={row.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {row.bike_repair_requests ? `${row.bike_repair_requests.repair_category} · ${row.bike_repair_requests.city}` : t('Ärende')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString('sv-SE')}
                        {row.estimated_price_min ? ` · ${row.estimated_price_min}${row.estimated_price_max ? `–${row.estimated_price_max}` : ''} kr` : ''}
                      </p>
                    </div>
                    <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1 shrink-0',
                      row.paid ? 'bg-emerald-100 text-emerald-800' : row.status === 'closed_for_responses' ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-800')}>
                      {row.paid ? (row.used_free_lead ? t('Skickad · gratis') : t('Skickad')) : row.status === 'closed_for_responses' ? t('Stängd') : t('Ej skickad')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Betalningar */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-display font-semibold mb-3">{t('Senaste betalningar')}</h2>
            {charges.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('Inga betalningar ännu.')}</p>
            ) : (
              <div className="divide-y">
                {charges.map((charge) => (
                  <div key={charge.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{new Date(charge.created_at).toLocaleDateString('sv-SE')}</span>
                    <span className="font-medium">{formatMoney(charge.amount)}</span>
                    <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1',
                      charge.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : charge.status === 'refunded' ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-800')}>
                      {charge.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Fyll på gratis-leads')}</DialogTitle>
            <DialogDescription>
              {workshop ? t('{name} har {count} gratis-leads kvar.', { name: workshop.company_name, count: workshop.free_leads_remaining ?? 0 }) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="detail-grant-amount">{t('Antal leads att lägga till')}</label>
              <Input
                id="detail-grant-amount"
                type="number"
                min={1}
                max={50}
                value={grantAmount}
                onChange={(event) => setGrantAmount(Number(event.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="detail-grant-reason">{t('Anledning (valfritt)')}</label>
              <Input
                id="detail-grant-reason"
                value={grantReason}
                onChange={(event) => setGrantReason(event.target.value)}
                placeholder={t('Exempel: kompensation för strul')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)}>{t('Avbryt')}</Button>
            <Button onClick={submitGrant} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Gift className="h-4 w-4 mr-1" />}
              {t('Fyll på')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CykelAdminLayout>
  )
}

export default AdminWorkshopDetail
