import { useEffect, useState } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Bike, Receipt, Send, Gift, Loader2, ArrowRight } from 'lucide-react'
import type { WorkshopContext } from '@/components/cykelhjalpen/WorkshopLayout'
import { FreeLeadsBanner } from '@/components/workshop/FreeLeadsBanner'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface ResponseRow {
  id: string
  request_id: string
  created_at: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  estimated_time: string | null
  paid: boolean
  status: string
  used_free_lead: boolean
}

const priceLabel = (row: ResponseRow): string => {
  if (row.estimated_price_min && row.estimated_price_max) return `${row.estimated_price_min}–${row.estimated_price_max} kr`
  if (row.estimated_price_min) return `${row.estimated_price_min} kr`
  if (row.estimated_price_max) return `${row.estimated_price_max} kr`
  return 'Pris ej angivet'
}

const statusBadge = (row: ResponseRow): { label: string; className: string } => {
  if (row.paid && row.used_free_lead) return { label: 'Skickad · gratislead', className: 'bg-emerald-100 text-emerald-800' }
  if (row.paid) return { label: 'Skickad', className: 'bg-emerald-100 text-emerald-800' }
  if (row.status === 'closed_for_responses') return { label: 'Stängd', className: 'bg-muted text-muted-foreground' }
  return { label: 'Ej skickad', className: 'bg-amber-100 text-amber-800' }
}

const WorkshopDashboard = () => {
  const t = useT()
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>()
  const [stats, setStats] = useState({ sent: 0, paidTotal: 0 })
  const [openToAnswer, setOpenToAnswer] = useState<number | null>(null)
  const [recentResponses, setRecentResponses] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [responsesResult, chargesResult, recentResult, openResult] = await Promise.all([
        supabase.from('workshop_responses').select('id, request_id, paid').eq('workshop_id', workshop.id),
        supabase.from('lead_charges').select('amount').eq('workshop_id', workshop.id).eq('status', 'paid'),
        supabase
          .from('workshop_responses')
          .select('id, request_id, created_at, estimated_price_min, estimated_price_max, estimated_time, paid, status, used_free_lead')
          .eq('workshop_id', workshop.id)
          .order('created_at', { ascending: false })
          .limit(5),
        // Öppna ärenden filtreras till verkstadens stad i edge-funktionen.
        supabase.functions.invoke('list-open-bike-requests'),
      ])

      const responses = (responsesResult.data || []) as { id: string; request_id: string; paid: boolean }[]
      setStats({
        sent: responses.filter((row) => row.paid).length,
        paidTotal: ((chargesResult.data || []) as { amount: number }[]).reduce((sum, charge) => sum + (charge.amount || 0), 0) / 100,
      })
      setRecentResponses((recentResult.data || []) as ResponseRow[])

      if (!openResult.error && Array.isArray(openResult.data?.requests)) {
        const answeredIds = new Set(responses.map((row) => row.request_id))
        const remaining = (openResult.data.requests as { id: string }[]).filter((row) => !answeredIds.has(row.id))
        setOpenToAnswer(remaining.length)
      }
      setLoading(false)
    }
    load()
  }, [workshop.id])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">{t('Hej {name}!', { name: workshop.company_name })}</h1>
        <p className="text-muted-foreground mt-1">{t('Din verkstad är ansluten i {city}.', { city: workshop.city })}</p>
      </div>

      <FreeLeadsBanner />

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Stat icon={<Send className="h-5 w-5" />} label={t('Skickade offerter')} value={stats.sent} />
          <Stat icon={<Receipt className="h-5 w-5" />} label={t('Betalat totalt')} value={`${stats.paidTotal.toLocaleString('sv-SE')} kr`} link="/dashboard/verkstad/betalningar" />
          <Stat icon={<Gift className="h-5 w-5" />} label={t('Gratis-leads kvar')} value={workshop.free_leads_remaining || 0} />
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_auto] gap-5 items-center sticker rounded-3xl bg-card p-6 mb-6">
        <div>
          <h2 className="font-display text-xl font-bold mb-1">
            {openToAnswer === null
              ? t('Se öppna ärenden i {city}', { city: workshop.city })
              : openToAnswer > 0
                ? t('{count} ärenden i {city} väntar på svar', { count: openToAnswer, city: workshop.city })
                : t('Inga nya ärenden i {city} just nu', { city: workshop.city })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {openToAnswer !== null && openToAnswer > 0
              ? t('Först till kvarn gäller – max tre verkstäder hinner svara per ärende.')
              : t('Vi pingar dig så fort ett nytt ärende dyker upp.')}
          </p>
        </div>
        <Link to="/dashboard/verkstad/arenden" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium shadow-brand cta-playful">
          <Bike className="h-4 w-4" /> {openToAnswer !== null && openToAnswer > 0 ? t('Svara nu') : t('Öppna ärenden')}
        </Link>
      </div>

      {!loading && recentResponses.length > 0 && (
        <div className="sticker rounded-3xl bg-card p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-xl font-bold">{t('Mina senaste offerter')}</h2>
            <Link to="/dashboard/verkstad/arenden" className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1">
              {t('Se alla')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y">
            {recentResponses.map((row) => {
              const badge = statusBadge(row)
              return (
                <div key={row.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{priceLabel(row)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString('sv-SE')}
                      {row.estimated_time ? ` · ${row.estimated_time}` : ''}
                    </p>
                  </div>
                  <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1 shrink-0', badge.className)}>
                    {t(badge.label)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="sticker rounded-3xl bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-2">{t('Så fungerar det')}</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground/85">
          <li>{t('Välj bland ärenden från cyklister i {city}.', { city: workshop.city })}</li>
          <li>{t('Skriv pris, beräknad tid och ett tydligt meddelande.')}</li>
          <li>{t('Granska offerten och betala via Stripe först när du vill skicka den.')}</li>
          <li>{t('Max tre verkstäder kan lämna prisförslag per ärende.')}</li>
        </ol>
      </div>
    </div>
  )
}

const Stat = ({ icon, label, value, link }: any) => {
  const inner = (
    <div className="sticker rounded-3xl bg-card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform h-full">
      <div className="rounded-2xl bg-primary text-primary-foreground p-2.5">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="font-display text-2xl font-bold">{value}</div>
      </div>
    </div>
  )
  return link ? <Link to={link}>{inner}</Link> : inner
}

export default WorkshopDashboard
