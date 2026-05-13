import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

const WorkshopBilling = () => {
  const { workshop }: any = useOutletContext()
  const [charges, setCharges] = useState<any[]>([])

  useEffect(() => {
    if (!workshop?.id) return
    supabase
      .from('lead_charges')
      .select('*')
      .eq('workshop_id', workshop.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setCharges(data || []))
  }, [workshop])

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Betalningar</h1>
      <div className="sticker bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3">Datum</th>
              <th className="text-left p-3">Belopp</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Stripe-id</th>
            </tr>
          </thead>
          <tbody>
            {charges.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Inga betalningar ännu</td></tr>
            ) : charges.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3">{new Date(c.created_at).toLocaleDateString('sv-SE')}</td>
                <td className="p-3">{(c.amount / 100).toFixed(0)} kr</td>
                <td className="p-3"><span className={c.status === 'paid' ? 'text-green-600' : 'text-muted-foreground'}>{c.status}</span></td>
                <td className="p-3 text-xs text-muted-foreground">{c.stripe_session_id?.slice(0, 16)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WorkshopBilling
