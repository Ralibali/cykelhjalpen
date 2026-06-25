import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, Check, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'

const AdminWorkshops = () => {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('workshops').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const setApproved = async (id: string, approved: boolean) => {
    const { error } = await supabase.from('workshops').update({ approved }).eq('id', id)
    if (error) toast.error(error.message); else { toast.success(approved ? 'Godkänd' : 'Avaktiverad'); load() }
  }

  const remove = async (id: string) => {
    if (!confirm('Ta bort verkstaden?')) return
    const { error } = await supabase.from('workshops').delete().eq('id', id)
    if (error) toast.error(error.message); else { toast.success('Borttaget'); load() }
  }

  return (
    <CykelAdminLayout><div>
      <h1 className="text-2xl font-bold mb-6">Verkstäder</h1>
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Företag</th>
                <th className="text-left p-3">E-post</th>
                <th className="text-left p-3">Telefon</th>
                <th className="text-left p-3">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="p-3 font-medium">{w.company_name}</td>
                  <td className="p-3">{w.email}</td>
                  <td className="p-3">{w.phone}</td>
                  <td className="p-3">{w.approved ? <span className="text-green-600">Godkänd</span> : <span className="text-amber-600">Väntar</span>}</td>
                  <td className="p-3 flex gap-1">
                    {w.approved
                      ? <Button size="sm" variant="outline" onClick={() => setApproved(w.id, false)}><X className="h-4 w-4" /></Button>
                      : <Button size="sm" onClick={() => setApproved(w.id, true)}><Check className="h-4 w-4" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => remove(w.id)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div></CykelAdminLayout>
  )
}

export default AdminWorkshops
