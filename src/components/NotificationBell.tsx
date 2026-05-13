import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '@/lib/dateUtils'

interface Notif {
  id: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
  type: string
}

const NotificationBell = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setNotifications(data as Notif[])
    }
    fetch()

    const channel = supabase
      .channel('notif-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notif, ...prev.slice(0, 9)])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const unread = notifications.filter(n => !n.is_read).length

  const markRead = async (id: string, link: string | null) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    if (link) { navigate(link); setOpen(false) }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b font-display font-semibold text-sm">Notiser</div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Inga notiser ännu</p>
          ) : notifications.map(n => (
            <button
              key={n.id}
              onClick={() => markRead(n.id, n.link)}
              className={`w-full text-left p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
            >
              <p className="text-sm font-medium">{n.title}</p>
              {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at || '')}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationBell
