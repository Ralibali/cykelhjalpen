import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { Bell, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NotificationEvent {
  id: string
  channel: 'in_app' | 'email' | 'sms'
  provider: string | null
  recipient: string
  status: 'pending' | 'sent' | 'skipped' | 'failed' | 'retrying'
  attempts: number
  idempotency_key: string
  error: string | null
  payload: Record<string, unknown>
  last_attempt_at: string | null
  created_at: string
}

type StatusFilter = 'all' | 'failed' | 'pending' | 'sent' | 'skipped' | 'retrying'

const statusStyle: Record<NotificationEvent['status'], string> = {
  sent: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  retrying: 'bg-blue-100 text-blue-800',
  skipped: 'bg-muted text-muted-foreground',
  failed: 'bg-red-100 text-red-800',
}

const AdminNotificationEvents = () => {
  const [events, setEvents] = useState<NotificationEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('failed')
  const [channelFilter, setChannelFilter] = useState<'all' | 'in_app' | 'email' | 'sms'>('all')
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const fetchEvents = async () => {
    setLoading(true)
    let query = supabase
      .from('notification_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter !== 'all') query = query.eq('status', filter)
    if (channelFilter !== 'all') query = query.eq('channel', channelFilter)
    const { data, error } = await query
    if (error) {
      toast.error('Kunde inte läsa notifieringsloggen', { description: error.message })
    } else {
      setEvents((data as unknown as NotificationEvent[]) || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchEvents() }, [filter, channelFilter])

  const failedCount = useMemo(() => events.filter((e) => e.status === 'failed').length, [events])

  const handleRetry = async (eventId: string) => {
    setRetryingId(eventId)
    try {
      const { data, error } = await supabase.functions.invoke('notification-retry', {
        body: { event_id: eventId },
      })
      if (error) throw error
      toast.success('Retry skickad', { description: (data as { skipped?: boolean })?.skipped ? 'Redan skickad tidigare.' : 'Notifieringen försöktes igen.' })
      await fetchEvents()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Okänt fel'
      toast.error('Retry misslyckades', { description: message })
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            <div>
              <h1 className="font-display text-2xl font-bold">Notifieringslogg</h1>
              <p className="text-sm text-muted-foreground">
                Alla in-app-, e-post- och SMS-försök. {failedCount > 0 && (
                  <span className="text-red-700 font-semibold">{failedCount} misslyckade</span>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> Uppdatera
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            {(['failed', 'pending', 'retrying', 'sent', 'skipped', 'all'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold border transition',
                  filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted',
                )}
              >
                {s === 'failed' ? 'Misslyckade' : s === 'pending' ? 'Väntar' : s === 'retrying' ? 'Försöker igen' : s === 'sent' ? 'Skickade' : s === 'skipped' ? 'Överhoppade' : 'Alla'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Kanal:</span>
            {(['all', 'in_app', 'sms', 'email'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannelFilter(c)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold border transition',
                  channelFilter === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted',
                )}
              >
                {c === 'all' ? 'Alla' : c === 'in_app' ? 'In-app' : c === 'sms' ? 'SMS' : 'E-post'}
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-xl overflow-x-auto bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Tid</th>
                <th className="text-left px-3 py-2">Kanal</th>
                <th className="text-left px-3 py-2">Leverantör</th>
                <th className="text-left px-3 py-2">Mottagare</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Försök</th>
                <th className="text-left px-3 py-2">Fel</th>
                <th className="text-right px-3 py-2">Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Läser in…</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Inga händelser matchar filtret.</td></tr>
              ) : events.map((event) => {
                const canRetry = event.status === 'failed' || event.status === 'skipped'
                return (
                  <tr key={event.id} className="border-t align-top">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{new Date(event.created_at).toLocaleString('sv-SE')}</td>
                    <td className="px-3 py-2 text-xs">{event.channel}</td>
                    <td className="px-3 py-2 text-xs">{event.provider || '—'}</td>
                    <td className="px-3 py-2 text-xs font-mono truncate max-w-[180px]" title={event.recipient}>{event.recipient}</td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', statusStyle[event.status])}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{event.attempts}</td>
                    <td className="px-3 py-2 text-xs text-red-700 max-w-[220px] truncate" title={event.error || ''}>{event.error || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canRetry || retryingId === event.id}
                        onClick={() => handleRetry(event.id)}
                        aria-label={`Försök skicka notifiering ${event.id} igen`}
                      >
                        <RotateCcw className={cn('h-3 w-3 mr-1', retryingId === event.id && 'animate-spin')} />
                        Retry
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminNotificationEvents
