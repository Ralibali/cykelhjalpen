import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AdminLayout } from './AdminDashboard'
import CykelMarketplaceHealthPanel from '@/components/admin/CykelMarketplaceHealthPanel'
import V2KpiPanel from '@/components/admin/V2KpiPanel'
import { supabase } from '@/integrations/supabase/client'
import { useT } from '@/lib/i18n'
import {
  buildCykelMarketplaceSnapshot,
  formatHoursToQuote,
  loadCykelMarketplaceRows,
  type CykelMarketplaceSnapshot,
} from '@/lib/cykelMarketplaceHealth'

const StatCard = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="bg-card rounded-xl border p-5">
    <p className="text-2xl font-bold font-display">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
)

const CykelAdminAnalytics = () => {
  const t = useT()
  const [snapshot, setSnapshot] = useState<CykelMarketplaceSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const rows = await loadCykelMarketplaceRows(supabase)
        if (cancelled) return
        setSnapshot(buildCykelMarketplaceSnapshot(rows.requests, rows.workshops))
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('Okänt fel'))
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [t])

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-2">{t('Statistik & Analys')}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {t('Cykelhjälpens marketplace mäts från bike_repair_requests, workshop_responses och workshops.')}
      </p>

      {loading && <div className="animate-pulse h-40 bg-muted rounded-xl mb-6" />}
      {error && <div className="text-sm text-destructive mb-6">{t('Kunde inte läsa marketplace-data: {error}', { error })}</div>}

      {snapshot && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
            <StatCard label={t('Ärenden')} value={snapshot.totals.requests} hint={t('{n} väntar', { n: snapshot.totals.pending })} />
            <StatCard label={t('Godkända ärenden')} value={snapshot.totals.approved} />
            <StatCard label={t('Avvisade')} value={snapshot.totals.rejected} />
            <StatCard label={t('Offerter')} value={snapshot.totals.quotes} hint={t('{n} vunna', { n: snapshot.totals.wonQuotes })} />
            <StatCard label={t('Godkända verkstäder')} value={snapshot.totals.approvedWorkshops} />
            <StatCard label={t('Aktiva verkstäder')} value={snapshot.totals.activeWorkshops} hint={t('Godkänd + offert senaste 30 dagarna')} />
            <StatCard label={t('Tysta verkstäder')} value={snapshot.totals.silentWorkshops} hint={t('Godkända utan offert senaste 30 dagarna')} />
            <StatCard label={t('Tid till första offert')} value={formatHoursToQuote(snapshot.totals.medianHoursToFirstQuote)} hint={t('Median')} />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-display font-semibold mb-4">{t('Nya ärenden (30 dagar)')}</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={snapshot.requestsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t('Ärenden')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-display font-semibold mb-4">{t('Nya offerter (30 dagar)')}</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={snapshot.quotesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name={t('Offerter')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-display font-semibold mb-4">{t('Reparationstyper')}</h2>
              <div className="space-y-3">
                {snapshot.categoryDist.length === 0 && <p className="text-sm text-muted-foreground">{t('Inga ärenden ännu.')}</p>}
                {snapshot.categoryDist.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{item.name}</span>
                    <span className="font-semibold text-sm tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-xl border p-5">
              <h2 className="font-display font-semibold mb-4">{t('Topp verkstäder')}</h2>
              <div className="space-y-2">
                {snapshot.topWorkshops.map((workshop, index) => (
                  <div key={workshop.id} className="flex items-center gap-3 p-2 rounded-lg">
                    <span className="text-xs font-bold text-muted-foreground w-5">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{workshop.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {workshop.city || t('Okänd stad')} · {workshop.liquidity === 'active' ? t('Aktiv') : workshop.liquidity === 'silent' ? t('Tyst') : t('Ej godkänd')}
                      </p>
                    </div>
                    <span className="text-xs font-semibold">{t('{n} offerter', { n: workshop.quotes })}</span>
                  </div>
                ))}
                {snapshot.topWorkshops.length === 0 && <p className="text-sm text-muted-foreground">{t('Inga offerter ännu.')}</p>}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">{t('Ärenden med offerter')}</p>
              <p className="text-2xl font-bold">
                {snapshot.totals.requestsWithQuotes}
                <span className="text-sm font-normal text-muted-foreground">/{snapshot.totals.requests}</span>
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">{t('Snitt offerter/ärende')}</p>
              <p className="text-2xl font-bold">{snapshot.totals.avgQuotesPerRequest}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">{t('Tid till första offert')}</p>
              <p className="text-2xl font-bold">{formatHoursToQuote(snapshot.totals.medianHoursToFirstQuote)}</p>
            </div>
          </div>

          <CykelMarketplaceHealthPanel snapshot={snapshot} />
        </>
      )}

      <V2KpiPanel />
    </AdminLayout>
  )
}

export default CykelAdminAnalytics
