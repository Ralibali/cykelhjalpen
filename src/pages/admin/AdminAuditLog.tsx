import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { Shield, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, any>
  created_at: string
}

const AdminAuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adminNames, setAdminNames] = useState<Map<string, string>>(new Map())

  const fetchEntries = async () => {
    setLoading(true)
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200)
    if (data) {
      setEntries(data as AuditEntry[])
      const ids = [...new Set(data.map(e => e.admin_id))]
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
        if (profiles) {
          const map = new Map<string, string>()
          profiles.forEach(p => map.set(p.id, p.full_name || p.email || 'Admin'))
          setAdminNames(map)
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchEntries() }, [])

  const actionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) return 'bg-emerald-50 text-emerald-700'
    if (action.includes('delete') || action.includes('remove')) return 'bg-red-50 text-red-700'
    if (action.includes('update') || action.includes('edit')) return 'bg-amber-50 text-amber-700'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Audit-logg</h1>
        <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />Uppdatera
        </Button>
      </div>

      {loading && entries.length === 0 ? (
        <p className="text-muted-foreground">Laddar...</p>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground">Inga loggposter ännu. Admin-åtgärder loggas här automatiskt.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="bg-card rounded-xl border p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5', actionColor(e.action))}>
                    {e.action}
                  </span>
                  <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-muted text-muted-foreground">{e.target_type}</span>
                </div>
                <p className="text-sm mt-1">
                  <span className="font-medium">{adminNames.get(e.admin_id) || 'Admin'}</span>
                  {e.target_id && <span className="text-muted-foreground"> → {e.target_id.slice(0, 8)}...</span>}
                </p>
                {Object.keys(e.details || {}).length > 0 && (
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{JSON.stringify(e.details)}</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                {new Date(e.created_at).toLocaleString('sv-SE')}
              </span>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminAuditLog
