import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Receipt, Sparkles } from 'lucide-react'
import type { WorkshopContext } from '@/components/cykelhjalpen/WorkshopLayout'
import { BuyLeadsButton } from '@/components/workshop/BuyLeadsButton'
import { LeadCreditsInvoiceHistory } from '@/components/workshop/LeadCreditsInvoiceHistory'
import { LEAD_FEE_KR } from '@/lib/pricing'
import { useT } from '@/lib/i18n'

interface ChargeRow {
  id: string
  created_at: string
  amount: number
  status: string
  stripe_session_id: string | null
}

const STATUS_LABEL_SOURCE: Record<string, string> = {
  paid: 'Betald',
  pending: 'Väntar',
  free_lead: 'Gratis-lead',
  expired: 'Utgången',
  refunded: 'Återbetald',
}

const WorkshopBilling = () => {
  const t = useT()
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>()
  const [charges, setCharges] = useState<ChargeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('lead_charges')
        .select('id, created_at, amount, status, stripe_session_id')
        .eq('workshop_id', workshop.id)
        .order('created_at', { ascending: false })
      setCharges((data as ChargeRow[]) || [])
      setLoading(false)
    }
    load()
  }, [workshop.id])

  const totals = useMemo(() => ({
    paidExVat: charges.filter((charge) => charge.status === 'paid').reduce((sum, charge) => sum + charge.amount, 0) / 100,
    paidCount: charges.filter((charge) => charge.status === 'paid').length,
    freeCount: charges.filter((charge) => charge.status === 'free_lead').length,
  }), [charges])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">{t('Betalningar')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('Historik för skickade offerter från {name}. Beloppen visas exklusive moms.', { name: workshop.company_name })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="sticker rounded-3xl bg-card p-4"><p className="text-xs text-muted-foreground">{t('Debiterat exkl. moms')}</p><p className="font-display text-2xl font-bold mt-1">{totals.paidExVat.toLocaleString('sv-SE')} kr</p></div>
        <div className="sticker rounded-3xl bg-card p-4"><p className="text-xs text-muted-foreground">{t('Betalda offerter')}</p><p className="font-display text-2xl font-bold mt-1">{totals.paidCount}</p></div>
        <div className="sticker rounded-3xl bg-card p-4"><p className="text-xs text-muted-foreground">{t('Gratis-leads')}</p><p className="font-display text-2xl font-bold mt-1">{totals.freeCount}</p></div>
      </div>

      <div className="sticker rounded-3xl bg-card p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-xl mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> {t('Lead credits')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('Förköp leads och svara snabbare – {price} kr exkl. moms per credit. Krediter dras automatiskt först när kunden väljer dig som vinnare.', { price: LEAD_FEE_KR })}
            </p>
          </div>
          <BuyLeadsPicker defaultQuantity={5} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : charges.length === 0 ? (
        <div className="sticker rounded-3xl bg-card p-8 text-center text-muted-foreground"><Receipt className="h-8 w-8 mx-auto mb-3 opacity-50" />{t('Inga betalningar ännu.')}</div>
      ) : (
        <div className="sticker rounded-3xl bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3">{t('Datum')}</th>
                <th className="text-left p-3">{t('Belopp exkl. moms')}</th>
                <th className="text-left p-3">{t('Status')}</th>
                <th className="text-left p-3">{t('Stripe-id')}</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => (
                <tr key={charge.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{new Date(charge.created_at).toLocaleString('sv-SE')}</td>
                  <td className="p-3 font-medium">{charge.amount === 0 ? '0 kr' : `${(charge.amount / 100).toLocaleString('sv-SE')} kr`}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${charge.status === 'paid' ? 'bg-green-100 text-green-700' : charge.status === 'free_lead' ? 'bg-primary/10 text-primary' : charge.status === 'refunded' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                      {t(STATUS_LABEL_SOURCE[charge.status]) || charge.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{charge.stripe_session_id ? `${charge.stripe_session_id.slice(0, 20)}…` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-display text-xl mb-3">{t('Fakturor för lead credits')}</h2>
        <LeadCreditsInvoiceHistory />
      </div>
    </div>
  )
}

export default WorkshopBilling
