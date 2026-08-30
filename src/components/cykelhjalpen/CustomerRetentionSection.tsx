// V2 S8: kundens efterservice-yta på token-sidan (/mitt-arende/:token).
//  - Repeat-CTA ("Boka nästa service" / "Nytt ärende") när ärendet är klart.
//  - Servicehistorik (samma e-post, egna token-länkar) + påminnelse-opt-in.
// Historik och opt-in renderas bara när flaggan v2.retention.lifecycle är på
// (backend skickar då data; annars är listan tom och ytan döljs).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bike, CalendarClock, CheckCircle2, ChevronRight, History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useT } from '@/lib/i18n'
import { isV2FlagOn } from '@/lib/v2/flags'
import {
  RETENTION_LIFECYCLE_FLAG,
  buildRepeatRequestUrl,
  historyStatusLabel,
  type V2RetentionState,
  type V2ServiceHistoryItem,
} from '@/lib/v2/retention'

interface Props {
  token: string
  request: {
    id: string
    status: string
    bike_type: string
    repair_category: string
    city: string
  }
  history: V2ServiceHistoryItem[]
  retention: V2RetentionState | null
}

const CustomerRetentionSection = ({ token, request, history, retention }: Props) => {
  const t = useT()
  const completed = request.status === 'completed'
  const [flagOn, setFlagOn] = useState(false)
  const [optedIn, setOptedIn] = useState<boolean | null>(retention?.reminder_opt_in ?? null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    isV2FlagOn(RETENTION_LIFECYCLE_FLAG).then((on) => { if (alive) setFlagOn(on) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    setOptedIn(retention?.reminder_opt_in ?? null)
  }, [retention?.reminder_opt_in])

  const toggleOptIn = async (next: boolean) => {
    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('v2-customer-preferences', {
        body: { token, action: 'set', reminder_opt_in: next },
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'failed')
      setOptedIn(next)
      toast.success(next
        ? t('Klart! Vi påminner dig när det är dags för service igen.')
        : t('Påminnelser avstängda. Du kan slå på dem igen när du vill.'))
    } catch {
      toast.error(t('Kunde inte spara just nu. Försök igen om en stund.'))
    } finally {
      setSaving(false)
    }
  }

  const nextServiceUrl = buildRepeatRequestUrl({
    city: request.city,
    bikeType: request.bike_type,
    repairCategory: 'Service / genomgång',
  })
  const repeatSameUrl = buildRepeatRequestUrl({
    city: request.city,
    bikeType: request.bike_type,
    repairCategory: request.repair_category,
  })

  return (
    <>
      {completed && (
        <section
          className="sticker rounded-3xl bg-card p-6 md:p-7 mb-8"
          aria-labelledby="repeat-request-heading"
        >
          <h2 id="repeat-request-heading" className="font-display text-lg mb-2">
            {t('Behöver cykeln något mer?')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t('Lägg upp ett nytt ärende på en minut – vi har fyllt i det mesta åt dig. Kostnadsfritt och utan förpliktelser.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="rounded-full shadow-brand font-semibold">
              <Link to={nextServiceUrl}>
                <CalendarClock className="h-4 w-4 mr-1.5" /> {t('Boka nästa service')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-2">
              <Link to={repeatSameUrl}>
                <Bike className="h-4 w-4 mr-1.5" /> {t('Nytt ärende (samma problem)')}
              </Link>
            </Button>
          </div>
        </section>
      )}

      {flagOn && history.length > 0 && (
        <section className="sticker rounded-3xl bg-card p-6 md:p-7 mb-8" aria-labelledby="history-heading">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-primary" />
            <h2 id="history-heading" className="font-display text-lg">{t('Dina tidigare ärenden')}</h2>
          </div>
          <ul className="divide-y divide-border">
            {history.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/mitt-arende/${item.view_token}`}
                  className="flex items-center gap-3 py-3 group"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium group-hover:underline truncate">
                      {item.repair_category} · {item.bike_type}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {item.city} · {new Date(item.created_at).toLocaleDateString('sv-SE')}
                      {item.outcome?.final_price_sek != null && ` · ${item.outcome.final_price_sek} kr`}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    {(item.outcome?.state === 'completed' || item.outcome?.state === 'confirmed_by_customer') && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--brand-mint))]" />
                    )}
                    {historyStatusLabel(item, t)}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {flagOn && retention && (
        <section className="sticker rounded-3xl bg-card p-6 md:p-7 mb-8" aria-labelledby="reminder-heading">
          <h2 id="reminder-heading" className="font-display text-lg mb-2">{t('Servicepåminnelser')}</h2>
          <div className="flex items-start gap-3">
            <Checkbox
              id="reminder-opt-in"
              checked={optedIn === true}
              disabled={saving || optedIn === null}
              onCheckedChange={(checked) => toggleOptIn(checked === true)}
              aria-label={t('Påminn mig om service')}
            />
            <label htmlFor="reminder-opt-in" className="text-sm cursor-pointer leading-relaxed">
              {saving && <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1" />}
              {t('Påminn mig när det är dags för service igen (max ett mejl per säsong, alltid med avregistreringslänk).')}
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t('Vi sparar bara ditt val – inga konton, inga utskick utan ditt samtycke.')}
          </p>
        </section>
      )}
    </>
  )
}

export default CustomerRetentionSection
