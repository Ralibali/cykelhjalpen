import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from 'lucide-react'

const AdminBikePayments = () => {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('lead_charges')
      .select('*, workshops(company_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [])

  const total = items.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0) / 100

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Betalningar (cykel)</h1>
      <p className="text-muted-foreground mb-6">Totalt inbetalat: <strong>{total} kr</strong></p>
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Datum</th>
                <th className="text-left p-3">Verkstad</th>
                <th className="text-left p-3">Belopp</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Stripe-id</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-3">{new Date(i.created_at).toLocaleString('sv-SE')}</td>
                  <td className="p-3">{i.workshops?.company_name || '—'}</td>
                  <td className="p-3">{(i.amount / 100).toFixed(0)} kr</td>
                  <td className="p-3">{i.status}</td>
                  <td className="p-3 text-xs text-muted-foreground">{i.stripe_session_id?.slice(0, 24)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminBikePayments
