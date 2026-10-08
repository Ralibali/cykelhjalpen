import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const PAGE_SIZE = 50
const ACTION_LABELS: Record<string, string> = {
  create: 'Skapade', add: 'Lade till', update: 'Uppdaterade', edit: 'Ändrade',
  delete: 'Raderade', remove: 'Tog bort', approve: 'Godkände', reject: 'Avvisade',
}

function actionLabel(action: string) {
  return action.split(/[_.]/).map(part => ACTION_LABELS[part] || part.replace(/-/g, ' ')).join(' ')
}

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [names, setNames] = useState<Record<string, string>>({})
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [filters, setFilters] = useState({ action: '', from: '', to: '' })
  const [draft, setDraft] = useState(filters)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(false)
      try {
        let query = supabase.from('audit_log').select('*', { count: 'exact' })
          .order('created_at', { ascending: false }).order('id', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        const action = filters.action.replace(/[%_]/g, '').trim()
        if (action) query = query.ilike('action', `%${action}%`)
        if (filters.from) query = query.gte('created_at', new Date(`${filters.from}T00:00:00`).toISOString())
        if (filters.to) {
          const nextDay = new Date(`${filters.to}T00:00:00`)
          nextDay.setDate(nextDay.getDate() + 1)
          query = query.lt('created_at', nextDay.toISOString())
        }
        const { data, error: queryError, count } = await query
        if (queryError) throw queryError
        const rows = (data || []) as AuditEntry[]
        const ids = [...new Set(rows.map(e => e.admin_id))]
        const adminNames: Record<string, string> = {}
        if (ids.length) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
          profiles?.forEach(p => { adminNames[p.id] = p.full_name || p.email || 'Admin' })
        }
        if (!cancelled) { setEntries(rows); setTotal(count || 0); setNames(adminNames) }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [filters, page, refresh])

  return <CykelAdminLayout>
    <h1 className="font-display text-2xl font-bold mb-6">Händelselogg</h1>
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Adminåtgärder med tidpunkt, ansvarig och berörd post.</p>
        <Button variant="outline" size="sm" onClick={() => setRefresh(n => n + 1)} disabled={loading} aria-label="Uppdatera händelseloggen">
          <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />Uppdatera
        </Button>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); setPage(0); setFilters({ ...draft }) }}>
        <div><Label htmlFor="audit-action">Händelse</Label><Input id="audit-action" placeholder="Sök händelse" value={draft.action} onChange={e => setDraft({ ...draft, action: e.target.value })} /></div>
        <div><Label htmlFor="audit-from">Från datum</Label><Input id="audit-from" type="date" value={draft.from} max={draft.to || undefined} onChange={e => setDraft({ ...draft, from: e.target.value })} /></div>
        <div><Label htmlFor="audit-to">Till datum</Label><Input id="audit-to" type="date" value={draft.to} min={draft.from || undefined} onChange={e => setDraft({ ...draft, to: e.target.value })} /></div>
        <Button type="submit" disabled={loading}>Filtrera</Button>
        <Button type="button" variant="ghost" onClick={() => { const empty = { action: '', from: '', to: '' }; setDraft(empty); setFilters(empty); setPage(0) }}>Rensa</Button>
      </form>
      {error ? <p role="alert" className="text-destructive">Händelseloggen kunde inte hämtas. Försök uppdatera igen.</p> : loading ? <p role="status">Laddar händelser…</p> : <>
        <p role="status" className="text-sm text-muted-foreground">{total === 0 ? 'Inga händelser matchar filtret.' : `Visar ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} av ${total} händelser`}</p>
        <ol className="space-y-3">{entries.map(entry => <li key={entry.id} className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{actionLabel(entry.action)} · {entry.target_type}</p><time dateTime={entry.created_at} className="text-sm text-muted-foreground">{new Date(entry.created_at).toLocaleString('sv-SE')}</time></div>
          <p className="text-sm">Utförd av {names[entry.admin_id] || 'Admin'}</p>
          {entry.target_id && <p className="text-sm break-all"><span className="text-muted-foreground">Berörd post: </span>{entry.target_id}</p>}
          <details className="text-sm"><summary className="cursor-pointer">Visa JSON och fullständiga id</summary><pre className="mt-2 overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap break-all">{JSON.stringify({ admin_id: entry.admin_id, action: entry.action, target_type: entry.target_type, target_id: entry.target_id, details: entry.details }, null, 2)}</pre></details>
        </li>)}</ol>
        <div className="flex items-center gap-3"><Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Föregående</Button><span className="text-sm">Sida {page + 1} av {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span><Button variant="outline" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Nästa</Button></div>
      </>}
    </div>
  </CykelAdminLayout>
}
