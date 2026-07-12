import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Check, ExternalLink, Loader2, RefreshCw, X } from 'lucide-react'
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
  description: string
  city: string
  status: string
  admin_status: string
  workshop_responses?: { id: string; paid: boolean; workshop_id: string }[]
}

const AdminBikeRequests = () => {
  const [items, setItems] = useState<BikeRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bike_repair_requests')
      .select('id, view_token, created_at, customer_name, customer_email, bike_type, repair_category, description, city, status, admin_status, workshop_responses(id, paid, workshop_id)')
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

  const review = async (item: BikeRequestRow, nextStatus: 'approved' | 'rejected') => {
    setBusy(item.id)
    const { error } = await supabase
      .from('bike_repair_requests')
      .update({
        admin_status: nextStatus,
        approved_at: nextStatus === 'approved' ? new Date().toISOString() : null,
        rejected_reason: nextStatus === 'rejected' ? 'Avvisat av administratör' : null,
      })
      .eq('id', item.id)
    setBusy(null)

    if (error) {
      toast.error(`Kunde inte uppdatera ärendet: ${error.message}`)
      return
    }

    toast.success(nextStatus === 'approved' ? 'Ärendet är godkänt och synligt för lokala verkstäder.' : 'Ärendet är avvisat.')
    load()
  }

  return (
    <CykelAdminLayout>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Cykelärenden</h1>
          <p className="text-sm text-muted-foreground mt-1">Granska förfrågningar innan de blir synliga för verkstäder.</p>
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
          <table className="w-full text-sm min-w-[1050px]">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left p-3">Datum</th>
                <th className="text-left p-3">Kund</th>
                <th className="text-left p-3">Ärende</th>
                <th className="text-left p-3">Stad</th>
                <th className="text-left p-3">Granskning</th>
                <th className="text-left p-3">Offerter</th>
                <th className="text-right p-3">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const responses = item.workshop_responses || []
                const paidResponses = responses.filter((response) => response.paid).length
                const isBusy = busy === item.id
                return (
                  <tr key={item.id} className="border-t align-top">
                    <td className="p-3 whitespace-nowrap">{new Date(item.created_at).toLocaleString('sv-SE')}</td>
                    <td className="p-3">
                      <div className="font-medium">{item.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{item.customer_email}</div>
                    </td>
                    <td className="p-3 max-w-sm">
                      <div className="font-medium">{item.bike_type} · {item.repair_category}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.description}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">{item.city}</td>
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
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {item.view_token && (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/mitt-arende/${item.view_token}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">Öppna kundvy</span>
                            </Link>
                          </Button>
                        )}
                        {item.admin_status !== 'approved' && (
                          <Button size="sm" onClick={() => review(item, 'approved')} disabled={isBusy}>
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                            Godkänn
                          </Button>
                        )}
                        {item.admin_status !== 'rejected' && (
                          <Button size="sm" variant="outline" onClick={() => review(item, 'rejected')} disabled={isBusy}>
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                            Avvisa
                          </Button>
                        )}
                      </div>
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
