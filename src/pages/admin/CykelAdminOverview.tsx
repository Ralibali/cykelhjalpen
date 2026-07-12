import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Bike, CheckCircle2, Clock, Copy, CreditCard, ExternalLink, Loader2, RefreshCw, Wrench, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'


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
}

const StatCard = ({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Bike }) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <p className="font-display text-2xl font-bold mt-2">{value}</p>
  </div>
)

const formatMoney = (ore: number) => new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
}).format((ore || 0) / 100)

const CykelAdminOverview = () => {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [workshops, setWorkshops] = useState<WorkshopRow[]>([])
  const [charges, setCharges] = useState<ChargeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<RequestRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [incomingPending, setIncomingPending] = useState(0)
  const knownRequestIds = useRef<Set<string>>(new Set())


  const load = useCallback(async () => {
    setLoading(true)
    const [requestResult, workshopResult, chargeResult] = await Promise.all([
      supabase
        .from('bike_repair_requests')
        .select('id, view_token, created_at, customer_name, customer_email, customer_phone, bike_type, repair_category, description, area, postcode, city, urgency, admin_status, workshop_responses(id, paid)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('workshops').select('id, company_name, email, phone, approved, created_at').order('created_at', { ascending: false }),
      supabase.from('lead_charges').select('id, amount, status').order('created_at', { ascending: false }),
    ])

    const errors = [requestResult.error, workshopResult.error, chargeResult.error].filter(Boolean)
    if (errors.length > 0) {
      toast.error(`Admin kunde inte läsa all data: ${errors[0]?.message}`)
    }

    setRequests((requestResult.data as RequestRow[]) || [])
    setWorkshops((workshopResult.data as WorkshopRow[]) || [])
    setCharges((chargeResult.data as ChargeRow[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const approveRequest = async (request: RequestRow) => {
    setBusy(request.id)
    const { data, error } = await supabase.functions.invoke('approve-bike-request', {
      body: { request_id: request.id, action: 'approve' },
    })
    setBusy(null)

    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Kunde inte godkänna ärendet')
      return
    }

    const workshopCount = data?.workshop_emails_sent ?? data?.workshops_notified ?? 0
    toast.success(`Ärendet är publicerat. ${workshopCount} verkstäder notifierades.`)
    load()
  }

  const rejectRequest = async () => {
    if (!rejectTarget) return
    setBusy(rejectTarget.id)
    const { data, error } = await supabase.functions.invoke('approve-bike-request', {
      body: {
        request_id: rejectTarget.id,
        action: 'reject',
        reason: rejectReason.trim() || null,
      },
    })
    setBusy(null)

    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Kunde inte avvisa ärendet')
      return
    }

    toast.success('Ärendet är avvisat och kunden har meddelats.')
    setRejectTarget(null)
    setRejectReason('')
    load()
  }

  const setWorkshopApproved = async (workshop: WorkshopRow, approved: boolean) => {
    setBusy(workshop.id)
    const { error } = await supabase.from('workshops').update({ approved }).eq('id', workshop.id)
    setBusy(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(approved ? `${workshop.company_name} är godkänd` : `${workshop.company_name} är avaktiverad`)
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
  const revenue = useMemo(
    () => charges.filter((charge) => charge.status === 'paid').reduce((sum, charge) => sum + (charge.amount || 0), 0),
    [charges],
  )

  return (
    <CykelAdminLayout>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Bike className="h-6 w-6 text-primary" /> Cykelhjälpen Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Granska ärenden och verkstäder innan de publiceras.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Uppdatera
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <StatCard label="Väntar granskning" value={pendingRequests.length} icon={Clock} />
        <StatCard label="Godkända ärenden" value={approvedRequests.length} icon={CheckCircle2} />
        <StatCard label="Verkstäder väntar" value={pendingWorkshops.length} icon={Wrench} />
        <StatCard label="Betalda offerter" value={paidResponses} icon={CreditCard} />
        <StatCard label="Intäkter" value={formatMoney(revenue)} icon={CreditCard} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-6">
          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Ärenden att granska</h2>
                <p className="text-xs text-muted-foreground">Verkstäder notifieras först efter godkännande.</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/admin/cykelarenden">Visa alla</Link></Button>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Inga ärenden väntar på granskning.</p>
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
                    <div className="flex justify-end gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => setRejectTarget(request)} disabled={busy === request.id}>
                        <XCircle className="h-4 w-4 mr-1" /> Avvisa
                      </Button>
                      <Button size="sm" onClick={() => approveRequest(request)} disabled={busy === request.id}>
                        {busy === request.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Godkänn
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
                <h2 className="font-display text-lg font-semibold">Verkstäder att granska</h2>
                <p className="text-xs text-muted-foreground">Endast godkända verkstäder får se öppna ärenden.</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/admin/verkstader">Visa alla</Link></Button>
            </div>

            {pendingWorkshops.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Inga verkstäder väntar på granskning.</p>
            ) : (
              <div className="space-y-3">
                {pendingWorkshops.slice(0, 8).map((workshop) => (
                  <div key={workshop.id} className="rounded-xl border p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium">{workshop.company_name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{workshop.email}{workshop.phone ? ` · ${workshop.phone}` : ''}</p>
                    </div>
                    <Button size="sm" onClick={() => setWorkshopApproved(workshop, true)} disabled={busy === workshop.id}>
                      {busy === workshop.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Godkänn'}
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
            <DialogTitle>Avvisa cykelärendet?</DialogTitle>
            <DialogDescription>Anledningen skickas till kunden. Skriv kort och konkret.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={4} placeholder="Exempel: Vi behöver en tydligare problembeskrivning eller en giltig kontaktadress." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Avbryt</Button>
            <Button variant="destructive" onClick={rejectRequest} disabled={!rejectTarget || busy === rejectTarget.id}>
              {busy === rejectTarget?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Avvisa och meddela kunden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CykelAdminLayout>
  )
}

export default CykelAdminOverview
