import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const WorkshopSettings = () => {
  const { workshop }: any = useOutletContext()
  const [form, setForm] = useState<any>(workshop)
  useEffect(() => { setForm(workshop) }, [workshop])

  const save = async () => {
    const { error } = await supabase
      .from('workshops')
      .update({
        company_name: form.company_name,
        phone: form.phone,
        address: form.address,
        website: form.website,
        sms_notifications: !!form.sms_notifications,
      })
      .eq('id', workshop.id)
    if (error) toast.error(error.message); else toast.success('Sparat')
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Inställningar</h1>
      <div className="sticker bg-card p-6 space-y-4 max-w-lg">
        <div><Label>Verkstadens namn</Label><Input value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
        <div><Label>Telefon</Label><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Adress</Label><Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div><Label>Webbplats</Label><Input value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>

        <div className="flex items-start justify-between gap-4 pt-2 border-t">
          <div>
            <Label htmlFor="sms_notifications" className="cursor-pointer">SMS vid nytt ärende</Label>
            <p className="text-xs text-muted-foreground mt-1">Kräver att telefonnummer är ifyllt.</p>
          </div>
          <Switch
            id="sms_notifications"
            checked={!!form.sms_notifications}
            onCheckedChange={(v) => setForm({ ...form, sms_notifications: v })}
          />
        </div>

        <Button onClick={save}>Spara</Button>
      </div>
    </div>
  )
}

export default WorkshopSettings
