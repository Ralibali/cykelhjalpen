import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Send } from 'lucide-react'

const AdminNotifications = () => {
  const [target, setTarget] = useState<'all' | 'suppliers' | 'buyers' | 'single'>('all')
  const [singleEmail, setSingleEmail] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!title.trim()) { toast.error('Ange en titel'); return }
    setSending(true)

    let userIds: string[] = []

    if (target === 'single') {
      const { data } = await supabase.from('profiles').select('id').eq('email', singleEmail).limit(1)
      if (!data?.length) { toast.error('Ingen användare hittades med den e-posten'); setSending(false); return }
      userIds = [data[0].id]
    } else {
      let query = supabase.from('profiles').select('id')
      if (target === 'suppliers') query = query.eq('role', 'supplier')
      if (target === 'buyers') query = query.eq('role', 'buyer')
      const { data } = await query.limit(1000)
      userIds = data?.map(u => u.id) || []
    }

    if (!userIds.length) { toast.error('Inga mottagare hittades'); setSending(false); return }

    const notifications = userIds.map(uid => ({
      user_id: uid,
      type: 'admin_message',
      title: title.trim(),
      message: message.trim() || null,
      link: link.trim() || null,
    }))

    const { error } = await supabase.from('notifications').insert(notifications)
    setSending(false)

    if (error) toast.error('Kunde inte skicka: ' + error.message)
    else {
      toast.success(`Notifikation skickad till ${userIds.length} användare!`)
      setTitle('')
      setMessage('')
      setLink('')
    }
  }

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Skicka notifikation</h1>

      <div className="max-w-lg bg-card rounded-xl border p-6 space-y-4">
        <div>
          <Label>Mottagare</Label>
          <Select value={target} onValueChange={(v: any) => setTarget(v)}>
            <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla användare</SelectItem>
              <SelectItem value="suppliers">Alla byråer</SelectItem>
              <SelectItem value="buyers">Alla beställare</SelectItem>
              <SelectItem value="single">En specifik användare</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {target === 'single' && (
          <div>
            <Label>E-post</Label>
            <Input value={singleEmail} onChange={e => setSingleEmail(e.target.value)} placeholder="namn@foretag.se" className="rounded-xl mt-1" />
          </div>
        )}

        <div>
          <Label>Titel *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notifikationstitel" className="rounded-xl mt-1" />
        </div>

        <div>
          <Label>Meddelande</Label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Valfritt meddelande..." className="rounded-xl mt-1" rows={3} />
        </div>

        <div>
          <Label>Länk (valfritt)</Label>
          <Input value={link} onChange={e => setLink(e.target.value)} placeholder="/priser" className="rounded-xl mt-1" />
        </div>

        <Button onClick={handleSend} disabled={sending} className="w-full rounded-xl">
          <Send className="h-4 w-4 mr-2" /> {sending ? 'Skickar...' : 'Skicka notifikation'}
        </Button>
      </div>
    </AdminLayout>
  )
}

export default AdminNotifications
