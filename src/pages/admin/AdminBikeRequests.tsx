import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const AdminBikeRequests = () => {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bike_repair_requests')
      .select('*, workshop_responses(id, paid, workshop_id)')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const remove = async (id: string) => {
    if (!confirm('Ta bort ärendet?')) return
    const { error } = await supabase.from('bike_repair_requests').delete().eq('id', id)
    if (error) toast.error(error.message); else { toast.success('Borttaget'); load() }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Cykelärenden</h1>
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Datum</th>
                <th className="text-left p-3">Kund</th>
                <th className="text-left p-3">Cykel</th>
                <th className="text-left p-3">Problem</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Svar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-3 whitespace-nowrap">{new Date(i.created_at).toLocaleDateString('sv-SE')}</td>
                  <td className="p-3"><div className="font-medium">{i.customer_name}</div><div className="text-xs text-muted-foreground">{i.customer_email}</div></td>
                  <td className="p-3">{i.bike_type}</td>
                  <td className="p-3 max-w-xs truncate">{i.repair_category}</td>
                  <td className="p-3">{i.status}</td>
                  <td className="p-3">{i.workshop_responses?.filter((r: any) => r.paid).length} / {i.workshop_responses?.length || 0}</td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminBikeRequests
