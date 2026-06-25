import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Receipt } from 'lucide-react'
import type { WorkshopContext } from '@/components/cykelhjalpen/WorkshopLayout'

interface ChargeRow {
  id: string
  created_at: string
  amount: number
  status: string
  stripe_session_id: string | null
}

const statusLabel: Record<string, string> = {
  paid: 'Betald',
  pending: 'Väntar',
  free_lead: 'Gratis-lead',
  expired: 'Utgången',
}

const WorkshopBilling = () => {
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
    paid: charges.filter((charge) => charge.status === 'paid').reduce((sum, charge) => sum + charge.amount, 0) / 100,
    paidCount: charges.filter((charge) => charge.status === 'paid').length,
    freeCount: charges.filter((charge) => charge.status === 'free_lead').length,
  }), [charges])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Betalningar</h1>
        <p className="text-sm text-muted-foreground mt-1">Historik för skickade offerter från {workshop.company_name}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="sticker bg-card p-4"><p className="text-xs text-muted-foreground">Totalt betalt</p><p className="font-display text-2xl font-bold mt-1">{totals.paid.toLocaleString('sv-SE')} kr</p></div>
        <div className="sticker bg-card p-4"><p className="text-xs text-muted-foreground">Betalda offerter</p><p className="font-display text-2xl font-bold mt-1">{totals.paidCount}</p></div>
        <div className="sticker bg-card p-4"><p className="text-xs text-muted-foreground">Gratis-leads</p><p className="font-display text-2xl font-bold mt-1">{totals.freeCount}</p></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : charges.length === 0 ? (
        <div className="sticker bg-card p-8 text-center text-muted-foreground"><Receipt className="h-8 w-8 mx-auto mb-3 opacity-50" />Inga betalningar ännu.</div>
      ) : (
        <div className="sticker bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3">Datum</th>
                <th className="text-left p-3">Belopp</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Stripe-id</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => (
                <tr key={charge.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{new Date(charge.created_at).toLocaleString('sv-SE')}</td>
                  <td className="p-3 font-medium">{charge.amount === 0 ? '0 kr' : `${(charge.amount / 100).toLocaleString('sv-SE')} kr`}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${charge.status === 'paid' ? 'bg-green-100 text-green-700' : charge.status === 'free_lead' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {statusLabel[charge.status] || charge.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{charge.stripe_session_id ? `${charge.stripe_session_id.slice(0, 20)}…` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default WorkshopBilling
