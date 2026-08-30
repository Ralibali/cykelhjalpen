import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Gift, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { formatKrFromOre, useV2Pricing } from '@/lib/v2/pricing'
import { useT } from '@/lib/i18n'

export function FreeLeadsBanner() {
  const t = useT()
  // Canonical pricing (contract §2.1): displayed fee = charged fee.
  const pricing = useV2Pricing()
  const feeKr = formatKrFromOre(pricing.amountOre)
  const { user } = useAuth()

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workshops')
        .select('free_leads_remaining, approved')
        .eq('user_id', user?.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  if (!workshop || workshop.free_leads_remaining <= 0) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-5 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <Gift className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">
              {workshop.free_leads_remaining === 1
                ? t('{n} gratis lead kvar', { n: workshop.free_leads_remaining })
                : t('{n} gratis leads kvar', { n: workshop.free_leads_remaining })}
            </h3>
            <p className="mt-0.5 text-sm text-green-700">
              {t('Det kostar inget att svara. När kunden väljer er dras ett gratis-lead automatiskt – utan gratis-leads kostar vinsten {fee} kr exkl. moms.', { fee: feeKr })}
            </p>
            {!workshop.approved && (
              <p className="mt-1.5 text-xs text-amber-700 bg-amber-100 inline-block px-2 py-0.5 rounded">
                {t('Väntar på godkännande från admin innan du kan börja svara')}
              </p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-3xl font-bold text-green-600">
            {workshop.free_leads_remaining}
          </span>
          <span className="text-sm text-green-500">/2</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full rounded-full bg-green-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${(workshop.free_leads_remaining / 2) * 100}%` }}
        />
      </div>

      {/* Decorative corner icon */}
      <Zap className="absolute -right-2 -top-2 h-16 w-16 text-green-100/50 rotate-12" />
    </div>
  )
}
