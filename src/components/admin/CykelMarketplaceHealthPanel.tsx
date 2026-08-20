import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, ShieldCheck, TrendingDown } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useT } from '@/lib/i18n'
import {
  CITY_HEALTH_LABELS,
  buildCykelMarketplaceSnapshot,
  formatHoursToQuote,
  loadCykelMarketplaceRows,
  type CityHealthStatus,
  type CityRollup,
  type CykelMarketplaceSnapshot,
} from '@/lib/cykelMarketplaceHealth'

const STATUS_META: Record<CityHealthStatus, { cls: string; Icon: typeof Activity }> = {
  healthy: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: ShieldCheck },
  watch: { cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Activity },
  low_supply: { cls: 'bg-orange-50 text-orange-700 border-orange-200', Icon: TrendingDown },
  pause_or_recruit: { cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: AlertTriangle },
}

const CityStatus = ({ status }: { status: CityHealthStatus }) => {
  const t = useT()
  const meta = STATUS_META[status] || STATUS_META.watch
  const Icon = meta.Icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
      <Icon className="h-3 w-3" /> {t(CITY_HEALTH_LABELS[status] || CITY_HEALTH_LABELS.watch)}
    </span>
  )
}

export const CykelCityRollupTable = ({ rows }: { rows: CityRollup[] }) => {
  const t = useT()
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left font-medium px-1 py-2">{t('Stad')}</th>
            <th className="text-right font-medium px-1 py-2">{t('Ärenden')}</th>
            <th className="text-right font-medium px-1 py-2">{t('Väntar')}</th>
            <th className="text-right font-medium px-1 py-2">{t('Godkända')}</th>
            <th className="text-right font-medium px-1 py-2">{t('Avvisade')}</th>
            <th className="text-right font-medium px-1 py-2">{t('0 offerter')}</th>
            <th className="text-right font-medium px-1 py-2">{t('1 offert')}</th>
            <th className="text-right font-medium px-1 py-2">{t('2 offerter')}</th>
            <th className="text-right font-medium px-1 py-2">{t('3+ offerter')}</th>
            <th className="text-right font-medium px-1 py-2">{t('Tid till första offert')}</th>
            <th className="text-right font-medium px-1 py-2">{t('Godkända verkstäder')}</th>
            <th className="text-right font-medium px-1 py-2">{t('Aktiva verkstäder')}</th>
            <th className="text-right font-medium px-1 py-2">{t('Tysta verkstäder')}</th>
            <th className="text-right font-medium px-1 py-2">{t('Status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.city} className="border-t">
              <td className="px-1 py-2 font-medium">{row.city}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.requests}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.pending}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.approved}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.rejected}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.quotes0}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.quotes1}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.quotes2}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.quotes3plus}</td>
              <td className="px-1 py-2 text-right tabular-nums">{formatHoursToQuote(row.medianHoursToFirstQuote)}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.approvedWorkshops}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.activeWorkshops}</td>
              <td className="px-1 py-2 text-right tabular-nums">{row.silentWorkshops}</td>
              <td className="px-1 py-2 text-right"><CityStatus status={row.healthStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CykelMarketplaceHealthPanel = ({ snapshot: provided }: { snapshot?: CykelMarketplaceSnapshot }) => {
  const t = useT()
  const [snapshot, setSnapshot] = useState<CykelMarketplaceSnapshot | null>(provided ?? null)
  const [loading, setLoading] = useState(!provided)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (provided) {
      setSnapshot(provided)
      setLoading(false)
      setError(null)
      return
    }

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
  }, [provided, t])

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-xl" />
  if (error) return <div className="text-sm text-destructive">{t('Kunde inte läsa marketplace-data: {error}', { error })}</div>
  if (!snapshot) return null

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> {t('Marketplace health')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('Utbud vs efterfrågan per stad. Aktiv verkstad = godkänd och minst en offert de senaste 30 dagarna.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{t('Godkända verkstäder')}</p>
          <p className="text-2xl font-display font-bold mt-1">{snapshot.totals.approvedWorkshops}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{t('Aktiva verkstäder')}</p>
          <p className="text-2xl font-display font-bold mt-1">{snapshot.totals.activeWorkshops}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{t('Tysta verkstäder')}</p>
          <p className="text-2xl font-display font-bold mt-1">{snapshot.totals.silentWorkshops}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{t('Tid till första offert')}</p>
          <p className="text-2xl font-display font-bold mt-1">{formatHoursToQuote(snapshot.totals.medianHoursToFirstQuote)}</p>
        </div>
      </div>

      <CykelCityRollupTable rows={snapshot.cityRollup} />

      <div className="mt-5">
        <h3 className="text-sm font-semibold mb-2">{t('Godkända men tysta verkstäder')}</h3>
        <p className="text-xs text-muted-foreground mb-3">
          {t('Godkända verkstäder utan offert de senaste 30 dagarna. De räknas inte som aktiva.')}
        </p>
        {snapshot.silentWorkshops.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('Inga tysta verkstäder just nu.')}</p>
        ) : (
          <ul className="space-y-2">
            {snapshot.silentWorkshops.map((workshop) => (
              <li key={workshop.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                <span className="font-medium truncate">{workshop.company_name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{workshop.city || t('Okänd stad')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default CykelMarketplaceHealthPanel
