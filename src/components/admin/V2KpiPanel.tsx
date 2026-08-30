// V2 KPI panel (S6 data-moat) — reads the additive v2_kpi_* views.
// Renders nothing until the migration is deployed (loadV2KpiData → null).
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useT } from '@/lib/i18n'
import { formatHoursToQuote } from '@/lib/cykelMarketplaceHealth'
import {
  formatPercent,
  loadV2KpiData,
  type V2KpiData,
} from '@/lib/v2/kpi'

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-4">{children}</th>
)
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="py-1.5 pr-4 text-sm tabular-nums border-t border-border/50">{children}</td>
)

const V2KpiPanel = () => {
  const t = useT()
  const [data, setData] = useState<V2KpiData | null>(null)

  useEffect(() => {
    let cancelled = false
    loadV2KpiData(supabase as never).then((result) => {
      if (!cancelled && result) setData(result)
    })
    return () => { cancelled = true }
  }, [])

  // Migration not deployed (or not admin) → hide the section entirely.
  if (!data) return null

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold mb-1">{t('V2 KPI (data-moat)')}</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t('Från SQL-vyerna v2_kpi_* – fill rate, choice rate, aktivering och regleringsmix per stad/vecka.')}
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-5 overflow-x-auto">
          <h3 className="font-display font-semibold mb-3">{t('Per stad (alla tider)')}</h3>
          <table className="w-full">
            <thead>
              <tr>
                <Th>{t('Stad')}</Th>
                <Th>{t('Godkända')}</Th>
                <Th>{t('Fill rate')}</Th>
                <Th>{t('Offerter/ärende')}</Th>
                <Th>{t('Första offert (median)')}</Th>
                <Th>{t('Choice rate')}</Th>
                <Th>{t('Aktiva verkstäder 30d')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.cities.map((row) => (
                <tr key={row.city_slug ?? 'unknown'}>
                  <Td>{row.city_slug ?? t('Övrigt')}{row.cluster_slug ? ` (${row.cluster_slug})` : ''}</Td>
                  <Td>{row.approved}</Td>
                  <Td>{formatPercent(row.fill_rate)}</Td>
                  <Td>{row.quotes_per_approved_request ?? '–'}</Td>
                  <Td>{formatHoursToQuote(row.median_hours_to_first_quote)}</Td>
                  <Td>{formatPercent(row.choice_rate)}</Td>
                  <Td>{row.active_workshops_30d}/{row.approved_workshops}</Td>
                </tr>
              ))}
              {data.cities.length === 0 && (
                <tr><Td>{t('Ingen data ännu.')}</Td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-card rounded-xl border p-5 overflow-x-auto">
          <h3 className="font-display font-semibold mb-3">{t('Verkstadsaktivering per stad')}</h3>
          <table className="w-full">
            <thead>
              <tr>
                <Th>{t('Stad')}</Th>
                <Th>{t('Registrerade')}</Th>
                <Th>{t('Godkända')}</Th>
                <Th>{t('Första offert')}</Th>
                <Th>{t('Första vinst')}</Th>
                <Th>{t('Aktiveringsgrad')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.activation.map((row) => (
                <tr key={row.city_slug ?? 'unknown'}>
                  <Td>{row.city_slug ?? t('Övrigt')}</Td>
                  <Td>{row.registered_workshops}</Td>
                  <Td>{row.approved_workshops}</Td>
                  <Td>{row.workshops_with_first_quote}</Td>
                  <Td>{row.workshops_with_first_win}</Td>
                  <Td>{formatPercent(row.activation_rate)}</Td>
                </tr>
              ))}
              {data.activation.length === 0 && (
                <tr><Td>{t('Ingen data ännu.')}</Td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-card rounded-xl border p-5 overflow-x-auto">
          <h3 className="font-display font-semibold mb-3">{t('Reglering & intäkter per månad')}</h3>
          <table className="w-full">
            <thead>
              <tr>
                <Th>{t('Månad')}</Th>
                <Th>{t('Vunna')}</Th>
                <Th>{t('Kort')}</Th>
                <Th>{t('Gratis-lead')}</Th>
                <Th>{t('Obetalda')}</Th>
                <Th>{t('Intäkt')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.settlement.map((row) => (
                <tr key={row.month}>
                  <Td>{row.month}</Td>
                  <Td>{row.won}</Td>
                  <Td>{row.settled_card}</Td>
                  <Td>{row.settled_free_lead}</Td>
                  <Td>{row.won_unpaid}</Td>
                  <Td>{t('{n} kr', { n: row.revenue_sek })}</Td>
                </tr>
              ))}
              {data.settlement.length === 0 && (
                <tr><Td>{t('Ingen data ännu.')}</Td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-card rounded-xl border p-5 overflow-x-auto">
          <h3 className="font-display font-semibold mb-3">{t('Veckokohorter')}</h3>
          <table className="w-full">
            <thead>
              <tr>
                <Th>{t('Vecka')}</Th>
                <Th>{t('Stad')}</Th>
                <Th>{t('Ärenden')}</Th>
                <Th>{t('Fill rate')}</Th>
                <Th>{t('Vunna')}</Th>
                <Th>{t('Choice rate')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.weekly.slice(0, 16).map((row) => (
                <tr key={`${row.week}-${row.city_slug ?? 'unknown'}`}>
                  <Td>{row.week}</Td>
                  <Td>{row.city_slug ?? t('Övrigt')}</Td>
                  <Td>{row.requests}</Td>
                  <Td>{formatPercent(row.fill_rate)}</Td>
                  <Td>{row.won}</Td>
                  <Td>{formatPercent(row.choice_rate)}</Td>
                </tr>
              ))}
              {data.weekly.length === 0 && (
                <tr><Td>{t('Ingen data ännu.')}</Td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default V2KpiPanel
