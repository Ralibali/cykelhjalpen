import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'

interface LeadCharge {
  id: string
  created_at: string
  amount: number
  status: string
  stripe_session_id: string | null
  workshops?: { company_name: string } | null
}

const formatMoney = (ore: number) => new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 2,
}).format((ore || 0) / 100)

const AdminBikePayments = () => {
  const [items, setItems] = useState<LeadCharge[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lead_charges')
      .select('id, created_at, amount, status, stripe_session_id, workshops(company_name)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(`Kunde inte läsa betalningar: ${error.message}`)
      setItems([])
    } else {
      setItems((data as LeadCharge[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totals = useMemo(() => {
    const paid = items.filter((item) => item.status === 'paid')
    return {
      amount: paid.reduce((sum, item) => sum + (item.amount || 0), 0),
      count: paid.length,
      pending: items.filter((item) => item.status !== 'paid').length,
    }
  }, [items])

  return (
    <CykelAdminLayout>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Cykelbetalningar</h1>
          <p className="text-sm text-muted-foreground mt-1">Stripe-betalningar för skickade verkstadsofferter.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Uppdatera
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Totalt betalt</p>
          <p className="font-display text-2xl font-bold mt-1">{formatMoney(totals.amount)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Betalda offerter</p>
          <p className="font-display text-2xl font-bold mt-1">{totals.count}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Övriga statusar</p>
          <p className="font-display text-2xl font-bold mt-1">{totals.pending}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Inga betalningar registrerade ännu.</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left p-3">Datum</th>
                <th className="text-left p-3">Verkstad</th>
                <th className="text-left p-3">Belopp</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Stripe-id</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 whitespace-nowrap">{new Date(item.created_at).toLocaleString('sv-SE')}</td>
                  <td className="p-3">{item.workshops?.company_name || '—'}</td>
                  <td className="p-3 font-medium">{formatMoney(item.amount)}</td>
                  <td className="p-3">
                    <span className={`text-xs rounded-full px-2 py-1 font-medium ${item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">
                    {item.stripe_session_id ? item.stripe_session_id.slice(0, 28) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CykelAdminLayout>
  )
}

export default AdminBikePayments
