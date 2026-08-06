import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Receipt, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { sv, enUS } from 'date-fns/locale'
import { useT, useLanguage } from '@/lib/i18n'

interface LeadCreditPurchase {
  id: string
  quantity: number
  amount_ore: number
  status: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded' | string
  created_at: string | null
  stripe_payment_intent_id: string | null
}

const STATUS_CONFIG_SOURCE: Record<string, { icon: typeof CheckCircle; label: string; color: string; bg: string; border: string }> = {
  paid: { icon: CheckCircle, label: 'Betald', color: 'text-[hsl(var(--brand-mint))]', bg: 'bg-[hsl(var(--brand-mint)/0.12)]', border: 'border-[hsl(var(--brand-mint)/0.3)]' },
  pending: { icon: Clock, label: 'Väntar', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  expired: { icon: Clock, label: 'Utgången', color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200' },
  failed: { icon: XCircle, label: 'Misslyckad', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  refunded: { icon: Receipt, label: 'Återbetald', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
}

export function LeadCreditsInvoiceHistory() {
  const t = useT()
  const { lang: language } = useLanguage()
  const { user } = useAuth()

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['lead-credit-purchases', user?.id],
    queryFn: async () => {
      const { data: workshop } = await supabase
        .from('workshops')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!workshop) throw new Error(t('Ingen verkstad hittades'))

      const { data, error } = await supabase
        .from('lead_credit_purchases')
        .select('id, quantity, amount_ore, status, created_at, stripe_payment_intent_id')
        .eq('workshop_id', workshop.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as LeadCreditPurchase[]
    },
    enabled: !!user?.id,
  })

  const totalSpent = purchases
    ?.filter((purchase) => purchase.status === 'paid')
    .reduce((sum, purchase) => sum + purchase.amount_ore / 100, 0) ?? 0

  const totalCreditsBought = purchases
    ?.filter((purchase) => purchase.status === 'paid')
    .reduce((sum, purchase) => sum + purchase.quantity, 0) ?? 0

  if (isLoading) {
    return (
      <div className="sticker rounded-3xl bg-card p-6 animate-pulse">
        <div className="h-5 bg-muted rounded w-1/3 mb-4" />
        <div className="h-24 bg-muted rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sticker rounded-3xl bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('Credits köpta totalt')}</p>
          <p className="font-display text-2xl mt-1">{totalCreditsBought}</p>
        </div>
        <div className="sticker rounded-3xl bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('Totalt spenderat (exkl. moms)')}</p>
          <p className="font-display text-2xl mt-1">{totalSpent.toLocaleString('sv-SE')} kr</p>
        </div>
        <div className="sticker rounded-3xl bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('Antal köp')}</p>
          <p className="font-display text-2xl mt-1">{purchases?.filter((purchase) => purchase.status === 'paid').length ?? 0}</p>
        </div>
      </div>

      <div className="sticker rounded-3xl bg-card overflow-hidden">
        {!purchases || purchases.length === 0 ? (
          <div className="p-10 text-center">
            <span className="inline-flex items-center justify-center rounded-2xl bg-muted p-4 mb-3">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </span>
            <p className="font-display text-lg mb-1">{t('Inga köp ännu')}</p>
            <p className="text-sm text-muted-foreground">
              {t('Dina lead-credits-köp visas här när du gjort din första betalning.')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {purchases.map((purchase) => {
              const status = STATUS_CONFIG_SOURCE[purchase.status] || STATUS_CONFIG_SOURCE.pending
              const StatusIcon = status.icon
              const date = purchase.created_at ? new Date(purchase.created_at) : null

              return (
                <div key={purchase.id} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center ${status.bg}`}>
                      <StatusIcon className={`h-5 w-5 ${status.color}`} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{t('{n} lead-credits', { n: purchase.quantity })}</p>
                      {date && (
                        <p className="text-sm text-muted-foreground">
                          {format(date, 'd MMMM yyyy, HH:mm', { locale: language === 'en' ? enUS : sv })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-display text-lg">{(purchase.amount_ore / 100).toLocaleString('sv-SE')} kr</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color} border ${status.border}`}>
                        {t(status.label)}
                      </span>
                    </div>
                    {purchase.status === 'paid' && purchase.stripe_payment_intent_id && (
                      <a
                        href={`https://dashboard.stripe.com/payments/${purchase.stripe_payment_intent_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition"
                        title={t('Se i Stripe')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
