import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle, Bike, CheckCircle2, Clock, Copy, CreditCard, ExternalLink, Loader2,
  Mail, RefreshCw, TrendingUp, Wrench, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { useT } from '@/lib/i18n'


interface RequestRow {
  id: string
  view_token: string | null
  created_at: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  bike_type: string
  repair_category: string
  description: string
  area: string | null
  postcode: string | null
  city: string
  urgency: string | null
  admin_status: string
  workshop_responses?: { id: string; paid: boolean }[]
}

interface WorkshopRow {
  id: string
  company_name: string
  email: string
  phone: string | null
  approved: boolean
  created_at: string
}

interface ChargeRow {
  id: string
  amount: number
  status: string
  created_at: string
}

const StatCard = ({ label, value, icon: Icon, to }: { label: string; value: number | string; icon: typeof Bike; to?: string }) => {
  const card = (
    <div className="rounded-xl border bg-card p-4 h-full transition-colors hover:bg-muted/40">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="font-display text-2xl font-bold mt-2">{value}</p>
    </div>
  )
  return to ? <Link to={to} className="block">{card}</Link> : card
}

const formatMoney = (ore: number) => new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
}).format((ore || 0) / 100)

const CykelAdminOverview = () => {
  const t = useT()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [workshops, setWorkshops] = useState<WorkshopRow[]>([])
  const [charges, setCharges] = useState<ChargeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<RequestRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [incomingPending, setIncomingPending] = useState(0)
  const [funnel, setFunnel] = useState({ contacted: 0, clicked: 0, replied: 0, converted: 0 })
  const [unreadMail, setUnreadMail] = useState(0)
  const [failedNotifs, setFailedNotifs] = useState(0)
  const knownRequestIds = useRef<Set<string>>(new Set())


  const load = useCallback(async () => {
    setLoading(true)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const [requestResult, workshopResult, chargeResult, prospectResult, clickResult, mailResult, notifResult] = await Promise.all([
      supabase
        .from('bike_repair_requests')
        .select('id, view_token, created_at, customer_name, customer_email, customer_phone, bike_type, repair_category, description, area, postcode, city, urgency, admin_status, workshop_responses(id, paid)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('workshops').select('id, company_name, email, phone, approved, created_at').order('created_at', { ascending: false }),
      supabase.from('lead_charges').select('id, amount, status, created_at').order('created_at', { ascending: false }),
      supabase.from('workshop_prospects').select('status'),
      supabase.from('outreach_clicks').select('prospect_id'),
      supabase.from('inbound_emails').select('*', { count: 'exact', head: true }).is('read_at', null).is('archived_at', null),
      supabase.from('notification_events').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', sevenDaysAgo),
    ])

    const errors = [requestResult.error, workshopResult.error, chargeResult.error].filter(Boolean)
    if (errors.length > 0) {
      toast.error(t('Admin kunde inte läsa all data: {msg}', { msg: errors[0]?.message || '' }))
    }

    setRequests((requestResult.data as RequestRow[]) || [])
    setWorkshops((workshopResult.data as WorkshopRow[]) || [])
    setCharges((chargeResult.data as ChargeRow[]) || [])

    // Rekryteringstratten: statusräkning + unika prospekt som klickat på länken.
    const prospectStatuses = (prospectResult.data || []) as { status: string }[]
    const clickedProspects = new Set(((clickResult.data || []) as { prospect_id: string }[]).map((row) => row.prospect_id))
    setFunnel({
      contacted: prospectStatuses.filter((p) => p.status === 'contacted').length,
      clicked: clickedProspects.size,
      replied: prospectStatuses.filter((p) => p.status === 'replied').length,
      converted: prospectStatuses.filter((p) => p.status === 'converted').length,
    })
    setUnreadMail(mailResult.count || 0)
    setFailedNotifs(notifResult.count || 0)
    setLoading(false)
    setIncomingPending(0)
    knownRequestIds.current = new Set(((requestResult.data as RequestRow[]) || []).map((row) => row.id))
  }, [])

  useEffect(() => { load() }, [load])

  // Realtidsräknare på "Uppdatera"-knappen så admin ser att nya pending ärenden trillar in.
  useEffect(() => {
    const channel = supabase
      .channel('admin-bike-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bike_repair_requests' }, (payload) => {
        const row = payload.new as { id?: string } | null
        if (!row?.id) return
        if (knownRequestIds.current.has(row.id)) return
        knownRequestIds.current.add(row.id)
        setIncomingPending((count) => count + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const approveRequest = async (request: RequestRow) => {
    setBusy(request.id)
    const { data, error } = await supabase.functions.invoke('approve-bike-request', {
      body: { request_id: request.id, action: 'approve' },
    })
    setBusy(null)

    if (error || data?.error) {
      toast.error(t('Kunde inte godkänna ärendet.'), {
        description: data?.error || error?.message || t('Försök igen om en stund.'),
      })
      return
    }

    const workshopCount = data?.workshop_emails_sent ?? data?.workshops_notified ?? 0
    toast.success(t('Ärendet är publicerat. {count} verkstäder notifierades.', { count: workshopCount }))
    load()
  }

  const rejectRequest = async () => {
    if (!rejectTarget) return
    const trimmed = rejectReason.trim()
    if (trimmed.length < 10) {
      toast.error(t('Anledningen är för kort.'), {
        description: t('Skriv minst tio tecken. Meddelandet skickas till kunden.'),
      })
      return
    }
    setBusy(rejectTarget.id)
    const { data, error } = await supabase.functions.invoke('approve-bike-request', {
      body: {
        request_id: rejectTarget.id,
        action: 'reject',
        reason: trimmed,
      },
    })
    setBusy(null)

    if (error || data?.error) {
      toast.error(t('Kunde inte avvisa ärendet.'), {
        description: data?.error || error?.message || t('Försök igen om en stund.'),
      })
      return
    }

    toast.success(t('Ärendet är avvisat och kunden har meddelats.'))
    setRejectTarget(null)
    setRejectReason('')
    load()
  }

  const copyContact = async (request: RequestRow) => {
    const parts = [
      request.customer_name,
      request.customer_email,
      request.customer_phone,
    ].filter(Boolean).join(' · ')
    try {
      await navigator.clipboard.writeText(parts)
      toast.success(t('Kontaktuppgifter kopierade.'))
    } catch {
      toast.error(t('Kunde inte kopiera. Markera texten manuellt.'))
    }
  }

  const setWorkshopApproved = async (workshop: WorkshopRow, approved: boolean) => {
    setBusy(workshop.id)
    const { error } = await supabase.from('workshops').update({ approved }).eq('id', workshop.id)
    setBusy(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(approved ? t('{name} är godkänd', { name: workshop.company_name }) : t('{name} är avaktiverad', { name: workshop.company_name }))
    load()
  }

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.admin_status === 'pending_approval'),
    [requests],
  )
  const approvedRequests = useMemo(
    () => requests.filter((request) => request.admin_status === 'approved'),
    [requests],
  )
  const pendingWorkshops = useMemo(
    () => workshops.filter((workshop) => !workshop.approved),
    [workshops],
  )
  const paidResponses = useMemo(
    () => requests.reduce((sum, request) => sum + (request.workshop_responses || []).filter((response) => response.paid).length, 0),
    [requests],
  )
  const revenue30d = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000
    return charges
      .filter((charge) => charge.status === 'paid' && new Date(charge.created_at).getTime() >= cutoff)
      .reduce((sum, charge) => sum + (charge.amount || 0), 0)
  }, [charges])
  const approvedWithoutResponse = useMemo(
    () => approvedRequests.filter((request) => !(request.workshop_responses || []).some((response) => response.paid)).length,
    [approvedRequests],
  )

  return (
    <CykelAdminLayout>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Bike className="h-6 w-6 text-primary" /> {t('Cykelhjälpen Admin')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Granska ärenden och verkstäder innan de publiceras.')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label={t('Uppdatera admin-översikten')}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> {t('Uppdatera')}
          {incomingPending > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              +{incomingPending}
            </span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label={t('Väntar granskning')} value={pendingRequests.length} icon={Clock} to="/admin/cykelarenden" />
        <StatCard label={t('Godkända ärenden')} value={approvedRequests.length} icon={CheckCircle2} to="/admin/cykelarenden" />
        <StatCard label={t('Verkstäder väntar')} value={pendingWorkshops.length} icon={Wrench} to="/admin/verkstader" />
        <StatCard label={t('Betalda offerter')} value={paidResponses} icon={CreditCard} to="/admin/cykelbetalningar" />
        <StatCard label={t('Intäkter (30 d)')} value={formatMoney(revenue30d)} icon={CreditCard} to="/admin/cykelbetalningar" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> {t('Rekrytering av verkstäder')}
            </h2>
            <Link to="/admin/prospekt" className="text-xs text-primary hover:underline font-medium">{t('Öppna prospekt →')}</Link>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xl font-bold font-display">{funnel.contacted}</p>
              <p className="text-xs text-muted-foreground">{t('Kontaktade')}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xl font-bold font-display">{funnel.clicked}</p>
              <p className="text-xs text-muted-foreground">{t('Klickat')}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xl font-bold font-display">{funnel.replied}</p>
              <p className="text-xs text-muted-foreground">{t('Svarat')}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xl font-bold font-display">{funnel.converted}</p>
              <p className="text-xs text-muted-foreground">{t('Anslutna')}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-display font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-primary" /> {t('Drift')}
          </h2>
          <div className="space-y-1 text-sm">
            <Link to="/admin/mejl" className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
              <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {t('Olästa mejl')}</span>
              <span className={unreadMail > 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}>{unreadMail}</span>
            </Link>
            <Link to="/admin/notifieringar-logg" className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" /> {t('Misslyckade notiser (7 d)')}</span>
              <span className={failedNotifs > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>{failedNotifs}</span>
            </Link>
            <Link to="/admin/cykelarenden" className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/40 transition-colors">
              <span className="flex items-center gap-2"><Bike className="h-4 w-4 text-muted-foreground" /> {t('Godkända ärenden utan svar')}</span>
              <span className={approvedWithoutResponse > 0 ? 'font-semibold' : 'text-muted-foreground'}>{approvedWithoutResponse}</span>
            </Link>
          </div>
        </section>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-6">
          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{t('Ärenden att granska')}</h2>
                <p className="text-xs text-muted-foreground">{t('Verkstäder notifieras först efter godkännande.')}</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/admin/cykelarenden">{t('Visa alla')}</Link></Button>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('Inga ärenden väntar på granskning.')}</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 8).map((request) => (
                  <div key={request.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium">{request.bike_type} · {request.repair_category}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{request.description}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-3">
                          <span>{request.customer_name}</span>
                          <span>{request.area || request.postcode || request.city}</span>
                          <span>{new Date(request.created_at).toLocaleString('sv-SE')}</span>
                        </div>
                      </div>
                      {request.view_token && (
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/mitt-arende/${request.view_token}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 mt-4">
                      <Button size="sm" variant="ghost" onClick={() => copyContact(request)} aria-label={t('Kopiera kontaktuppgifter')}>
                        <Copy className="h-4 w-4 mr-1" /> {t('Kopiera kontakt')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectTarget(request)} disabled={busy === request.id}>
                        <XCircle className="h-4 w-4 mr-1" /> {t('Avvisa')}
                      </Button>
                      <Button size="sm" onClick={() => approveRequest(request)} disabled={busy === request.id}>
                        {busy === request.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        {t('Godkänn')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{t('Verkstäder att granska')}</h2>
                <p className="text-xs text-muted-foreground">{t('Endast godkända verkstäder får se öppna ärenden.')}</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/admin/verkstader">{t('Visa alla')}</Link></Button>
            </div>

            {pendingWorkshops.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('Inga verkstäder väntar på granskning.')}</p>
            ) : (
              <div className="space-y-3">
                {pendingWorkshops.slice(0, 8).map((workshop) => (
                  <div key={workshop.id} className="rounded-xl border p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium">{workshop.company_name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{workshop.email}{workshop.phone ? ` · ${workshop.phone}` : ''}</p>
                    </div>
                    <Button size="sm" onClick={() => setWorkshopApproved(workshop, true)} disabled={busy === workshop.id}>
                      {busy === workshop.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Godkänn')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Avvisa cykelärendet?')}</DialogTitle>
            <DialogDescription>{t('Anledningen skickas till kunden. Skriv minst tio tecken – kort och konkret.')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={4}
            placeholder={t('Exempel: Vi behöver en tydligare problembeskrivning eller en giltig kontaktadress.')}
            aria-label={t('Anledning till avvisning')}
          />
          <p className={`text-xs ${rejectReason.trim().length < 10 ? 'text-muted-foreground' : 'text-emerald-700'}`}>
            {t('{n}/10 tecken (minimum)', { n: rejectReason.trim().length })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t('Avbryt')}</Button>
            <Button
              variant="destructive"
              onClick={rejectRequest}
              disabled={!rejectTarget || busy === rejectTarget.id || rejectReason.trim().length < 10}
            >
              {busy === rejectTarget?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Avvisa och meddela kunden')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CykelAdminLayout>
  )
}

export default CykelAdminOverview
