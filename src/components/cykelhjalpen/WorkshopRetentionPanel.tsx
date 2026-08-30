// V2 (S8): retention-yta på verkstadens inställningssida.
//  - Profilkompletthets-indikator (kopplad till värdet av den publika profilen)
//  - Opt-out per retention-cadence (v2_workshop_notification_prefs, RLS-ägd rad)
// Consent/config-aware: preferenserna gäller bara när cadencens flagga är på
// (alla default OFF); unsubscribe-token i v2_retention_contacts vinner alltid.

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useT } from '@/lib/i18n'
import {
  DEFAULT_NOTIFICATION_PREFS,
  computeProfileCompleteness,
  type ProfileCompleteness,
  type WorkshopNotificationPrefs,
} from '@/lib/v2/retention'

interface Props {
  workshopId: string
}

const PREF_ITEMS: Array<{ key: keyof WorkshopNotificationPrefs; label: string; hint: string }> = [
  { key: 'digest_enabled', label: 'Veckosammanfattning', hint: 'Nya ärenden i ert område, en gång i veckan.' },
  { key: 'seasonal_enabled', label: 'Säsongspåminnelser', hint: 'Till exempel inför cykelvåren.' },
  { key: 'performance_enabled', label: 'Månadsstatistik', hint: 'Era offerter, vunna jobb och omdömen.' },
  { key: 'profile_nudge_enabled', label: 'Profiltips', hint: 'Påminnelser när er profil kan bli bättre.' },
  { key: 'review_notifications_enabled', label: 'Recensionsnotiser', hint: 'Mejl när en kund recenserar er eller bekräftar ett jobb.' },
]

// Genererade typer (S13) känner ännu inte V2-tabellerna — samma mönster som
// src/lib/v2/flags.ts: otypad vy av klienten.
const db = supabase as unknown as SupabaseClient<any, 'public', any>

const WorkshopRetentionPanel = ({ workshopId }: Props) => {
  const t = useT()
  const [prefs, setPrefs] = useState<WorkshopNotificationPrefs>(DEFAULT_NOTIFICATION_PREFS)
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: prefRow }, { data: workshopRow }] = await Promise.all([
        db
          .from('v2_workshop_notification_prefs')
          .select('digest_enabled, seasonal_enabled, performance_enabled, profile_nudge_enabled, review_notifications_enabled, sms_enabled')
          .eq('workshop_id', workshopId)
          .maybeSingle(),
        db
          .from('workshops')
          .select('bio_short, description, logo_url, areas_served, services, website')
          .eq('id', workshopId)
          .maybeSingle(),
      ])
      if (prefRow) setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...(prefRow as WorkshopNotificationPrefs) })
      if (workshopRow) setCompleteness(computeProfileCompleteness(workshopRow))
      setLoading(false)
    }
    setLoading(true)
    load()
  }, [workshopId])

  const updatePref = async (key: keyof WorkshopNotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSavingKey(key)
    const { error } = await db
      .from('v2_workshop_notification_prefs')
      .upsert({ workshop_id: workshopId, ...next }, { onConflict: 'workshop_id' })
    setSavingKey(null)
    if (error) {
      setPrefs(prefs)
      toast.error(t('Kunde inte spara notisinställningen.'))
    }
  }

  return (
    <div className="sticker rounded-3xl bg-card p-6 space-y-6 max-w-xl mt-6">
      <div>
        <h2 className="font-display text-xl font-bold">{t('Er profil styr synligheten')}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t('En komplett profil syns i den offentliga verkstadskatalogen och gör att kunder väljer er oftare.')}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('Laddar…')}
        </div>
      ) : (
        <>
          {completeness && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('Profilkompletthet')}</span>
                <span className="text-sm text-muted-foreground">{completeness.percent} %</span>
              </div>
              <Progress value={completeness.percent} />
              {completeness.missing.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t('Saknas: {items}', { items: completeness.missing.map((item) => t(item)).join(', ') })}
                </p>
              )}
            </div>
          )}

          <div className="pt-4 border-t space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold">{t('Mejl och påminnelser')}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t('Välj vilka mejl ni vill få. Mejl om pågående ärenden och betalningar skickas alltid.')}
              </p>
            </div>
            {PREF_ITEMS.map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor={`pref-${item.key}`} className="cursor-pointer">{t(item.label)}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{t(item.hint)}</p>
                </div>
                <Switch
                  id={`pref-${item.key}`}
                  checked={prefs[item.key]}
                  disabled={savingKey === item.key}
                  onCheckedChange={(value) => updatePref(item.key, value)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default WorkshopRetentionPanel
