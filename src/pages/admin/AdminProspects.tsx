import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { Search, RefreshCw, Ban, Check, X, ExternalLink, Mail, Phone, MapPin, Star, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
  notes: string | null
  created_at: string
  normalized_domain: string | null
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
}

const CITIES = ['Linköping', 'Norrköping', 'Uppsala', 'Lund'] as const
const STATUSES = ['new', 'review', 'approved_for_contact', 'contacted', 'replied', 'converted', 'rejected', 'do_not_contact'] as const

const statusLabel: Record<string, string> = {
  new: 'Ny',
  review: 'Granskning',
  approved_for_contact: 'Godkänd',
  contacted: 'Kontaktad',
  replied: 'Svarat',
  converted: 'Konverterad',
  rejected: 'Avvisad',
  do_not_contact: 'Do-not-contact',
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

  const fetchProspects = async () => {
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
    if (error) {
      toast.error('Kunde inte läsa prospects', { description: error.message })
    } else {
      setProspects((data as unknown as Prospect[]) || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchProspects() }, [cityFilter, statusFilter, minScore])

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
      const draft = (data as { activity?: OutreachActivity })?.activity
      if (draft) {
        setActivities((prev) => [draft, ...prev])
      }
      // Uppdatera markerad prospekt
      const { data: updated } = await supabase.from('workshop_prospects').select('*').eq('id', selected.id).maybeSingle()
      if (updated) setSelected(updated as unknown as Prospect)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Okänt fel'
      toast.error('Åtgärden misslyckades', { description: message })
    } finally {
      setBusyAction(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} kopierat`)
    } catch {
      toast.error('Kunde inte kopiera')
    }
  }

  const summary = useMemo(() => {
    const total = prospects.length
    const approved = prospects.filter((p) => p.status === 'approved_for_contact').length
    const newCount = prospects.filter((p) => p.status === 'new').length
    return { total, approved, newCount }
  }, [prospects])

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold">Verkstadsrekrytering</h1>
            <p className="text-sm text-muted-foreground">
              {summary.total} prospects · {summary.newCount} nya · {summary.approved} godkända för kontakt
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchProspects} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> Uppdatera
          </Button>
        </div>

        {/* Discovery-panel */}
        <div className="border rounded-xl p-4 bg-card space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <h2 className="font-semibold">Starta ny sökning</h2>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Stad</label>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={discoverCity}
                onChange={(e) => setDiscoverCity(e.target.value as typeof CITIES[number])}
              >
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
          <p className="text-xs text-muted-foreground">
            Firecrawl hämtar publika företagswebbplatser. Inga externa mejl/SMS skickas – utkast måste godkännas manuellt.
          </p>
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

        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          {/* Lista */}
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
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold"><Star className="h-3 w-3" />{p.score}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', statusColor[p.status] || 'bg-muted')}>{statusLabel[p.status] || p.status}</span>
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
          <div className="border rounded-xl bg-card p-4 h-fit sticky top-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Välj ett prospekt för att se detaljer och åtgärder.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold">{selected.company_name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{selected.city}
                    </p>
                  </div>
                  <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', statusColor[selected.status] || 'bg-muted')}>{statusLabel[selected.status] || selected.status}</span>
                </div>

                <div className="text-sm space-y-1">
                  {selected.website && (
                    <div className="flex items-center gap-2">
                      <a href={selected.website} target="_blank" rel="noreferrer noopener" className="underline truncate flex-1"><ExternalLink className="h-3 w-3 inline mr-1" />{selected.website}</a>
                    </div>
                  )}
                  {selected.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" /><span className="flex-1 truncate">{selected.email}</span>
                      <button className="text-xs underline" onClick={() => copyToClipboard(selected.email!, 'E-post')}><Copy className="h-3 w-3" /></button>
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /><span className="flex-1">{selected.phone}</span>
                      <button className="text-xs underline" onClick={() => copyToClipboard(selected.phone!, 'Telefon')}><Copy className="h-3 w-3" /></button>
                    </div>
                  )}
                  {selected.address && <div className="text-xs text-muted-foreground">{selected.address}</div>}
                  {selected.opening_hours && <div className="text-xs text-muted-foreground">Öppet: {selected.opening_hours}</div>}
                </div>

                {selected.services.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.services.slice(0, 12).map((service, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{service}</span>
                    ))}
                  </div>
                )}

                {selected.ai_summary && (
                  <div className="text-xs bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">{selected.ai_summary}</div>
                )}

                <div className="text-xs text-muted-foreground">
                  Poäng: {selected.score}/100 · Senast kontrollerad: {selected.last_checked_at ? new Date(selected.last_checked_at).toLocaleString('sv-SE') : '—'}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button size="sm" variant="default" onClick={() => performAction('approve')} disabled={busyAction || selected.do_not_contact}>
                    <Check className="h-4 w-4 mr-1" /> Godkänn
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('reject')} disabled={busyAction}>
                    <X className="h-4 w-4 mr-1" /> Avvisa
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('do_not_contact')} disabled={busyAction} className="text-red-700 border-red-300">
                    <Ban className="h-4 w-4 mr-1" /> Do-not-contact
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('convert')} disabled={busyAction || selected.do_not_contact}>
                    Konvertera
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('prepare_draft', { channel: 'email' })} disabled={busyAction || selected.do_not_contact || !selected.email}>
                    <Mail className="h-4 w-4 mr-1" /> Utkast e-post
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => performAction('prepare_draft', { channel: 'sms' })} disabled={busyAction || selected.do_not_contact || !selected.phone}>
                    <Phone className="h-4 w-4 mr-1" /> Utkast SMS
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Inget skickas automatiskt. Utkasten sparas som draft och måste godkännas manuellt utanför appen.
                </p>

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

                {activities.length > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <h3 className="text-xs font-semibold">Utkast & aktiviteter</h3>
                    {activities.map((activity) => (
                      <div key={activity.id} className="text-xs border rounded p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{activity.channel.toUpperCase()} · {activity.status}</span>
                          <span className="text-muted-foreground">{new Date(activity.created_at).toLocaleString('sv-SE')}</span>
                        </div>
                        {activity.subject && <div className="font-semibold">{activity.subject}</div>}
                        <div className="text-muted-foreground">→ {activity.recipient}</div>
                        <Textarea readOnly value={activity.message} rows={5} className="text-[11px]" />
                        <p className="text-[10px] text-red-700">Kopiera texten och skicka manuellt utanför Cykelhjälpen. Appen skickar inget automatiskt.</p>
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
    </AdminLayout>
  )
}

export default AdminProspects
