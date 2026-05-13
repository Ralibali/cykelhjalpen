import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { CreditCard, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StripeEvent {
  id: string
  stripe_event_id: string
  event_type: string
  amount_sek: number | null
  credits_added: number | null
  plan: string | null
  supplier_id: string | null
  created_at: string | null
}

const AdminStripeLog = () => {
  const [events, setEvents] = useState<StripeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [supplierNames, setSupplierNames] = useState<Map<string, string>>(new Map())

  const fetchEvents = async () => {
    setLoading(true)
    const { data } = await supabase.from('stripe_events').select('*').order('created_at', { ascending: false }).limit(100)
    if (data) {
      setEvents(data)
      // Fetch supplier names
      const ids = [...new Set(data.filter(e => e.supplier_id).map(e => e.supplier_id!))]
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, company_name').in('id', ids)
        if (profiles) {
          const map = new Map<string, string>()
          profiles.forEach(p => map.set(p.id, p.company_name || p.full_name || 'Okänd'))
          setSupplierNames(map)
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchEvents() }, [])

  const eventLabel = (type: string) => {
    if (type.includes('completed')) return 'Betalning genomförd'
    if (type.includes('created')) return 'Skapad'
    if (type.includes('updated')) return 'Uppdaterad'
    if (type.includes('deleted') || type.includes('canceled')) return 'Avbruten'
    return type
  }

  const eventColor = (type: string) => {
    if (type.includes('completed')) return 'bg-emerald-50 text-emerald-700'
    if (type.includes('canceled') || type.includes('deleted')) return 'bg-red-50 text-red-700'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Stripe-händelser</h1>
        <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />Uppdatera
        </Button>
      </div>

      {loading && events.length === 0 ? (
        <p className="text-muted-foreground">Laddar...</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground">Inga Stripe-händelser ännu.</p>
      ) : (
        <div className="space-y-2">
          {events.map(e => (
            <div key={e.id} className="bg-card rounded-xl border p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5', eventColor(e.event_type))}>
                    {eventLabel(e.event_type)}
                  </span>
                  {e.plan && <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-violet-50 text-violet-700">{e.plan}</span>}
                </div>
                <p className="text-sm font-medium mt-1">
                  {e.supplier_id ? supplierNames.get(e.supplier_id) || e.supplier_id.slice(0, 8) : 'Okänd leverantör'}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">{e.stripe_event_id}</p>
              </div>
              <div className="text-right shrink-0">
                {e.amount_sek != null && (
                  <p className="text-sm font-bold">{(e.amount_sek / 100).toLocaleString('sv-SE')} kr</p>
                )}
                {e.credits_added != null && e.credits_added > 0 && (
                  <p className="text-xs text-muted-foreground">+{e.credits_added} credits</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {e.created_at ? new Date(e.created_at).toLocaleString('sv-SE') : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminStripeLog
