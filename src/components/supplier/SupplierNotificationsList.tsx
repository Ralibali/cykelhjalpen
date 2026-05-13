import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { timeAgo } from '@/lib/dateUtils'
import { toast } from 'sonner'

interface SupplierNotification {
  id: string
  supplier_id: string
  project_id: string | null
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

const SupplierNotificationsList = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<SupplierNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from('supplier_notifications')
        .select('*')
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!error && data) setItems(data as SupplierNotification[])
      setLoading(false)
    }
    load()
  }, [user])

  const markRead = async (id: string) => {
    const { error } = await (supabase as any)
      .from('supplier_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Kunde inte markera som läst.')
      return
    }
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
  }

  const unread = items.filter(i => !i.read_at)

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />
  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-5 text-center">
        <Bell className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Inga notiser ännu. Vi pingar dig när nya matchande uppdrag kommer in.</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Notiser
          {unread.length > 0 && (
            <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5">{unread.length}</span>
          )}
        </h2>
      </div>

      <ul className="space-y-3">
        {items.map(n => {
          const isUnread = !n.read_at
          return (
            <li
              key={n.id}
              className={`rounded-xl border p-3 transition-colors ${isUnread ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {n.project_id && (
                    <Link to={`/dashboard/supplier/uppdrag/${n.project_id}`}>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                        <ExternalLink className="h-3 w-3" /> Öppna
                      </Button>
                    </Link>
                  )}
                  {isUnread && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => markRead(n.id)}>
                      <Check className="h-3 w-3" /> Läst
                    </Button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default SupplierNotificationsList
