import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'

interface BikeRequestRow {
  id: string
  view_token: string | null
  created_at: string
  customer_name: string
  customer_email: string
  bike_type: string
  repair_category: string
  status: string
  admin_status: string
  workshop_responses?: { id: string; paid: boolean; workshop_id: string }[]
}

const AdminBikeRequests = () => {
  const [items, setItems] = useState<BikeRequestRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bike_repair_requests')
      .select('id, view_token, created_at, customer_name, customer_email, bike_type, repair_category, status, admin_status, workshop_responses(id, paid, workshop_id)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(`Kunde inte läsa cykelärenden: ${error.message}`)
      setItems([])
    } else {
      setItems((data as BikeRequestRow[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <CykelAdminLayout>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Cykelärenden</h1>
          <p className="text-sm text-muted-foreground mt-1">Alla inskickade förfrågningar och offertstatus.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Uppdatera
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Inga cykelärenden ännu.</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left p-3">Datum</th>
                <th className="text-left p-3">Kund</th>
                <th className="text-left p-3">Cykel</th>
                <th className="text-left p-3">Problem</th>
                <th className="text-left p-3">Granskning</th>
                <th className="text-left p-3">Offerter</th>
                <th className="text-right p-3">Kundvy</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const responses = item.workshop_responses || []
                const paidResponses = responses.filter((response) => response.paid).length
                return (
                  <tr key={item.id} className="border-t align-top">
                    <td className="p-3 whitespace-nowrap">{new Date(item.created_at).toLocaleString('sv-SE')}</td>
                    <td className="p-3">
                      <div className="font-medium">{item.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{item.customer_email}</div>
                    </td>
                    <td className="p-3">{item.bike_type}</td>
                    <td className="p-3 max-w-xs">{item.repair_category}</td>
                    <td className="p-3">
                      <span className={`text-xs rounded-full px-2 py-1 font-medium ${
                        item.admin_status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.admin_status === 'rejected'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.admin_status === 'approved' ? 'Godkänd' : item.admin_status === 'rejected' ? 'Avvisad' : 'Väntar'}
                      </span>
                    </td>
                    <td className="p-3">{paidResponses} betalda / {responses.length} totalt</td>
                    <td className="p-3 text-right">
                      {item.view_token ? (
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/mitt-arende/${item.view_token}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" /> Öppna
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Token saknas</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </CykelAdminLayout>
  )
}

export default AdminBikeRequests
