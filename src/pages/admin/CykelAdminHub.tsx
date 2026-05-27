import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Bike, Wrench, Inbox, CheckCircle2, XCircle, Gift, ShieldCheck, Loader2,
  Mail, Phone, MapPin, ExternalLink, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminLayout } from './AdminDashboard'

type BikeRequest = {
  id: string
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
  can_drop_off: boolean
  wants_pickup: boolean
  status: string
  admin_status: string
  rejected_reason: string | null
  approved_at: string | null
  workshop_responses?: { id: string; paid: boolean; used_free_lead: boolean }[]
}

type Workshop = {
  id: string
  user_id: string
  company_name: string
  email: string
  phone: string | null
  city: string
  approved: boolean
  free_leads_remaining: number
  created_at: string
}

type Response = {
  id: string
  created_at: string
  message: string
  paid: boolean
  used_free_lead: boolean
  status: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  workshops?: { company_name: string; email: string } | null
  bike_repair_requests?: { customer_name: string; bike_type: string; repair_category: string } | null
}

const StatCard = ({ label, value, icon: Icon, tone = 'primary' }: { label: string; value: number | string; icon: any; tone?: string }) => (
  <div className="bg-card rounded-xl border p-5">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Icon className={`h-4 w-4 text-${tone}`} />
    </div>
    <p className="text-2xl font-bold font-display">{value}</p>
  </div>
)

const CykelAdminHub = () => {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<BikeRequest[]>([])
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [rejectTarget, setRejectTarget] = useState<BikeRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [grantTarget, setGrantTarget] = useState<Workshop | null>(null)
  const [grantAmount, setGrantAmount] = useState('1')
  const [grantReason, setGrantReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [r, w, resp] = await Promise.all([
      supabase.from('bike_repair_requests')
        .select('*, workshop_responses(id, paid, used_free_lead)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('workshops').select('*').order('created_at', { ascending: false }),
      supabase.from('workshop_responses')
        .select('*, workshops(company_name, email), bike_repair_requests(customer_name, bike_type, repair_category)')
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    setRequests((r.data as any) || [])
    setWorkshops((w.data as any) || [])
    setResponses((resp.data as any) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const approve = async (req: BikeRequest) => {
    setBusy(req.id)
    const { data, error } = await supabase.functions.invoke('approve-bike-request', {
      body: { request_id: req.id, action: 'approve' },
    })
    setBusy(null)
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Kunde inte godkänna')
    } else {
      toast.success('Godkänd — kunden meddelad via e-post')
      load()
    }
  }

  const reject = async () => {
    if (!rejectTarget) return
    setBusy(rejectTarget.id)
    const { data, error } = await supabase.functions.invoke('approve-bike-request', {
      body: { request_id: rejectTarget.id, action: 'reject', reason: rejectReason || null },
    })
    setBusy(null)
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Kunde inte avvisa')
    } else {
      toast.success('Avvisad — kunden meddelad')
      setRejectTarget(null)
      setRejectReason('')
      load()
    }
  }

  const toggleWorkshop = async (w: Workshop) => {
    const { error } = await supabase.from('workshops').update({ approved: !w.approved }).eq('id', w.id)
    if (error) toast.error(error.message); else { toast.success(!w.approved ? 'Verkstad godkänd' : 'Verkstad avaktiverad'); load() }
  }

  const grantFreeLeads = async () => {
    if (!grantTarget) return
    const amount = parseInt(grantAmount, 10)
    if (!amount || amount < 1) { toast.error('Ange ett antal'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: gErr } = await supabase.from('free_lead_grants' as any).insert({
      workshop_id: grantTarget.id,
      admin_id: user.id,
      amount,
      reason: grantReason || null,
    })
    if (gErr) { toast.error(gErr.message); return }

    const newBalance = (grantTarget.free_leads_remaining || 0) + amount
    const { error } = await supabase.from('workshops').update({ free_leads_remaining: newBalance }).eq('id', grantTarget.id)
    if (error) { toast.error(error.message); return }

    toast.success(`${amount} gratis-leads tilldelade till ${grantTarget.company_name}`)
    setGrantTarget(null)
    setGrantAmount('1')
    setGrantReason('')
    load()
  }

  const pending = requests.filter(r => r.admin_status === 'pending_approval')
  const approved = requests.filter(r => r.admin_status === 'approved')
  const rejected = requests.filter(r => r.admin_status === 'rejected')
  const pendingWorkshops = workshops.filter(w => !w.approved)

  const totalPaidResponses = responses.filter(r => r.paid).length
  const totalFreeResponses = responses.filter(r => r.used_free_lead).length

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Bike className="h-6 w-6 text-primary" />
            Cykelhjälpen Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Godkänn förfrågningar, verkstäder och hantera leads</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/statistik">Statistik</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/cykelbetalningar">Betalningar</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard label="Väntar granskning" value={pending.length} icon={Clock} />
        <StatCard label="Godkända ärenden" value={approved.length} icon={CheckCircle2} />
        <StatCard label="Avvisade" value={rejected.length} icon={XCircle} />
        <StatCard label="Verkstäder väntar" value={pendingWorkshops.length} icon={Wrench} />
        <StatCard label="Betalda offerter" value={totalPaidResponses} icon={Inbox} />
        <StatCard label="Gratis-leads använda" value={totalFreeResponses} icon={Gift} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="pending">
              Att granska {pending.length > 0 && <span className="ml-2 bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-[10px]">{pending.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="approved">Godkända ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Avvisade ({rejected.length})</TabsTrigger>
            <TabsTrigger value="workshops">
              Verkstäder {pendingWorkshops.length > 0 && <span className="ml-2 bg-amber-500 text-white rounded-full px-2 py-0.5 text-[10px]">{pendingWorkshops.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="responses">Offerter</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pending.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Inga väntande förfrågningar 🎉</p>}
            {pending.map(req => (
              <RequestCard key={req.id} req={req} busy={busy === req.id}
                onApprove={() => approve(req)} onReject={() => setRejectTarget(req)} />
            ))}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3">
            {approved.map(req => <RequestCard key={req.id} req={req} compact />)}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3">
            {rejected.map(req => <RequestCard key={req.id} req={req} compact />)}
          </TabsContent>

          <TabsContent value="workshops" className="space-y-3">
            {workshops.map(w => (
              <div key={w.id} className="bg-card border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold">{w.company_name}</h3>
                    {w.approved
                      ? <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">GODKÄND</span>
                      : <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">VÄNTAR</span>}
                    {w.free_leads_remaining > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-semibold flex items-center gap-1">
                        <Gift className="h-3 w-3" />{w.free_leads_remaining} gratis-leads
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{w.email}</span>
                    {w.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{w.phone}</span>}
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{w.city}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setGrantTarget(w)}>
                    <Gift className="h-3.5 w-3.5 mr-1" />Ge gratis-leads
                  </Button>
                  {w.approved
                    ? <Button size="sm" variant="outline" onClick={() => toggleWorkshop(w)}>Avaktivera</Button>
                    : <Button size="sm" onClick={() => toggleWorkshop(w)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Godkänn</Button>}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="responses" className="space-y-3">
            {responses.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Inga offerter ännu</p>}
            {responses.map(r => (
              <div key={r.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm">{r.workshops?.company_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      → {r.bike_repair_requests?.customer_name} · {r.bike_repair_requests?.bike_type} · {r.bike_repair_requests?.repair_category}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {r.used_free_lead && <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-semibold flex items-center gap-1"><Gift className="h-3 w-3" />Gratis</span>}
                    {r.paid
                      ? <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">BETALD</span>
                      : <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-semibold">UTKAST</span>}
                    {(r.estimated_price_min || r.estimated_price_max) && (
                      <span className="text-xs text-muted-foreground">{r.estimated_price_min}–{r.estimated_price_max} kr</span>
                    )}
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('sv-SE')}</span>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 line-clamp-2">{r.message}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avvisa förfrågan</DialogTitle>
            <DialogDescription>
              Kunden får e-post om att förfrågan inte tas vidare. Ange gärna en kort anledning.
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Anledning (skickas till kunden)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Avbryt</Button>
            <Button variant="destructive" onClick={reject} disabled={busy === rejectTarget?.id}>
              {busy === rejectTarget?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Avvisa & skicka
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant free leads dialog */}
      <Dialog open={!!grantTarget} onOpenChange={(o) => !o && setGrantTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ge gratis-leads till {grantTarget?.company_name}</DialogTitle>
            <DialogDescription>
              Verkstaden får kredit som används automatiskt vid nästa offert(er) istället för Stripe-betalning.
              Nuvarande saldo: <strong>{grantTarget?.free_leads_remaining ?? 0}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Antal leads</label>
              <Input type="number" min="1" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Anledning (intern)</label>
              <Textarea placeholder="t.ex. introerbjudande" value={grantReason} onChange={e => setGrantReason(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantTarget(null)}>Avbryt</Button>
            <Button onClick={grantFreeLeads}><Gift className="h-4 w-4 mr-2" />Tilldela</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

const RequestCard = ({ req, busy, compact, onApprove, onReject }: {
  req: BikeRequest; busy?: boolean; compact?: boolean;
  onApprove?: () => void; onReject?: () => void;
}) => {
  const paidCount = req.workshop_responses?.filter(r => r.paid).length || 0
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display font-semibold">{req.bike_type} · {req.repair_category}</h3>
            {req.urgency && <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold uppercase">{req.urgency}</span>}
            {req.admin_status === 'rejected' && <span className="text-[10px] bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-semibold">AVVISAD</span>}
            {req.admin_status === 'approved' && paidCount > 0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">{paidCount}/5 offerter</span>}
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2 mb-2">{req.description}</p>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{req.customer_email}</span>
            {req.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{req.customer_phone}</span>}
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.area || req.postcode || req.city}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(req.created_at).toLocaleString('sv-SE')}</span>
            <a href={`/mitt-arende/${req.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><ExternalLink className="h-3 w-3" />Kundvy</a>
          </div>
          {req.rejected_reason && (
            <p className="text-xs text-destructive mt-2"><strong>Avvisad:</strong> {req.rejected_reason}</p>
          )}
        </div>
        {!compact && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
              <XCircle className="h-3.5 w-3.5 mr-1" />Avvisa
            </Button>
            <Button size="sm" onClick={onApprove} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
              Godkänn
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CykelAdminHub
