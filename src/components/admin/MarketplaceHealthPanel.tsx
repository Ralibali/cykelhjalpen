import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Activity, AlertTriangle, ShieldCheck, TrendingDown } from 'lucide-react'

type HealthStatus = 'healthy' | 'watch' | 'low_supply' | 'pause_or_recruit'

interface CategoryHealth {
  category: string
  open_projects: number
  active_suppliers: number
  health_status: HealthStatus
}

const STATUS_META: Record<HealthStatus, { label: string; cls: string; Icon: typeof Activity }> = {
  healthy: { label: 'Sund', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: ShieldCheck },
  watch: { label: 'Bevaka', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Activity },
  low_supply: { label: 'Låg täckning', cls: 'bg-orange-50 text-orange-700 border-orange-200', Icon: TrendingDown },
  pause_or_recruit: { label: 'Pausa eller rekrytera', cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: AlertTriangle },
}

const MarketplaceHealthPanel = () => {
  const [rows, setRows] = useState<CategoryHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await (supabase as any)
        .from('marketplace_category_health')
        .select('*')
      if (error) {
        setError(error.message)
      } else {
        const sorted = (data as CategoryHealth[] || []).slice().sort((a, b) => {
          const order: HealthStatus[] = ['pause_or_recruit', 'low_supply', 'watch', 'healthy']
          return order.indexOf(a.health_status) - order.indexOf(b.health_status)
        })
        setRows(sorted)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-xl" />
  if (error) return <div className="text-sm text-destructive">Kunde inte läsa marketplace-data: {error}</div>

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Marketplace health
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Utbud vs efterfrågan per kategori.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Inga kategorier att visa ännu.</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left font-medium px-1 py-2">Kategori</th>
                <th className="text-right font-medium px-1 py-2">Öppna uppdrag</th>
                <th className="text-right font-medium px-1 py-2">Aktiva byråer</th>
                <th className="text-right font-medium px-1 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const meta = STATUS_META[r.health_status] || STATUS_META.watch
                const Icon = meta.Icon
                return (
                  <tr key={r.category} className="border-t">
                    <td className="px-1 py-2 font-medium">{r.category}</td>
                    <td className="px-1 py-2 text-right tabular-nums">{r.open_projects}</td>
                    <td className="px-1 py-2 text-right tabular-nums">{r.active_suppliers}</td>
                    <td className="px-1 py-2 text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MarketplaceHealthPanel
