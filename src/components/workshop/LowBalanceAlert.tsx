import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { AlertTriangle, X, ShoppingCart } from 'lucide-react'
import { BuyLeadsButton } from './BuyLeadsButton'
import { useT } from '@/lib/i18n'

export function LowBalanceAlert() {
  const t = useT()
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [wasShown, setWasShown] = useState(false)

  const { data: workshop } = useQuery({
    queryKey: ['workshop-alert', user?.id],
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

  // Visa alerten en gång per session när saldot är 1 eller 0
  useEffect(() => {
    if (workshop && workshop.free_leads_remaining <= 1 && workshop.free_leads_remaining > 0 && !wasShown) {
      setWasShown(true)
    }
  }, [workshop?.free_leads_remaining, wasShown])

  if (!workshop || dismissed) return null
  if (workshop.free_leads_remaining > 1) return null
  if (!workshop.approved) return null

  const isLastLead = workshop.free_leads_remaining === 1
  const isEmpty = workshop.free_leads_remaining === 0

  if (isEmpty) {
    // Detta hanteras av FreeLeadsBanner istället, men vi kan visa en toast-notis
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900">
                {isLastLead ? t('Sista gratis leadet!') : t('Få leads kvar')}
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                {t('Du har bara')} <strong>{t('{n} lead', { n: workshop.free_leads_remaining })}</strong> {t('kvar. Köp credits nu så du inte missar några förfrågningar.')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <BuyLeadsButton quantity={5} />
                <BuyLeadsButton quantity={10} variant="outline" />
              </div>
            </div>
          </div>
          <button 
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
