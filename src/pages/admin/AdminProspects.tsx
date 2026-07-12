import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import {
  Search, RefreshCw, Ban, Check, X, ExternalLink, Mail, Phone, MapPin, Star, Copy, Loader2,
  Send, ShieldCheck, ShieldAlert, Save, Pencil, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Prospect {
  id: string
  company_name: string
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string
  services: string[]
  opening_hours: string | null
  ai_summary: string | null
  score: number
  status: string
  do_not_contact: boolean
  last_checked_at: string | null
  last_contacted_at: string | null
  contact_count: number
  notes: string | null
  created_at: string
  normalized_domain: string | null
  unsubscribe_token: string
}

interface ProspectSource {
  id: string
  source_type: string
  source_url: string | null
  search_term: string | null
  city: string | null
  raw_excerpt: string | null
  fetched_at: string
}

interface OutreachActivity {
  id: string
  channel: 'email' | 'sms' | 'manual'
  status: string
  subject: string | null
  message: string
  recipient: string
  created_at: string
  sent_at: string | null
  approved_at: string | null
  provider: string | null
  provider_message_id: string | null
  error: string | null
  retry_count: number
}

interface ResendStatus {
  configured: boolean
  required_domain: string
  domain_status: 'unknown' | 'verified' | 'pending' | 'missing' | 'error'
  domain_message: string | null
  from: string
  reply_to: string
}

const CITIES = ['Linköping', 'Norrköping', 'Uppsala', 'Lund'] as const
const STATUSES = ['new', 'review', 'approved_for_contact', 'contacted', 'replied', 'converted', 'rejected', 'do_not_contact'] as const

const statusLabel: Record<string, string> = {
  new: 'Ny', review: 'Granskning', approved_for_contact: 'Godkänd', contacted: 'Kontaktad',
  replied: 'Svarat', converted: 'Konverterad', rejected: 'Avvisad', do_not_contact: 'Do-not-contact',
}

const statusColor: Record<string, string> = {
  new: 'bg-slate-100 text-slate-800',
  review: 'bg-amber-100 text-amber-800',
  approved_for_contact: 'bg-emerald-100 text-emerald-800',
  contacted: 'bg-blue-100 text-blue-800',
  replied: 'bg-indigo-100 text-indigo-800',
  converted: 'bg-purple-100 text-purple-800',
  rejected: 'bg-muted text-muted-foreground',
  do_not_contact: 'bg-red-100 text-red-800',
}

const activityStatusLabel: Record<string, string> = {
  draft: 'Utkast', pending_approval: 'Väntar godkänd.', approved: 'Godkänd',
  sending: 'Skickar…', sent: 'Skickat', failed: 'Misslyckat', skipped: 'Hoppat över', replied: 'Svar mottaget',
}

const activityStatusColor: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  sending: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-muted text-muted-foreground',
  replied: 'bg-indigo-100 text-indigo-800',
}

const AdminProspects = () => {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [minScore, setMinScore] = useState(0)
  const [selected, setSelected] = useState<Prospect | null>(null)
  const [sources, setSources] = useState<ProspectSource[]>([])
  const [activities, setActivities] = useState<OutreachActivity[]>([])
  const [discoverCity, setDiscoverCity] = useState<typeof CITIES[number]>('Linköping')
  const [discoverTerms, setDiscoverTerms] = useState('cykelverkstad, cykelservice, elcykelservice, cykelreparation')
  const [discovering, setDiscovering] = useState(false)
  const [busyAction, setBusyAction] = useState(false)
  const [editing, setEditing] = useState<Record<string, { subject: string; message: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [confirmSend, setConfirmSend] = useState<OutreachActivity | null>(null)
  const [resendStatus, setResendStatus] = useState<ResendStatus | null>(null)
  const [resendLoading, setResendLoading] = useState(false)

  const fetchProspects = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('workshop_prospects')
      .select('*')
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)
    if (cityFilter !== 'all') query = query.eq('city', cityFilter)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (minScore > 0) query = query.gte('score', minScore)
    const { data, error } = await query
    if (error) toast.error('Kunde inte läsa prospects', { description: error.message })
    else setProspects((data as unknown as Prospect[]) || [])
    setLoading(false)
  }, [cityFilter, statusFilter, minScore])

  useEffect(() => { fetchProspects() }, [fetchProspects])

  const fetchResendStatus = useCallback(async () => {
    setResendLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('resend-domain-status', { body: {} })
      if (error) throw error
      setResendStatus(data as ResendStatus)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Okänt fel'
      toast.error('Kunde inte hämta Resend-status', { description: message })
    } finally {
      setResendLoading(false)
    }
  }, [])

  useEffect(() => { fetchResendStatus() }, [fetchResendStatus])

  const openDetails = async (prospect: Prospect) => {
    setSelected(prospect)
    setSources([])
    setActivities([])
    const [{ data: srcs }, { data: acts }] = await Promise.all([
      supabase.from('prospect_sources').select('*').eq('prospect_id', prospect.id).order('fetched_at', { ascending: false }),
      supabase.from('outreach_activities').select('*').eq('prospect_id', prospect.id).order('created_at', { ascending: false }),
    ])
    setSources((srcs as unknown as ProspectSource[]) || [])
    setActivities((acts as unknown as OutreachActivity[]) || [])
  }

  const runDiscovery = async () => {
    setDiscovering(true)
    try {
      const terms = discoverTerms.split(',').map((t) => t.trim()).filter(Boolean)
      const { data, error } = await supabase.functions.invoke('prospect-discover', {
        body: { city: discoverCity, terms, limit_per_term: 8, scrape_top: 5 },
      })
      if (error) throw error
      const stats = (data as { stats?: Record<string, number> })?.stats
      toast.success('Sökning klar', {
        description: stats
          ? `Skannade ${stats.queried} sökningar, ${stats.inserted} nya, ${stats.updated} uppdaterade, ${stats.suppressed} blockerade.`
          : 'Prospects uppdaterade.',
      })
      await fetchProspects()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Okänt fel'
      toast.error('Discovery misslyckades', { description: message })
    } finally {
      setDiscovering(false)
    }
  }

  const refreshActivities = async () => {
    if (!selected) return
    const { data } = await supabase
      .from('outreach_activities').select('*').eq('prospect_id', selected.id).order('created_at', { ascending: false })
    setActivities((data as unknown as OutreachActivity[]) || [])
  }

  const performAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selected) return
    setBusyAction(true)
    try {
      const { data, error } = await supabase.functions.invoke('prospect-action', {
        body: { prospect_id: selected.id, action, ...extra },
      })
      if (error) throw error
      toast.success('Åtgärd utförd')
      await fetchProspects()
      await refreshActivities()
      const draft = (data as { activity?: OutreachActivity })?.activity
      if (draft) setActivities((prev) => [draft, ...prev.filter((a) => a.id !== draft.id)])
      const { data: updated } = await supabase.from('workshop_prospects').select('*').eq('id', selected.id).maybeSingle()
      if (updated) setSelected(updated as unknown as Prospect)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Okänt fel'
      toast.error('Åtgärden misslyckades', { description: message })
    } finally {
      setBusyAction(false)
    }
  }

  const saveDraft = async (activity: OutreachActivity) => {
    const edit = editing[activity.id]
    if (!edit) return
    setSavingId(activity.id)
    try {
      const { error } = await supabase.functions.invoke('prospect-action', {
        body: { action: 'update_draft', activity_id: activity.id, subject: edit.subject, message: edit.message },
      })
      if (error) throw error
      toast.success('Utkastet sparat')
      setEditing((prev) => { const next = { ...prev }; delete next[activity.id]; return next })
      await refreshActivities()
    } catch (error) {
      toast.error('Kunde inte spara', { description: (error as Error).message })
    } finally { setSavingId(null) }
  }

  const approveDraft = async (activity: OutreachActivity) => {
    setSavingId(activity.id)
    try {
      const { error } = await supabase.functions.invoke('prospect-action', {
        body: { action: 'approve_draft', activity_id: activity.id },
      })
      if (error) throw error
      toast.success('Godkänt – redo att skickas')
      await refreshActivities()
    } catch (error) {
      toast.error('Kunde inte godkänna', { description: (error as Error).message })
    } finally { setSavingId(null) }
  }

  const sendNow = async (activity: OutreachActivity) => {
    setSavingId(activity.id)
    try {
      const { error, data } = await supabase.functions.invoke('prospect-send-outreach', {
        body: { activity_id: activity.id, confirm_send: true },
      })
      if (error) throw error
      const msgId = (data as { provider_message_id?: string })?.provider_message_id
      toast.success('Mejlet är skickat via Resend', { description: msgId ? `Resend-id: ${msgId}` : undefined })
      await fetchProspects()
      await refreshActivities()
      const { data: updated } = await supabase.from('workshop_prospects').select('*').eq('id', selected!.id).maybeSingle()
      if (updated) setSelected(updated as unknown as Prospect)
    } catch (error) {
      toast.error('Sändning misslyckades', { description: (error as Error).message })
      await refreshActivities()
    } finally {
      setSavingId(null)
      setConfirmSend(null)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} kopierat`) }
    catch { toast.error('Kunde inte kopiera') }
  }

  const summary = useMemo(() => {
    const total = prospects.length
    const approved = prospects.filter((p) => p.status === 'approved_for_contact').length
    const contacted = prospects.filter((p) => p.status === 'contacted').length
    const newCount = prospects.filter((p) => p.status === 'new').length
    return { total, approved, newCount, contacted }
  }, [prospects])

  const sendBlocked = !resendStatus || !resendStatus.configured || resendStatus.domain_status !== 'verified'

  const startEditing = (activity: OutreachActivity) => {
    setEditing((prev) => ({
      ...prev,
      [activity.id]: { subject: activity.subject || '', message: activity.message },
    }))
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold">Verkstadsrekrytering</h1>
            <p className="text-sm text-muted-foreground">
              {summary.total} prospects · {summary.newCount} nya · {summary.approved} godkända · {summary.contacted} kontaktade
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchProspects} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> Uppdatera
          </Button>
        </div>

        {/* Resend-konfiguration */}
        <div className="border rounded-xl p-4 bg-card flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-2">
            {resendStatus?.domain_status === 'verified'
              ? <ShieldCheck className="h-5 w-5 text-emerald-600" />
              : <ShieldAlert className="h-5 w-5 text-amber-600" />}
            <div>
              <p className="text-sm font-semibold">Avsändare</p>
              <p className="text-xs text-muted-foreground font-mono">{resendStatus?.from || 'Christoffer på Cykelhjalpen.se <info@cykelhjalpen.se>'}</p>
              <p className="text-xs text-muted-foreground">Reply-To: {resendStatus?.reply_to || 'info@cykelhjalpen.se'}</p>
            </div>
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-sm font-semibold">Resend-status</p>
            <p className="text-xs text-muted-foreground">
              Nyckel: {resendStatus?.configured ? '✓ konfigurerad' : '✗ saknas'} · Domän{' '}
              <span className="font-mono">cykelhjalpen.se</span>:{' '}
              <span className={cn('font-semibold', resendStatus?.domain_status === 'verified' ? 'text-emerald-700' : 'text-amber-700')}>
                {resendStatus?.domain_status || '—'}
              </span>
            </p>
            {resendStatus?.domain_message && <p className="text-[11px] text-muted-foreground mt-1">{resendStatus.domain_message}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={fetchResendStatus} disabled={resendLoading}>
            <RotateCcw className={cn('h-4 w-4 mr-2', resendLoading && 'animate-spin')} /> Kontrollera
          </Button>
        </div>

        {/* Discovery */}
        <div className="border rounded-xl p-4 bg-card space-y-3">
          <div className="flex items-center gap-2"><Search className="h-4 w-4" /><h2 className="font-semibold">Starta ny sökning</h2></div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Stad</label>
              <select className="border rounded-md px-3 py-2 text-sm bg-background" value={discoverCity} onChange={(e) => setDiscoverCity(e.target.value as typeof CITIES[number])}>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[280px]">
              <label className="text-xs text-muted-foreground block mb-1">Söktermer (kommaseparerade)</label>
              <Input value={discoverTerms} onChange={(e) => setDiscoverTerms(e.target.value)} />
            </div>
            <Button onClick={runDiscovery} disabled={discovering}>
              {discovering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Sök & extrahera
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Firecrawl hämtar publika företagswebbplatser. Inget mejl skickas – utkast måste godkännas och skickas manuellt.</p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="text-muted-foreground">Stad:</span>
          {(['all', ...CITIES] as const).map((c) => (
            <button key={c} onClick={() => setCityFilter(c)} className={cn('px-3 py-1 rounded-full border text-xs font-semibold', cityFilter === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted')}>{c === 'all' ? 'Alla' : c}</button>
          ))}
          <span className="text-muted-foreground ml-4">Status:</span>
          {(['all', ...STATUSES] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1 rounded-full border text-xs font-semibold', statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted')}>{s === 'all' ? 'Alla' : statusLabel[s] || s}</button>
          ))}
          <span className="text-muted-foreground ml-4">Min poäng:</span>
          <Input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value) || 0)} className="w-20 h-8" />
        </div>

        <div className="grid lg:grid-cols-[1fr_460px] gap-6">
          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Företag</th>
                  <th className="text-left px-3 py-2">Stad</th>
                  <th className="text-left px-3 py-2">Poäng</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Kontakt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Läser in…</td></tr>
                ) : prospects.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Inga prospects matchar filtret. Starta en sökning ovan.</td></tr>
                ) : prospects.map((p) => (
                  <tr key={p.id} className={cn('border-t cursor-pointer hover:bg-muted/40', selected?.id === p.id && 'bg-muted/60')} onClick={() => openDetails(p)}>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{p.company_name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[240px]">{p.normalized_domain || '—'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{p.city}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1 text-xs font-semibold"><Star className="h-3 w-3" />{p.score}</span></td>
                    <td className="px-3 py-2"><span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', statusColor[p.status] || 'bg-muted')}>{statusLabel[p.status] || p.status}</span></td>
                    <td className="px-3 py-2 text-xs">
                      {p.email && <div className="truncate max-w-[180px]"><Mail className="h-3 w-3 inline mr-1" />{p.email}</div>}
                      {p.phone && <div><Phone className="h-3 w-3 inline mr-1" />{p.phone}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detaljer */}
          <div className="border rounded-xl bg-card p-4 h-fit sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Välj ett prospekt för att se detaljer och åtgärder.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold">{selected.company_name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{selected.city}</p>
                  </div>
                  <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', statusColor[selected.status] || 'bg-muted')}>{statusLabel[selected.status] || selected.status}</span>
                </div>

                <div className="text-sm space-y-1">
                  {selected.website && <div className="flex items-center gap-2"><a href={selected.website} target="_blank" rel="noreferrer noopener" className="underline truncate flex-1"><ExternalLink className="h-3 w-3 inline mr-1" />{selected.website}</a></div>}
                  {selected.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /><span className="flex-1 truncate">{selected.email}</span><button className="text-xs underline" onClick={() => copyToClipboard(selected.email!, 'E-post')}><Copy className="h-3 w-3" /></button></div>}
                  {selected.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /><span className="flex-1">{selected.phone}</span><button className="text-xs underline" onClick={() => copyToClipboard(selected.phone!, 'Telefon')}><Copy className="h-3 w-3" /></button></div>}
                  {selected.address && <div className="text-xs text-muted-foreground">{selected.address}</div>}
                  {selected.opening_hours && <div className="text-xs text-muted-foreground">Öppet: {selected.opening_hours}</div>}
                  {selected.last_contacted_at && <div className="text-xs text-muted-foreground">Senast kontaktad: {new Date(selected.last_contacted_at).toLocaleString('sv-SE')} · totalt {selected.contact_count}</div>}
                </div>

                {selected.ai_summary && <div className="text-xs bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">{selected.ai_summary}</div>}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button size="sm" variant="default" onClick={() => performAction('approve')} disabled={busyAction || selected.do_not_contact}>
                    <Check className="h-4 w-4 mr-1" /> Godkänn prospekt
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('reject')} disabled={busyAction}><X className="h-4 w-4 mr-1" /> Avvisa</Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('do_not_contact')} disabled={busyAction} className="text-red-700 border-red-300"><Ban className="h-4 w-4 mr-1" /> Do-not-contact</Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('convert')} disabled={busyAction || selected.do_not_contact}>Konvertera</Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('prepare_draft', { channel: 'email' })} disabled={busyAction || selected.do_not_contact || !selected.email || selected.status !== 'approved_for_contact'}>
                    <Mail className="h-4 w-4 mr-1" /> Skapa e-postutkast
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('prepare_draft', { channel: 'sms' })} disabled={busyAction || selected.do_not_contact || !selected.phone}>
                    <Phone className="h-4 w-4 mr-1" /> Utkast SMS (inaktivt)
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  E-postutkast kan skickas skarpt via Resend efter godkänn. SMS skickas aldrig automatiskt.
                </p>

                {activities.length > 0 && (
                  <div className="pt-3 border-t space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide">Utkast & aktiviteter</h3>
                    {activities.map((activity) => {
                      const edit = editing[activity.id]
                      const isEditable = ['draft', 'pending_approval', 'approved', 'failed'].includes(activity.status)
                      const isEmail = activity.channel === 'email'
                      return (
                        <div key={activity.id} className="text-xs border rounded-lg p-3 space-y-2 bg-background">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="uppercase font-semibold text-[10px] px-1.5 py-0.5 rounded bg-muted">{activity.channel}</span>
                              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', activityStatusColor[activity.status] || 'bg-muted')}>
                                {activityStatusLabel[activity.status] || activity.status}
                              </span>
                            </div>
                            <span className="text-muted-foreground text-[10px]">{new Date(activity.created_at).toLocaleString('sv-SE')}</span>
                          </div>
                          <div className="text-muted-foreground">→ {activity.recipient}</div>

                          {edit ? (
                            <>
                              {isEmail && <Input value={edit.subject} onChange={(e) => setEditing((prev) => ({ ...prev, [activity.id]: { ...prev[activity.id], subject: e.target.value } }))} placeholder="Ämne" />}
                              <Textarea rows={10} value={edit.message} onChange={(e) => setEditing((prev) => ({ ...prev, [activity.id]: { ...prev[activity.id], message: e.target.value } }))} className="text-[11px] font-mono" />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveDraft(activity)} disabled={savingId === activity.id}><Save className="h-3 w-3 mr-1" /> Spara utkast</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditing((prev) => { const next = { ...prev }; delete next[activity.id]; return next })}>Avbryt</Button>
                              </div>
                            </>
                          ) : (
                            <>
                              {isEmail && activity.subject && <div className="font-semibold">{activity.subject}</div>}
                              <div className="text-[11px] whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto border rounded p-2 bg-muted/30">{activity.message}</div>
                              {activity.error && <div className="text-[11px] text-red-700 bg-red-50 rounded p-2 border border-red-200">Fel: {activity.error}</div>}
                              {activity.provider_message_id && <div className="text-[10px] text-muted-foreground">Resend-id: {activity.provider_message_id}</div>}

                              {isEmail && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {isEditable && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => startEditing(activity)}><Pencil className="h-3 w-3 mr-1" /> Redigera</Button>
                                      {(activity.status === 'draft' || activity.status === 'pending_approval') && (
                                        <Button size="sm" variant="outline" onClick={() => approveDraft(activity)} disabled={savingId === activity.id}>
                                          <Check className="h-3 w-3 mr-1" /> Godkänn
                                        </Button>
                                      )}
                                      {(activity.status === 'approved' || activity.status === 'failed') && (
                                        <Button
                                          size="sm"
                                          onClick={() => setConfirmSend(activity)}
                                          disabled={savingId === activity.id || sendBlocked || selected.do_not_contact}
                                          title={sendBlocked ? 'Blockerad: Resend-nyckel eller domän saknas' : ''}
                                        >
                                          {savingId === activity.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                          {activity.status === 'failed' ? 'Försök igen' : 'Skicka via Resend'}
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {sources.length > 0 && (
                  <div className="pt-3 border-t space-y-1">
                    <h3 className="text-xs font-semibold">Källor</h3>
                    {sources.map((source) => (
                      <div key={source.id} className="text-[11px] text-muted-foreground">
                        <a href={source.source_url || '#'} target="_blank" rel="noreferrer noopener" className="underline truncate block">{source.source_url}</a>
                        <span>{source.source_type} · {source.search_term || '—'} · {new Date(source.fetched_at).toLocaleDateString('sv-SE')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Endast publika affärskontakter lagras. Prospects som markeras do-not-contact läggs automatiskt i suppression-listan och kontaktas aldrig igen.
          Rättelse/radering: <a className="underline" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a>.
        </p>
      </div>

      <AlertDialog open={!!confirmSend} onOpenChange={(open) => { if (!open) setConfirmSend(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skicka rekryteringsmejl?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Till:</span> {confirmSend?.recipient}</div>
                <div><span className="font-semibold">Från:</span> {resendStatus?.from}</div>
                <div><span className="font-semibold">Reply-To:</span> {resendStatus?.reply_to}</div>
                <div><span className="font-semibold">Ämne:</span> {confirmSend?.subject || '(genereras automatiskt)'}</div>
                <div className="text-xs text-muted-foreground">Mejlet skickas via Resend. En avregistreringslänk läggs alltid till automatiskt.</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmSend && sendNow(confirmSend)}>Skicka nu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}

export default AdminProspects
