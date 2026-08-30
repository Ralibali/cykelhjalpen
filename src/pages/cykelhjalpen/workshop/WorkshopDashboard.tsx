import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  CreditCard,
  Gift,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Receipt,
  Send,
  Target,
  Trophy,
  User,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatKrFromOre, useV2Pricing } from '@/lib/v2/pricing'
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

interface WonContact {
  customer_name: string
  customer_email: string
  customer_phone: string | null
  bike_type: string
  repair_category: string
  description: string
  area: string | null
  postcode: string | null
  urgency: string | null
}

type PipelineFilter = 'active' | 'won' | 'lost'

const priceLabel = (row: ResponseRow): string => {
  if (row.estimated_price_min && row.estimated_price_max) return `${row.estimated_price_min}–${row.estimated_price_max} kr`
  if (row.estimated_price_min) return `${row.estimated_price_min} kr`
  if (row.estimated_price_max) return `${row.estimated_price_max} kr`
  return 'Pris ej angivet'
}

const statusBadge = (row: ResponseRow): { label: string; className: string } => {
  if (row.status === 'won' && row.paid) return { label: 'Vunnet · kontakt upplåst', className: 'bg-emerald-100 text-emerald-800' }
  if (row.status === 'won') return { label: 'Vunnet · kunduppgifter låsta', className: 'bg-amber-100 text-amber-800' }
  if (row.status === 'lost') return { label: 'Kunden valde en annan', className: 'bg-muted text-muted-foreground' }
  if (row.status === 'sent') return { label: 'Väntar på kundens val', className: 'bg-blue-100 text-blue-800' }
  return { label: 'Utkast', className: 'bg-amber-100 text-amber-800' }
}

const WorkshopDashboard = () => {
  const t = useT()
  // Canonical pricing (contract §2.1): displayed fee = charged fee.
  const feeKr = formatKrFromOre(useV2Pricing().amountOre)
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ sent: 0, won: 0, lost: 0, paidTotal: 0 })
  const [openToAnswer, setOpenToAnswer] = useState<number | null>(null)
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [contacts, setContacts] = useState<Record<string, WonContact>>({})
  const [payingId, setPayingId] = useState<string | null>(null)
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>('active')

  const wonResponses = useMemo(() => responses.filter((row) => row.status === 'won'), [responses])
  const awaitingPayment = useMemo(() => wonResponses.filter((row) => !row.paid), [wonResponses])
  const winRate = stats.sent > 0 ? Math.round((stats.won / stats.sent) * 100) : 0

  const pipelineRows = useMemo(() => {
    if (pipelineFilter === 'won') return responses.filter((row) => row.status === 'won')
    if (pipelineFilter === 'lost') return responses.filter((row) => row.status === 'lost')
    return responses.filter((row) => row.status === 'sent' || row.status === 'draft' || row.status === 'pending_payment')
  }, [pipelineFilter, responses])

  const load = async () => {
    setLoading(true)
    const [responsesResult, chargesResult, openResult] = await Promise.all([
      supabase
        .from('workshop_responses')
        .select('id, request_id, created_at, estimated_price_min, estimated_price_max, estimated_time, paid, status, used_free_lead')
        .eq('workshop_id', workshop.id)
        .order('created_at', { ascending: false }),
      supabase.from('lead_charges').select('amount').eq('workshop_id', workshop.id).eq('status', 'paid'),
      supabase.functions.invoke('list-open-bike-requests'),
    ])

    const allResponses = (responsesResult.data || []) as ResponseRow[]
    const sentCount = allResponses.filter((row) => ['sent', 'won', 'lost'].includes(row.status)).length
    setResponses(allResponses)
    setStats({
      sent: sentCount,
      won: allResponses.filter((row) => row.status === 'won').length,
      lost: allResponses.filter((row) => row.status === 'lost').length,
      paidTotal: ((chargesResult.data || []) as { amount: number }[]).reduce((sum, charge) => sum + (charge.amount || 0), 0) / 100,
    })

    if (!openResult.error && Array.isArray(openResult.data?.requests)) {
      const answeredIds = new Set(allResponses.map((row) => row.request_id))
      const remaining = (openResult.data.requests as { id: string }[]).filter((row) => !answeredIds.has(row.id))
      setOpenToAnswer(remaining.length)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [workshop.id])

  const revealContact = async (responseId: string) => {
    setRevealingId(responseId)
    const { data, error } = await supabase.functions.invoke('get-won-lead-contact', {
      body: { response_id: responseId },
    })
    setRevealingId(null)
    if (error || data?.error) {
      toast.error(t('Kunde inte läsa kontaktuppgifterna.'), {
        description: String(data?.error || error?.message || t('Försök igen om en stund.')),
      })
      return
    }
    setContacts((current) => ({ ...current, [responseId]: data.contact as WonContact }))
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const responseId = params.get('response_id')
    if (params.get('won_canceled') === 'true') {
      navigate(location.pathname, { replace: true })
      toast.info(t('Köpet avbröts.'), {
        description: t('Kunduppgifterna är fortsatt låsta. Du kan köpa leadet när du är redo.'),
      })
      return
    }
    if (params.get('won_paid') !== 'true' || !responseId) return
    navigate(location.pathname, { replace: true })

    const poll = async () => {
      const toastId = toast.loading(t('Bekräftar leadköpet…'))
      const started = Date.now()
      while (Date.now() - started < 15000) {
        const { data } = await supabase
          .from('workshop_responses')
          .select('id, paid')
          .eq('id', responseId)
          .eq('workshop_id', workshop.id)
          .maybeSingle()
        if (data?.paid) {
          toast.success(t('Leadet är köpt – kunduppgifterna är upplåsta! ✅'), { id: toastId })
          await load()
          await revealContact(responseId)
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
      toast.warning(t('Betalningen är mottagen men bekräftas fortfarande.'), {
        id: toastId,
        description: t('Kunduppgifterna låses upp automatiskt när Stripe har bekräftat köpet.'),
        duration: 12000,
      })
      await load()
    }
    poll()
  }, [location.search])

  const payWinnerFee = async (responseId: string) => {
    setPayingId(responseId)
    const { data, error } = await supabase.functions.invoke('create-winner-payment', {
      body: { response_id: responseId },
    })
    setPayingId(null)
    if (error || data?.error) {
      toast.error(t('Kunde inte starta leadköpet.'), {
        description: String(data?.error || error?.message || t('Försök igen om en stund.')),
      })
      return
    }
    if (data?.url) window.location.assign(data.url)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">{t('Hej {name}!', { name: workshop.company_name })}</h1>
        <p className="text-muted-foreground mt-1">{t('Här ser du nya affärsmöjligheter, offerter och vunna uppdrag i {city}.', { city: workshop.city })}</p>
      </div>

      <FreeLeadsBanner />

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Stat icon={<Bike className="h-5 w-5" />} label={t('Nya uppdrag')} value={openToAnswer ?? '–'} link="/dashboard/verkstad/arenden" />
          <Stat icon={<Send className="h-5 w-5" />} label={t('Skickade offerter')} value={stats.sent} />
          <Stat icon={<Trophy className="h-5 w-5" />} label={t('Vunna uppdrag')} value={stats.won} />
          <Stat icon={<Target className="h-5 w-5" />} label={t('Vinstprocent')} value={`${winRate} %`} />
          <Stat icon={<Gift className="h-5 w-5" />} label={t('Gratis-leads kvar')} value={workshop.free_leads_remaining || 0} />
        </div>
      )}

      {!loading && awaitingPayment.length > 0 && (
        <section className="sticker rounded-3xl bg-card p-6 mb-6 border-2 border-amber-300" aria-labelledby="unlock-wins-heading">
          <div className="flex items-start gap-3 mb-5">
            <span className="inline-flex items-center justify-center rounded-2xl bg-amber-100 p-3">
              <Trophy className="h-6 w-6 text-amber-700" />
            </span>
            <div>
              <h2 id="unlock-wins-heading" className="font-display text-2xl font-bold">{t('Du har vunnit!')}</h2>
              <p className="text-sm text-muted-foreground">{t('Kunden har valt din verkstad. Köp leadet för att se kundens kontaktuppgifter och ta nästa steg.')}</p>
            </div>
          </div>

          <div className="space-y-4">
            {awaitingPayment.map((row) => (
              <div key={row.id} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-display text-xl font-bold">{priceLabel(row)}</span>
                      <span className="rounded-full bg-amber-200/70 text-amber-900 px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1">
                        <LockKeyhole className="h-3.5 w-3.5" /> {t('Kunduppgifter låsta')}
                      </span>
                    </div>
                    <p className="text-sm text-amber-900/80">
                      {t('Du betalar först nu när du faktiskt har vunnit uppdraget. Förlorade offerter kostar aldrig något.')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(row.created_at).toLocaleDateString('sv-SE')}
                      {row.estimated_time ? ` · ${row.estimated_time}` : ''}
                    </p>
                  </div>
                  <Button className="rounded-full h-11 px-6" onClick={() => payWinnerFee(row.id)} disabled={payingId === row.id}>
                    {payingId === row.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                    {t('Köp lead – {price} kr exkl. moms', { price: feeKr })}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-amber-800">
                  {t('Efter betalningen visas kundens namn, telefonnummer, e-postadress och ärende direkt här.')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && wonResponses.some((row) => row.paid) && (
        <section className="sticker rounded-3xl bg-card p-6 mb-6 border-2 border-[hsl(var(--brand-mint))]" aria-labelledby="won-heading">
          <h2 id="won-heading" className="font-display text-xl font-bold mb-1 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--brand-mint))]" /> {t('Vunna uppdrag – redo att kontakta')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{t('Kontakta kunden så snart som möjligt och bekräfta nästa steg.')}</p>
          <div className="space-y-4">
            {wonResponses.filter((row) => row.paid).map((row) => {
              const contact = contacts[row.id]
              return (
                <div key={row.id} className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{priceLabel(row)}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.used_free_lead ? t('Upplåst med gratis-lead') : t('Lead köpt och upplåst')}
                      </p>
                    </div>
                    {!contact && (
                      <Button size="sm" variant="outline" onClick={() => revealContact(row.id)} disabled={revealingId === row.id}>
                        {revealingId === row.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <User className="h-4 w-4 mr-2" />}
                        {t('Visa kunduppgifter')}
                      </Button>
                    )}
                  </div>

                  {contact && (
                    <div className="mt-4 rounded-xl bg-background border p-4 space-y-3">
                      <div>
                        <p className="text-lg font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {contact.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {contact.bike_type} · {contact.repair_category}
                          {contact.area ? ` · ${contact.area}` : ''}
                          {contact.postcode ? ` · ${contact.postcode}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {contact.customer_phone && (
                          <Button asChild size="sm" className="rounded-full">
                            <a href={`tel:${contact.customer_phone}`}><Phone className="h-4 w-4 mr-1.5" /> {t('Ring kunden')}</a>
                          </Button>
                        )}
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                          <a href={`mailto:${contact.customer_email}`}><Mail className="h-4 w-4 mr-1.5" /> {t('Mejla kunden')}</a>
                        </Button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{contact.description}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="grid md:grid-cols-[1fr_auto] gap-5 items-center sticker rounded-3xl bg-card p-6 mb-6">
        <div>
          <h2 className="font-display text-xl font-bold mb-1">
            {openToAnswer === null
              ? t('Se nya uppdrag i {city}', { city: workshop.city })
              : openToAnswer > 0
                ? t('{count} nya uppdrag väntar i {city}', { count: openToAnswer, city: workshop.city })
                : t('Inga nya uppdrag i {city} just nu', { city: workshop.city })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {openToAnswer !== null && openToAnswer > 0
              ? t('Max tre verkstäder kan svara. Det är alltid kostnadsfritt att lämna offert.')
              : t('Vi meddelar dig när ett nytt uppdrag matchar din verkstad.')}
          </p>
        </div>
        <Link to="/dashboard/verkstad/arenden" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium shadow-brand cta-playful">
          <Bike className="h-4 w-4" /> {openToAnswer !== null && openToAnswer > 0 ? t('Se och svara') : t('Öppna uppdrag')}
        </Link>
      </section>

      {!loading && responses.length > 0 && (
        <section className="sticker rounded-3xl bg-card p-6 mb-6" aria-labelledby="pipeline-heading">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 id="pipeline-heading" className="font-display text-xl font-bold">{t('Min offertpipeline')}</h2>
              <p className="text-sm text-muted-foreground">{t('Följ vad som väntar på kunden, vad du vunnit och vad du förlorat.')}</p>
            </div>
            <Link to="/dashboard/verkstad/arenden" className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1">
              {t('Se alla uppdrag')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <PipelineButton active={pipelineFilter === 'active'} onClick={() => setPipelineFilter('active')} icon={<Send className="h-3.5 w-3.5" />}>
              {t('Väntar på kund')} ({responses.filter((row) => row.status === 'sent').length})
            </PipelineButton>
            <PipelineButton active={pipelineFilter === 'won'} onClick={() => setPipelineFilter('won')} icon={<Trophy className="h-3.5 w-3.5" />}>
              {t('Vunna')} ({stats.won})
            </PipelineButton>
            <PipelineButton active={pipelineFilter === 'lost'} onClick={() => setPipelineFilter('lost')} icon={<XCircle className="h-3.5 w-3.5" />}>
              {t('Förlorade')} ({stats.lost})
            </PipelineButton>
          </div>

          {pipelineRows.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              {t('Inga offerter i den här kategorin ännu.')}
            </div>
          ) : (
            <div className="divide-y">
              {pipelineRows.slice(0, 8).map((row) => {
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
          )}
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <section className="sticker rounded-3xl bg-card p-6">
          <h2 className="font-display text-xl font-bold mb-2">{t('Så fungerar det')}</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground/85">
            <li>{t('Välj ett nytt uppdrag och lämna en kostnadsfri offert.')}</li>
            <li>{t('Kunden jämför maximalt tre offerter och väljer en verkstad.')}</li>
            <li>{t('Vinner du köper du leadet för {price} kr exkl. moms, eller använder ett gratis-lead.', { price: feeKr })}</li>
            <li>{t('När leadet är upplåst ser du kunduppgifterna och kontaktar kunden.')}</li>
          </ol>
        </section>

        <section className="sticker rounded-3xl bg-card p-6">
          <h2 className="font-display text-xl font-bold mb-2 flex items-center gap-2"><Receipt className="h-5 w-5" /> {t('Leads och betalningar')}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t('Du har {count} gratis-leads kvar och har betalat totalt {amount} kr.', {
              count: workshop.free_leads_remaining || 0,
              amount: stats.paidTotal.toLocaleString('sv-SE'),
            })}
          </p>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/verkstad/betalningar"><CreditCard className="h-4 w-4 mr-2" /> {t('Se betalningar och leads')}</Link>
          </Button>
        </section>
      </div>
    </div>
  )
}

const PipelineButton = ({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
    )}
  >
    {icon}
    {children}
  </button>
)

const Stat = ({ icon, label, value, link }: { icon: React.ReactNode; label: string; value: string | number; link?: string }) => {
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
