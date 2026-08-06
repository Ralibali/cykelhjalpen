import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import {
  Search, RefreshCw, Ban, Check, X, ExternalLink, Mail, Phone, MapPin, Star, Copy, Loader2,
  Send, ShieldCheck, ShieldAlert, Save, Pencil, RotateCcw, MousePointerClick,
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
import { useT } from '@/lib/i18n'

// Edge-funktioner svarar med { error: "riktigt felmeddelande" } i bodyn vid non-2xx,
// men functions.invoke exponerar bara en generisk text. Läs bodyn så att panelen
// visar vad som faktiskt gick fel (t.ex. Resend 422, dagskvot, cooldown).
const extractFunctionError = async (error: unknown): Promise<string> => {
  const err = error as { message?: string; context?: { json?: () => Promise<unknown> } }
  try {
    const body = await err?.context?.json?.() as { error?: unknown; message?: unknown } | undefined
    if (body?.error) return String(body.error)
    if (body?.message) return String(body.message)
  } catch { /* body kunde inte läsas – fall tillbaka */ }
  return err?.message ?? 'Okänt fel'
}

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
  // Saknas före migreringen av kind-kolumnen – behandlas som 'initial'.
  kind?: string
}

interface OutreachClick {
  id: string
  activity_id: string
  prospect_id: string
  clicked_at: string
}

interface ClickStats {
  count: number
  last: string
}

// Slår ihop klickrader per aktivitet eller prospekt: antal + senaste klicket.
const aggregateClicks = (clicks: OutreachClick[], key: 'activity_id' | 'prospect_id'): Record<string, ClickStats> => {
  const stats: Record<string, ClickStats> = {}
  for (const click of clicks) {
    const k = click[key]
    const existing = stats[k]
    if (existing) {
      existing.count += 1
      if (new Date(click.clicked_at).getTime() > new Date(existing.last).getTime()) existing.last = click.clicked_at
    } else {
      stats[k] = { count: 1, last: click.clicked_at }
    }
  }
  return stats
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

const statusLabelSv: Record<string, string> = {
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

const activityStatusLabelSv: Record<string, string> = {
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
  const t = useT()
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
  const [prospectClicks, setProspectClicks] = useState<Record<string, ClickStats>>({})
  const [activityClicks, setActivityClicks] = useState<Record<string, ClickStats>>({})

  const fetchProspects = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('workshop_prospects')
      .select('*')
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)
    if (cityFilter !== 'all') query = query.eq('city', cityFilter)
    // 'clicked' är inget riktigt status – det filtreras klient-sidigt mot klickstatistiken.
    if (statusFilter !== 'all' && statusFilter !== 'clicked') query = query.eq('status', statusFilter)
    if (minScore > 0) query = query.gte('score', minScore)
    const { data, error } = await query
    if (error) toast.error(t('Kunde inte läsa prospects'), { description: error.message })
    else setProspects((data as unknown as Prospect[]) || [])
    // Klickstatistik för listans badges. Tål att tabellen inte finns ännu
    // (om migreringen inte deployats) – då blir det bara inga badges.
    const { data: clicks } = await supabase
      .from('outreach_clicks')
      .select('id, activity_id, prospect_id, clicked_at')
      .order('clicked_at', { ascending: false })
      .limit(1000)
    setProspectClicks(clicks ? aggregateClicks(clicks as OutreachClick[], 'prospect_id') : {})
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
      const message = error instanceof Error ? error.message : t('Okänt fel')
      toast.error(t('Kunde inte hämta Resend-status'), { description: message })
    } finally {
      setResendLoading(false)
    }
  }, [])

  useEffect(() => { fetchResendStatus() }, [fetchResendStatus])

  const openDetails = async (prospect: Prospect) => {
    setSelected(prospect)
    setSources([])
    setActivities([])
    setActivityClicks({})
    const [{ data: srcs }, { data: acts }, { data: clicks }] = await Promise.all([
      supabase.from('prospect_sources').select('*').eq('prospect_id', prospect.id).order('fetched_at', { ascending: false }),
      supabase.from('outreach_activities').select('*').eq('prospect_id', prospect.id).order('created_at', { ascending: false }),
      supabase.from('outreach_clicks').select('id, activity_id, prospect_id, clicked_at').eq('prospect_id', prospect.id).order('clicked_at', { ascending: false }),
    ])
    setSources((srcs as unknown as ProspectSource[]) || [])
    setActivities((acts as unknown as OutreachActivity[]) || [])
    setActivityClicks(clicks ? aggregateClicks(clicks as OutreachClick[], 'activity_id') : {})
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
      toast.success(t('Sökning klar'), {
        description: stats
          ? t('Skannade {queried} sökningar, {inserted} nya, {updated} uppdaterade, {suppressed} blockerade.', { queried: stats.queried, inserted: stats.inserted, updated: stats.updated, suppressed: stats.suppressed })
          : t('Prospects uppdaterade.'),
      })
      await fetchProspects()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Okänt fel')
      toast.error(t('Discovery misslyckades'), { description: message })
    } finally {
      setDiscovering(false)
    }
  }

  const refreshActivities = async () => {
    if (!selected) return
    const [{ data }, { data: clicks }] = await Promise.all([
      supabase.from('outreach_activities').select('*').eq('prospect_id', selected.id).order('created_at', { ascending: false }),
      supabase.from('outreach_clicks').select('id, activity_id, prospect_id, clicked_at').eq('prospect_id', selected.id).order('clicked_at', { ascending: false }),
    ])
    setActivities((data as unknown as OutreachActivity[]) || [])
    setActivityClicks(clicks ? aggregateClicks(clicks as OutreachClick[], 'activity_id') : {})
  }

  const performAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selected) return
    setBusyAction(true)
    try {
      const { data, error } = await supabase.functions.invoke('prospect-action', {
        body: { prospect_id: selected.id, action, ...extra },
      })
      if (error) throw error
      toast.success(t('Åtgärd utförd'))
      await fetchProspects()
      await refreshActivities()
      const draft = (data as { activity?: OutreachActivity })?.activity
      if (draft) setActivities((prev) => [draft, ...prev.filter((a) => a.id !== draft.id)])
      const { data: updated } = await supabase.from('workshop_prospects').select('*').eq('id', selected.id).maybeSingle()
      if (updated) setSelected(updated as unknown as Prospect)
    } catch (error) {
      toast.error(t('Åtgärden misslyckades'), { description: await extractFunctionError(error) })
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
      toast.success(t('Utkastet sparat'))
      setEditing((prev) => { const next = { ...prev }; delete next[activity.id]; return next })
      await refreshActivities()
    } catch (error) {
      toast.error(t('Kunde inte spara'), { description: await extractFunctionError(error) })
    } finally { setSavingId(null) }
  }

  const approveDraft = async (activity: OutreachActivity) => {
    setSavingId(activity.id)
    try {
      const { error } = await supabase.functions.invoke('prospect-action', {
        body: { action: 'approve_draft', activity_id: activity.id },
      })
      if (error) throw error
      toast.success(t('Godkänt – redo att skickas'))
      await refreshActivities()
    } catch (error) {
      toast.error(t('Kunde inte godkänna'), { description: await extractFunctionError(error) })
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
      toast.success(t('Mejlet är skickat via Resend'), { description: msgId ? t('Resend-id: {id}', { id: msgId }) : undefined })
      await fetchProspects()
      await refreshActivities()
      const { data: updated } = await supabase.from('workshop_prospects').select('*').eq('id', selected!.id).maybeSingle()
      if (updated) setSelected(updated as unknown as Prospect)
    } catch (error) {
      toast.error(t('Sändning misslyckades'), { description: await extractFunctionError(error) })
      await refreshActivities()
    } finally {
      setSavingId(null)
      setConfirmSend(null)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(t('{label} kopierat', { label })) }
    catch { toast.error(t('Kunde inte kopiera')) }
  }

  const summary = useMemo(() => {
    const total = prospects.length
    const approved = prospects.filter((p) => p.status === 'approved_for_contact').length
    const contacted = prospects.filter((p) => p.status === 'contacted').length
    const newCount = prospects.filter((p) => p.status === 'new').length
    return { total, approved, newCount, contacted }
  }, [prospects])

  // Filterläget "Klickade": bara prospekt med minst ett registrerat klick,
  // senaste klicket först så att varma leads hamnar överst.
  const visibleProspects = useMemo(() => {
    if (statusFilter !== 'clicked') return prospects
    return prospects
      .filter((p) => prospectClicks[p.id])
      .sort((a, b) => new Date(prospectClicks[b.id].last).getTime() - new Date(prospectClicks[a.id].last).getTime())
  }, [prospects, statusFilter, prospectClicks])

  const sendBlocked = !resendStatus || !resendStatus.configured || resendStatus.domain_status !== 'verified'

  const statusLabel = (s: string) => t(statusLabelSv[s] || s)
  const activityStatusLabel = (s: string) => t(activityStatusLabelSv[s] || s)

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
            <h1 className="font-display text-2xl font-bold">{t('Verkstadsrekrytering')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('{total} prospects · {newCount} nya · {approved} godkända · {contacted} kontaktade', { total: summary.total, newCount: summary.newCount, approved: summary.approved, contacted: summary.contacted })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchProspects} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> {t('Uppdatera')}
          </Button>
        </div>

        {/* Resend-konfiguration */}
        <div className="border rounded-xl p-4 bg-card flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-2">
            {resendStatus?.domain_status === 'verified'
              ? <ShieldCheck className="h-5 w-5 text-emerald-600" />
              : <ShieldAlert className="h-5 w-5 text-amber-600" />}
            <div>
              <p className="text-sm font-semibold">{t('Avsändare')}</p>
              <p className="text-xs text-muted-foreground font-mono">{resendStatus?.from || 'Christoffer på Cykelhjalpen.se <info@cykelhjalpen.se>'}</p>
              <p className="text-xs text-muted-foreground">{t('Reply-To: {email}', { email: resendStatus?.reply_to || 'info@cykelhjalpen.se' })}</p>
            </div>
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-sm font-semibold">{t('Resend-status')}</p>
            <p className="text-xs text-muted-foreground">
              {t('Nyckel:')} {resendStatus?.configured ? t('✓ konfigurerad') : t('✗ saknas')} · {t('Domän')}{' '}
              <span className="font-mono">cykelhjalpen.se</span>:{' '}
              <span className={cn('font-semibold', resendStatus?.domain_status === 'verified' ? 'text-emerald-700' : 'text-amber-700')}>
                {resendStatus?.domain_status || '—'}
              </span>
            </p>
            {resendStatus?.domain_message && <p className="text-[11px] text-muted-foreground mt-1">{resendStatus.domain_message}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={fetchResendStatus} disabled={resendLoading}>
            <RotateCcw className={cn('h-4 w-4 mr-2', resendLoading && 'animate-spin')} /> {t('Kontrollera')}
          </Button>
        </div>

        {/* Discovery */}
        <div className="border rounded-xl p-4 bg-card space-y-3">
          <div className="flex items-center gap-2"><Search className="h-4 w-4" /><h2 className="font-semibold">{t('Starta ny sökning')}</h2></div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t('Stad')}</label>
              <select className="border rounded-md px-3 py-2 text-sm bg-background" value={discoverCity} onChange={(e) => setDiscoverCity(e.target.value as typeof CITIES[number])}>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[280px]">
              <label className="text-xs text-muted-foreground block mb-1">{t('Söktermer (kommaseparerade)')}</label>
              <Input value={discoverTerms} onChange={(e) => setDiscoverTerms(e.target.value)} />
            </div>
            <Button onClick={runDiscovery} disabled={discovering}>
              {discovering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {t('Sök & extrahera')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('Firecrawl hämtar publika företagswebbplatser. Inget mejl skickas – utkast måste godkännas och skickas manuellt.')}</p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="text-muted-foreground">{t('Stad:')}</span>
          {(['all', ...CITIES] as const).map((c) => (
            <button key={c} onClick={() => setCityFilter(c)} className={cn('px-3 py-1 rounded-full border text-xs font-semibold', cityFilter === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted')}>{c === 'all' ? t('Alla') : c}</button>
          ))}
          <span className="text-muted-foreground ml-4">{t('Status:')}</span>
          {(['all', 'clicked', ...STATUSES] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1 rounded-full border text-xs font-semibold', statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted', s === 'clicked' && statusFilter !== s && 'border-green-300 text-green-800')}>{s === 'all' ? t('Alla') : s === 'clicked' ? t('Klickade') : statusLabel(s) || s}</button>
          ))}
          <span className="text-muted-foreground ml-4">{t('Min poäng:')}</span>
          <Input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value) || 0)} className="w-20 h-8" />
        </div>

        <div className="grid lg:grid-cols-[1fr_460px] gap-6">
          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">{t('Företag')}</th>
                  <th className="text-left px-3 py-2">{t('Stad')}</th>
                  <th className="text-left px-3 py-2">{t('Poäng')}</th>
                  <th className="text-left px-3 py-2">{t('Status')}</th>
                  <th className="text-left px-3 py-2">{t('Kontakt')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{t('Läser in…')}</td></tr>
                ) : visibleProspects.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{statusFilter === 'clicked' ? t('Inga registrerade klick ännu – skicka fler mejl eller vänta på svar.') : t('Inga prospects matchar filtret. Starta en sökning ovan.')}</td></tr>
                ) : visibleProspects.map((p) => (
                  <tr key={p.id} className={cn('border-t cursor-pointer hover:bg-muted/40', selected?.id === p.id && 'bg-muted/60')} onClick={() => openDetails(p)}>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{p.company_name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[240px]">{p.normalized_domain || '—'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{p.city}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1 text-xs font-semibold"><Star className="h-3 w-3" />{p.score}</span></td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', statusColor[p.status] || 'bg-muted')}>{statusLabel(p.status)}</span>
                      {prospectClicks[p.id] && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800" title={`Senast ${new Date(prospectClicks[p.id].last).toLocaleString('sv-SE')}`}>
                            <MousePointerClick className="h-3 w-3" />
                            {prospectClicks[p.id].count > 1 ? t('Klickat {n}×', { n: prospectClicks[p.id].count }) : t('Klickat')}
                          </span>
                        </div>
                      )}
                    </td>
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
              <p className="text-sm text-muted-foreground">{t('Välj ett prospekt för att se detaljer och åtgärder.')}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold">{selected.company_name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{selected.city}</p>
                  </div>
                  <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', statusColor[selected.status] || 'bg-muted')}>{statusLabel(selected.status)}</span>
                </div>

                <div className="text-sm space-y-1">
                  {selected.website && <div className="flex items-center gap-2"><a href={selected.website} target="_blank" rel="noreferrer noopener" className="underline truncate flex-1"><ExternalLink className="h-3 w-3 inline mr-1" />{selected.website}</a></div>}
                  {selected.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /><span className="flex-1 truncate">{selected.email}</span><button className="text-xs underline" onClick={() => copyToClipboard(selected.email!, t('E-post'))}><Copy className="h-3 w-3" /></button></div>}
                  {selected.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /><span className="flex-1">{selected.phone}</span><button className="text-xs underline" onClick={() => copyToClipboard(selected.phone!, t('Telefon'))}><Copy className="h-3 w-3" /></button></div>}
                  {selected.address && <div className="text-xs text-muted-foreground">{selected.address}</div>}
                  {selected.opening_hours && <div className="text-xs text-muted-foreground">{t('Öppet: {hours}', { hours: selected.opening_hours })}</div>}
                  {selected.last_contacted_at && <div className="text-xs text-muted-foreground">{t('Senast kontaktad: {date} · totalt {count}', { date: new Date(selected.last_contacted_at).toLocaleString('sv-SE'), count: selected.contact_count })}</div>}
                  {prospectClicks[selected.id] && (
                    <div className="text-xs font-medium text-green-800 flex items-center gap-1">
                      <MousePointerClick className="h-3 w-3" />
                      {t('Har klickat på registreringslänken {count} {times} – senast {date}', { count: prospectClicks[selected.id].count, times: prospectClicks[selected.id].count === 1 ? t('gång') : t('gånger'), date: new Date(prospectClicks[selected.id].last).toLocaleString('sv-SE') })}
                    </div>
                  )}
                </div>

                {selected.ai_summary && <div className="text-xs bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">{selected.ai_summary}</div>}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button size="sm" variant="default" onClick={() => performAction('approve')} disabled={busyAction || selected.do_not_contact}>
                    <Check className="h-4 w-4 mr-1" /> {t('Godkänn prospekt')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('reject')} disabled={busyAction}><X className="h-4 w-4 mr-1" /> {t('Avvisa')}</Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('do_not_contact')} disabled={busyAction} className="text-red-700 border-red-300"><Ban className="h-4 w-4 mr-1" /> {t('Do-not-contact')}</Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('convert')} disabled={busyAction || selected.do_not_contact}>{t('Konvertera')}</Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('prepare_draft', { channel: 'email' })} disabled={busyAction || selected.do_not_contact || !selected.email || selected.status !== 'approved_for_contact'}>
                    <Mail className="h-4 w-4 mr-1" /> {t('Skapa e-postutkast')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('prepare_draft', { channel: 'sms' })} disabled={busyAction || selected.do_not_contact || !selected.phone}>
                    <Phone className="h-4 w-4 mr-1" /> {t('Utkast SMS (inaktivt)')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-300 text-green-800"
                    onClick={() => performAction('prepare_followup')}
                    disabled={busyAction || selected.do_not_contact || !selected.email || selected.status !== 'contacted' || !prospectClicks[selected.id]}
                    title={prospectClicks[selected.id] ? t('Skapar ett uppföljningsutkast till prospektet som klickat på länken') : t('Aktiveras när prospektet klickat på registreringslänken')}
                  >
                    <MousePointerClick className="h-4 w-4 mr-1" /> {t('Uppföljning till klickare')}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t('E-postutkast kan skickas skarpt via Resend efter godkänn. SMS skickas aldrig automatiskt.')}
                </p>

                {activities.length > 0 && (
                  <div className="pt-3 border-t space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide">{t('Utkast & aktiviteter')}</h3>
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
                                {activityStatusLabel(activity.status)}
                              </span>
                              {activity.kind === 'followup' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800">{t('Uppföljning')}</span>
                              )}
                            </div>
                            <span className="text-muted-foreground text-[10px]">{new Date(activity.created_at).toLocaleString('sv-SE')}</span>
                          </div>
                          <div className="text-muted-foreground">{t('→ {recipient}', { recipient: activity.recipient })}</div>

                          {edit ? (
                            <>
                              {isEmail && <Input value={edit.subject} onChange={(e) => setEditing((prev) => ({ ...prev, [activity.id]: { ...prev[activity.id], subject: e.target.value } }))} placeholder={t('Ämne')} />}
                              <Textarea rows={10} value={edit.message} onChange={(e) => setEditing((prev) => ({ ...prev, [activity.id]: { ...prev[activity.id], message: e.target.value } }))} className="text-[11px] font-mono" />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveDraft(activity)} disabled={savingId === activity.id}><Save className="h-3 w-3 mr-1" /> {t('Spara utkast')}</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditing((prev) => { const next = { ...prev }; delete next[activity.id]; return next })}>{t('Avbryt')}</Button>
                              </div>
                            </>
                          ) : (
                            <>
                              {isEmail && activity.subject && <div className="font-semibold">{activity.subject}</div>}
                              <div className="text-[11px] whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto border rounded p-2 bg-muted/30">{activity.message}</div>
                              {activity.error && <div className="text-[11px] text-red-700 bg-red-50 rounded p-2 border border-red-200">{t('Fel: {error}', { error: activity.error })}</div>}
                              {activity.provider_message_id && <div className="text-[10px] text-muted-foreground">{t('Resend-id: {id}', { id: activity.provider_message_id })}</div>}
                              {activityClicks[activity.id] && (
                                <div className="text-[11px] font-medium text-green-800 bg-green-50 rounded p-2 border border-green-200 flex items-center gap-1.5">
                                  <MousePointerClick className="h-3 w-3 shrink-0" />
                                  {t('Klickade på registreringslänken {count} {times} – senast {date}', { count: activityClicks[activity.id].count, times: activityClicks[activity.id].count === 1 ? t('gång') : t('gånger'), date: new Date(activityClicks[activity.id].last).toLocaleString('sv-SE') })}
                                </div>
                              )}

                              {isEmail && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {isEditable && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => startEditing(activity)}><Pencil className="h-3 w-3 mr-1" /> {t('Redigera')}</Button>
                                      {(activity.status === 'draft' || activity.status === 'pending_approval') && (
                                        <Button size="sm" variant="outline" onClick={() => approveDraft(activity)} disabled={savingId === activity.id}>
                                          <Check className="h-3 w-3 mr-1" /> {t('Godkänn')}
                                        </Button>
                                      )}
                                      {(activity.status === 'approved' || activity.status === 'failed') && (
                                        <Button
                                          size="sm"
                                          onClick={() => setConfirmSend(activity)}
                                          disabled={savingId === activity.id || sendBlocked || selected.do_not_contact}
                                          title={sendBlocked ? t('Blockerad: Resend-nyckel eller domän saknas') : ''}
                                        >
                                          {savingId === activity.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                          {activity.status === 'failed' ? t('Försök igen') : t('Skicka via Resend')}
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
                    <h3 className="text-xs font-semibold">{t('Källor')}</h3>
                    {sources.map((source) => (
                      <div key={source.id} className="text-[11px] text-muted-foreground">
                        <a href={source.source_url || '#'} target="_blank" rel="noreferrer noopener" className="underline truncate block">{source.source_url}</a>
                        <span>{t('{type} · {term} · {date}', { type: source.source_type, term: source.search_term || '—', date: new Date(source.fetched_at).toLocaleDateString('sv-SE') })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('Endast publika affärskontakter lagras. Prospects som markeras do-not-contact läggs automatiskt i suppression-listan och kontaktas aldrig igen.')}
          {' '}{t('Rättelse/radering:')} <a className="underline" href="mailto:info@cykelhjalpen.se">info@cykelhjalpen.se</a>.
        </p>
      </div>

      <AlertDialog open={!!confirmSend} onOpenChange={(open) => { if (!open) setConfirmSend(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Skicka rekryteringsmejl?')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">{t('Till:')}</span> {confirmSend?.recipient}</div>
                <div><span className="font-semibold">{t('Från:')}</span> {resendStatus?.from}</div>
                <div><span className="font-semibold">{t('Reply-To:')}</span> {resendStatus?.reply_to}</div>
                <div><span className="font-semibold">{t('Ämne:')}</span> {confirmSend?.subject || t('(genereras automatiskt)')}</div>
                <div className="text-xs text-muted-foreground">{t('Mejlet skickas via Resend. En avregistreringslänk läggs alltid till automatiskt.')}</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Avbryt')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmSend && sendNow(confirmSend)}>{t('Skicka nu')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}

export default AdminProspects
