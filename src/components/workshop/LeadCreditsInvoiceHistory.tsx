import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Receipt, CheckCircle, XCircle, Clock, ArrowLeft, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface LeadCreditPurchase {
  id: string
  quantity: number
  amount_ore: number
  currency: string
  status: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded'
  created_at: string
  stripe_payment_intent_id: string | null
}

const statusConfig = {
  paid: { icon: CheckCircle, label: 'Betald', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  pending: { icon: Clock, label: 'Väntar', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  expired: { icon: XCircle, label: 'Utgången', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
  failed: { icon: XCircle, label: 'Misslyckad', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  refunded: { icon: Receipt, label: 'Återbetald', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
}

export function LeadCreditsInvoiceHistory() {
  const { user } = useAuth()

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['lead-credit-purchases', user?.id],
    queryFn: async () => {
      const { data: workshop } = await supabase
        .from('workshops')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!workshop) throw new Error('Ingen verkstad hittades')

      const { data, error } = await supabase
        .from('lead_credit_purchases')
        .select('*')
        .eq('workshop_id', workshop.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as LeadCreditPurchase[]
    },
    enabled: !!user?.id,
  })

  const { data: workshop } = useQuery({
    queryKey: ['workshop-balance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workshops')
        .select('free_leads_remaining, company_name')
        .eq('user_id', user?.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const totalSpent = purchases
    ?.filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_ore, 0) ?? 0

  const totalCreditsBought = purchases
    ?.filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.quantity, 0) ?? 0

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link 
        to="/dashboard/verkstad" 
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka till dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Fakturahistorik – Lead-credits</h1>
        <p className="text-gray-600 mt-1">Översikt över alla dina köp av lead-credits</p>
      </div>

      {/* Sammanfattningskort */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Tillgängliga credits</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {workshop?.free_leads_remaining ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Credits köpta totalt</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCreditsBought}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Totalt spenderat</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {(totalSpent / 100).toLocaleString('sv-SE')} kr
          </p>
        </div>
      </div>

      {/* Tabell */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Köphistorik</h2>
        </div>

        {!purchases || purchases.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Inga köp ännu</p>
            <p className="text-sm text-gray-400 mt-1">
              Dina lead-credits-köp kommer visas här när du gjort din första betalning.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {purchases.map((purchase) => {
              const status = statusConfig[purchase.status]
              const StatusIcon = status.icon
              const date = new Date(purchase.created_at)

              return (
                <div 
                  key={purchase.id} 
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${status.bg}`}>
                      <StatusIcon className={`h-5 w-5 ${status.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {purchase.quantity} lead-credits
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(date, 'd MMMM yyyy, HH:mm', { locale: sv })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {(purchase.amount_ore / 100).toLocaleString('sv-SE')} kr
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color} border ${status.border}`}>
                        {status.label}
                      </span>
                    </div>

                    {purchase.status === 'paid' && purchase.stripe_payment_intent_id && (
                      <a
                        href={`https://dashboard.stripe.com/payments/${purchase.stripe_payment_intent_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                        title="Se i Stripe"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info-ruta */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Pris:</strong> 50 kr per lead-credit. Varje credit ger dig rätt att svara på en kundförfrågan. 
          Credits som inte används sparas på ditt konto tillsvidare.
        </p>
      </div>
    </div>
  )
}
