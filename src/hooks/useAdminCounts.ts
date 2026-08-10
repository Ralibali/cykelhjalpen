import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface AdminCounts {
  pendingRequests: number
  pendingWorkshops: number
  unreadMail: number
  failedNotifications: number
  openProspects: number
}

const EMPTY: AdminCounts = {
  pendingRequests: 0,
  pendingWorkshops: 0,
  unreadMail: 0,
  failedNotifications: 0,
  openProspects: 0,
}

/**
 * Räknare som driver badges i adminmenyn. Läser bara antal (head: true),
 * så den är billig och kan pollas var 60:e sekund.
 */
export const useAdminCounts = (pollMs = 60_000) => {
  const [counts, setCounts] = useState<AdminCounts>(EMPTY)

  const refresh = useCallback(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const head = { count: 'exact' as const, head: true }

    const [requests, workshops, mail, notifs, prospects] = await Promise.all([
      supabase.from('bike_repair_requests').select('id', head).eq('admin_status', 'pending_approval'),
      supabase.from('workshops').select('id', head).eq('approved', false),
      supabase.from('inbound_emails').select('id', head).is('read_at', null).is('archived_at', null),
      supabase.from('notification_events').select('id', head).eq('status', 'failed').gte('created_at', sevenDaysAgo),
      supabase.from('workshop_prospects').select('id', head).eq('status', 'new'),
    ])

    setCounts({
      pendingRequests: requests.count || 0,
      pendingWorkshops: workshops.count || 0,
      unreadMail: mail.count || 0,
      failedNotifications: notifs.count || 0,
      openProspects: prospects.count || 0,
    })
  }, [])

  useEffect(() => {
    let active = true
    const run = () => { if (active) refresh() }
    run()
    const id = window.setInterval(run, pollMs)
    const onFocus = () => run()
    window.addEventListener('focus', onFocus)
    return () => {
      active = false
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, pollMs])

  return { counts, refresh }
}
