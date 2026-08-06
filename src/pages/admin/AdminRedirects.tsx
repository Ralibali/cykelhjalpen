import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { Button } from '@/components/ui/button'
import { RefreshCw, ArrowRight, MousePointerClick } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'

/**
 * Rapport för de gamla /for-verkstader-länkarna i rekryteringsmejlen.
 * Visar hur många sidvisningar som träffar den gamla URL:en och hur många
 * av samma sessioner som faktiskt landar på rätt sida efter redirecten.
 */

const LEGACY_PATHS = ['/for-verkstader', '/en/for-verkstader', '/en/for-cykelverkstader']
const TARGET_PATHS = ['/for-cykelverkstader', '/en/for-bike-shops']

const RANGES = [
  { label: '24 h', days: 1 },
  { label: '7 dagar', days: 7 },
  { label: '30 dagar', days: 30 },
  { label: '90 dagar', days: 90 },
]

interface Row {
  session_id: string
  path: string
  created_at: string
}

const AdminRedirects = () => {
  const t = useT()
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [legacyViews, setLegacyViews] = useState<Row[]>([])
  const [targetViews, setTargetViews] = useState<Row[]>([])
  const [clicks, setClicks] = useState(0)

  const load = async () => {
    setLoading(true)
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const [legacy, target, clickCount] = await Promise.all([
      supabase
        .from('page_views')
        .select('session_id, path, created_at')
        .in('path', LEGACY_PATHS)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(2000),
      supabase
        .from('page_views')
        .select('session_id, path, created_at')
        .in('path', TARGET_PATHS)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase
        .from('outreach_clicks')
        .select('*', { count: 'exact', head: true })
        .gte('clicked_at', since),
    ])

    if (legacy.error || target.error) {
      toast.error(t('Kunde inte läsa trafikdata'), {
        description: (legacy.error || target.error)?.message,
      })
    }

    setLegacyViews((legacy.data as Row[]) || [])
    setTargetViews((target.data as Row[]) || [])
    setClicks(clickCount.count ?? 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [days])

  const stats = useMemo(() => {
    const legacySessions = new Set(legacyViews.map((r) => r.session_id))
    const targetSessions = new Set(targetViews.map((r) => r.session_id))
    const landed = [...legacySessions].filter((s) => targetSessions.has(s))

    const perLegacyPath = LEGACY_PATHS.map((path) => ({
      path,
      views: legacyViews.filter((r) => r.path === path).length,
    })).filter((r) => r.views > 0)

    const perTargetPath = TARGET_PATHS.map((path) => ({
      path,
      views: targetViews.filter((r) => r.path === path).length,
    }))

    return {
      legacyViews: legacyViews.length,
      legacySessions: legacySessions.size,
      landed: landed.length,
      rate: legacySessions.size ? Math.round((landed.length / legacySessions.size) * 100) : 0,
      perLegacyPath,
      perTargetPath,
      targetViews: targetViews.length,
    }
  }, [legacyViews, targetViews])

  const cards = [
    { label: t('Träffar på gamla URL:er'), value: stats.legacyViews, hint: `${stats.legacySessions} ${t('sessioner')}` },
    { label: t('Landade rätt efter redirect'), value: stats.landed, hint: `${stats.rate}% ${t('av sessionerna')}` },
    { label: t('Sidvisningar på rätt sida'), value: stats.targetViews, hint: TARGET_PATHS.join(' + ') },
    { label: t('Klick i rekryteringsmejl'), value: clicks, hint: t('spårade via outreach-länk') },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t('Redirect-rapport')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('Gamla /for-verkstader-länkar och hur många som landar rätt.')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <Button
                key={r.days}
                size="sm"
                variant={days === r.days ? 'default' : 'outline'}
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-3xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <ArrowRight className="h-4 w-4" /> {t('Gamla URL:er')}
            </h2>
            {stats.perLegacyPath.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('Inga träffar i perioden.')}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {stats.perLegacyPath.map((row) => (
                  <li key={row.path} className="flex justify-between gap-3">
                    <code className="truncate">{row.path}</code>
                    <span className="font-medium">{row.views}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <MousePointerClick className="h-4 w-4" /> {t('Målsidor')}
            </h2>
            <ul className="space-y-2 text-sm">
              {stats.perTargetPath.map((row) => (
                <li key={row.path} className="flex justify-between gap-3">
                  <code className="truncate">{row.path}</code>
                  <span className="font-medium">{row.views}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('Sidvisningar räknas bara för besökare som godkänt analyscookies. Sessioner matchas via samma session-id före och efter redirecten.')}
        </p>
      </div>
    </AdminLayout>
  )
}

export default AdminRedirects
