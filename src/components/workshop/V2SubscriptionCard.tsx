// V2 subscription/plan card for the workshop billing page.
// Contract §2.8/§5: everything renders ONLY while flag
// v2.subscriptions.enabled is ON. Flag OFF (default) → renders nothing.
// The live pay-per-win billing UI around it is untouched.

import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Crown, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createV2SubscriptionCheckout,
  fetchV2ActivePlans,
  getV2WorkshopBillingState,
  openV2SubscriptionPortal,
  type V2WorkshopBillingState,
} from '@/lib/v2/subscriptions'
import type { V2PlanRow } from '@/lib/v2/contracts'
import { useT } from '@/lib/i18n'

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Provmånad',
  active: 'Aktiv',
  past_due: 'Betalning saknas',
  cancelled: 'Avslutad',
  expired: 'Utgången',
}

export const V2SubscriptionCard = ({ workshopId }: { workshopId: string }) => {
  const t = useT()
  const [state, setState] = useState<V2WorkshopBillingState | null>(null)
  const [plans, setPlans] = useState<V2PlanRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const next = await getV2WorkshopBillingState(workshopId)
    setState(next)
    if (next.enabled) setPlans(await fetchV2ActivePlans())
  }, [workshopId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Hidden while the flag is off (default) — zero UI surface.
  if (!state || !state.enabled) return null

  const { subscription, plan } = state
  const planName = plan?.name ?? t('Betala vid vinst')
  const upgrades = plans.filter((p) => p.code !== 'pay_per_win' && p.code !== subscription?.plan_code)

  const startCheckout = async (planCode: string) => {
    setBusy(planCode)
    try {
      const url = await createV2SubscriptionCheckout(planCode)
      window.location.href = url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Kunde inte starta checkout.'))
      setBusy(null)
    }
  }

  const openPortal = async () => {
    setBusy('portal')
    try {
      const url = await openV2SubscriptionPortal()
      window.location.href = url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Kunde inte öppna kundportalen.'))
      setBusy(null)
    }
  }

  return (
    <div className="sticker rounded-3xl bg-card p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl mb-1 flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" /> {t('Din plan')}
          </h2>
          <p className="text-sm mt-2">
            <span className="font-display text-lg font-bold">{planName}</span>
            {subscription && (
              <span className="ml-2 rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                {t(STATUS_LABELS[subscription.status] ?? subscription.status)}
              </span>
            )}
          </p>
          {subscription?.trial_ends_at && subscription.status === 'trialing' && (
            <p className="text-sm text-muted-foreground mt-1">
              {t('Provmånaden slutar {date}', { date: new Date(subscription.trial_ends_at).toLocaleDateString('sv-SE') })}
            </p>
          )}
          {subscription?.current_period_end && subscription.status !== 'trialing' && (
            <p className="text-sm text-muted-foreground mt-1">
              {t('Nästa faktureringsdatum: {date}', { date: new Date(subscription.current_period_end).toLocaleDateString('sv-SE') })}
            </p>
          )}
          {subscription?.granted_by_admin && (
            <p className="text-sm text-muted-foreground mt-1">{t('Planen är tilldelad av Cykelhjälpen.')}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {subscription?.stripe_customer_id && (
            <button
              type="button"
              onClick={openPortal}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {busy === 'portal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {t('Hantera prenumeration')}
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </button>
          )}
          {upgrades.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => startCheckout(p.code)}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy === p.code && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('Uppgradera till {name} – {price} kr/mån', {
                name: p.name,
                price: (p.price_ore_monthly / 100).toLocaleString('sv-SE'),
              })}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
