import { useEffect, useState } from 'react'
import { useOutletContext, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Bike, Receipt, Send, Gift, Loader2, ArrowRight, Trophy, CreditCard, Mail, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LEAD_FEE_KR } from '@/lib/pricing'
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

const priceLabel = (row: ResponseRow): string => {
  if (row.estimated_price_min && row.estimated_price_max) return `${row.estimated_price_min}–${row.estimated_price_max} kr`
  if (row.estimated_price_min) return `${row.estimated_price_min} kr`
  if (row.estimated_price_max) return `${row.estimated_price_max} kr`
  return 'Pris ej angivet'
}

const statusBadge = (row: ResponseRow): { label: string; className: string } => {
  if (row.status === 'won' && row.paid) return { label: 'Vunnit', className: 'bg-emerald-100 text-emerald-800' }
  if (row.status === 'won') return { label: 'Vunnit – betala', className: 'bg-amber-100 text-amber-800' }
  if (row.status === 'lost') return { label: 'Ej vald', className: 'bg-muted text-muted-foreground' }
  if (row.status === 'sent') return { label: 'Skickad', className: 'bg-emerald-100 text-emerald-800' }
  if (row.paid) return { label: 'Skickad', className: 'bg-emerald-100 text-emerald-800' }
  if (row.status === 'closed_for_responses') return { label: 'Stängd', className: 'bg-muted text-muted-foreground' }
  return { label: 'Utkast', className: 'bg-amber-100 text-amber-800' }
}

const WorkshopDashboard = () => {
  const t = useT()
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ sent: 0, won: 0, paidTotal: 0 })
  const [openToAnswer, setOpenToAnswer] = useState<number | null>(null)
  const [recentResponses, setRecentResponses] = useState<ResponseRow[]>([])
  const [wonResponses, setWonResponses] = useState<ResponseRow[]>([])
  const [contacts, setContacts] = useState<Record<string, WonContact>>({})
  const [payingId, setPayingId] = useState<string | null>(null)
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [responsesResult, chargesResult, recentResult, wonResult, openResult] = await Promise.all([
      supabase.from('workshop_responses').select('id, request_id, status, paid').eq('workshop_id', workshop.id),
      supabase.from('lead_charges').select('amount').eq('workshop_id', workshop.id).eq('status', 'paid'),
      supabase
        .from('workshop_responses')
        .select('id, request_id, created_at, estimated_price_min, estimated_price_max, estimated_time, paid, status, used_free_lead')
        .eq('workshop_id', workshop.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('workshop_responses')
        .select('id, request_id, created_at, estimated_price_min, estimated_price_max, estimated_time, paid, status, used_free_lead')
        .eq('workshop_id', workshop.id)
        .eq('status', 'won')
        .order('created_at', { ascending: false }),
      // Öppna ärenden filtreras till verkstadens stad i edge-funktionen.
      supabase.functions.invoke('list-open-bike-requests'),
    ])

    const responses = (responsesResult.data || []) as { id: string; request_id: string; status: string; paid: boolean }[]
    setStats({
      sent: responses.filter((row) => row.status === 'sent' || row.status === 'won' || row.paid).length,
      won: responses.filter((row) => row.status === 'won').length,
      paidTotal: ((chargesResult.data || []) as { amount: number }[]).reduce((sum, charge) => sum + (charge.amount || 0), 0) / 100,
    })
    setRecentResponses((recentResult.data || []) as ResponseRow[])
    setWonResponses((wonResult.data || []) as ResponseRow[])

    if (!openResult.error && Array.isArray(openResult.data?.requests)) {
      const answeredIds = new Set(responses.map((row) => row.request_id))
      const remaining = (openResult.data.requests as { id: string }[]).filter((row) => !answeredIds.has(row.id))
      setOpenToAnswer(remaining.length)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [workshop.id])

  // Lås upp kundens kontaktuppgifter – edge-funktionen släpper bara dem när
  // vinstavgiften är betald eller reglerad med gratis-lead.
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

  // Retur från Stripe efter betald vinstavgift: vänta på webhooken och lås upp.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const responseId = params.get('response_id')
    if (params.get('won_canceled') === 'true') {
      navigate(location.pathname, { replace: true })
      toast.info(t('Betalningen avbröts.'), {
        description: t('Kontaktuppgifterna låses upp när vinstavgiften är betald.'),
      })
      return
    }
    if (params.get('won_paid') !== 'true' || !responseId) return
    navigate(location.pathname, { replace: true })

    const poll = async () => {
      const toastId = toast.loading(t('Väntar på bekräftelse från Stripe…'))
      const started = Date.now()
      while (Date.now() - started < 15000) {
        const { data } = await supabase
          .from('workshop_responses')
          .select('id, paid')
          .eq('id', responseId)
          .eq('workshop_id', workshop.id)
          .maybeSingle()
        if (data?.paid) {
          toast.success(t('Betalningen är klar – kontaktuppgifterna är upplåsta! ✅'), { id: toastId })
          await load()
          await revealContact(responseId)
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
      toast.warning(t('Betalningen registrerades men har inte bekräftats ännu.'), {
        id: toastId,
        description: t('Kontaktuppgifterna låses upp automatiskt så snart Stripe bekräftar.'),
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
      toast.error(t('Kunde inte starta betalningen.'), {
        description: String(data?.error || error?.message || t('Försök igen om en stund.')),
      })
      return
    }
    if (data?.url) {
      toast.success(t('Öppnar Stripe-checkout…'))
      window.location.assign(data.url)
    }
  }

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Stat icon={<Send className="h-5 w-5" />} label={t('Skickade offerter')} value={stats.sent} />
          <Stat icon={<Trophy className="h-5 w-5" />} label={t('Vunna ärenden')} value={stats.won} />
          <Stat icon={<Receipt className="h-5 w-5" />} label={t('Betalat totalt')} value={`${stats.paidTotal.toLocaleString('sv-SE')} kr`} link="/dashboard/verkstad/betalningar" />
          <Stat icon={<Gift className="h-5 w-5" />} label={t('Gratis-leads kvar')} value={workshop.free_leads_remaining || 0} />
        </div>
      )}

      {!loading && wonResponses.length > 0 && (
        <div className="sticker rounded-3xl bg-card p-6 mb-6 border-2 border-[hsl(var(--brand-mint))]">
          <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[hsl(var(--brand-mint))]" /> {t('Vunna ärenden')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{t('Kunden har valt er! Lås upp kontaktuppgifterna och hör av er snabbt.')}</p>
          <div className="space-y-4">
            {wonResponses.map((row) => {
              const contact = contacts[row.id]
              return (
                <div key={row.id} className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium flex flex-wrap items-center gap-2">
                        {priceLabel(row)}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.paid ? 'bg-[hsl(var(--brand-mint)/0.15)] text-[hsl(var(--brand-mint))]' : 'bg-amber-100 text-amber-800'}`}>
                          {row.paid ? t('Aktiverat') : t('Väntar på betalning/aktivering')}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString('sv-SE')}
                        {row.estimated_time ? ` · ${row.estimated_time}` : ''}
                        {row.paid && row.used_free_lead ? ` · ${t('reglerad med gratis-lead')}` : ''}
                      </p>
                    </div>

                    {row.paid ? (
                      contact ? null : (
                        <Button size="sm" variant="outline" onClick={() => revealContact(row.id)} disabled={revealingId === row.id}>
                          {revealingId === row.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <User className="h-4 w-4 mr-2" />}
                          {t('Visa kontaktuppgifter')}
                        </Button>
                      )
                    ) : (
                      <Button size="sm" onClick={() => payWinnerFee(row.id)} disabled={payingId === row.id}>
                        {payingId === row.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                        {t('Betala {price} kr – lås upp kontakten', { price: LEAD_FEE_KR })}
                      </Button>
                    )}
                  </div>
                  {!row.paid && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                      {t('Kunden väntar på att ni hör av er. Vinstavgiften {price} kr exkl. moms låser upp namn, mejl och telefon.', { price: LEAD_FEE_KR })}
                    </p>
                  )}
                  {contact && (
                    <div className="mt-3 rounded-xl bg-background border p-4 space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {contact.customer_name}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="rounded-full">
                          <a href={`mailto:${contact.customer_email}`}><Mail className="h-4 w-4 mr-1.5" /> {contact.customer_email}</a>
                        </Button>
                        {contact.customer_phone && (
                          <Button asChild size="sm" variant="outline" className="rounded-full">
                            <a href={`tel:${contact.customer_phone}`}><Phone className="h-4 w-4 mr-1.5" /> {contact.customer_phone}</a>
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        {contact.bike_type} · {contact.repair_category}
                        {contact.area ? ` · ${contact.area}` : ''}
                        {contact.postcode ? ` · ${contact.postcode}` : ''}
                        {contact.urgency ? ` · ${contact.urgency}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{contact.description}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
              ? t('Först till kvarn gäller – max tre verkstäder hinner svara per ärende. Det kostar inget att svara.')
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
          <li>{t('Skriv pris, beräknad tid och ett tydligt meddelande – det kostar inget att svara.')}</li>
          <li>{t('Kunden väljer sin favorit. Vinner du betalar du {price} kr exkl. moms, eller så dras ett gratis-lead.', { price: LEAD_FEE_KR })}</li>
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
