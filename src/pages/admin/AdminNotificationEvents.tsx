import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { Bell, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'

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
  const t = useT()
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
      toast.error(t('Kunde inte läsa notifieringsloggen'), { description: error.message })
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
      toast.success(t('Retry skickad'), { description: (data as { skipped?: boolean })?.skipped ? t('Redan skickad tidigare.') : t('Notifieringen försöktes igen.') })
      await fetchEvents()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Okänt fel')
      toast.error(t('Retry misslyckades'), { description: message })
    } finally {
      setRetryingId(null)
    }
  }

  const filterLabel = (s: StatusFilter) => s === 'failed' ? t('Misslyckade') : s === 'pending' ? t('Väntar') : s === 'retrying' ? t('Försöker igen') : s === 'sent' ? t('Skickade') : s === 'skipped' ? t('Överhoppade') : t('Alla')
  const channelLabel = (c: 'all' | 'in_app' | 'sms' | 'email') => c === 'all' ? t('Alla') : c === 'in_app' ? t('In-app') : c === 'sms' ? t('SMS') : t('E-post')

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            <div>
              <h1 className="font-display text-2xl font-bold">{t('Notifieringslogg')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('Alla in-app-, e-post- och SMS-försök.')} {failedCount > 0 && (
                  <span className="text-red-700 font-semibold">{t('{count} misslyckade', { count: failedCount })}</span>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> {t('Uppdatera')}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('Status:')}</span>
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
                {filterLabel(s)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('Kanal:')}</span>
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
                {channelLabel(c)}
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-xl overflow-x-auto bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">{t('Tid')}</th>
                <th className="text-left px-3 py-2">{t('Kanal')}</th>
                <th className="text-left px-3 py-2">{t('Leverantör')}</th>
                <th className="text-left px-3 py-2">{t('Mottagare')}</th>
                <th className="text-left px-3 py-2">{t('Status')}</th>
                <th className="text-left px-3 py-2">{t('Försök')}</th>
                <th className="text-left px-3 py-2">{t('Fel')}</th>
                <th className="text-right px-3 py-2">{t('Åtgärd')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">{t('Läser in…')}</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">{t('Inga händelser matchar filtret.')}</td></tr>
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
                        aria-label={t('Försök skicka notifiering {id} igen', { id: event.id })}
                      >
                        <RotateCcw className={cn('h-3 w-3 mr-1', retryingId === event.id && 'animate-spin')} />
                        {t('Retry')}
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
