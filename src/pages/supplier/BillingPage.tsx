import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParams } from 'react-router-dom'
import TrialBanner from '@/components/TrialBanner'
import { Check, Sparkles, CreditCard, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS, STRIPE_PRODUCTS, TRIAL_LEADS } from '@/lib/constants'
import { numWord } from '@/lib/numberWords'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

const BillingPage = () => {
  const { supplierProfile, isOnTrial, trialLeadsLeft, trialDaysLeft, refreshProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<{ subscribed: boolean; plan: string | null; subscription_end: string | null }>({
    subscribed: false, plan: null, subscription_end: null
  })
  const [checkingSubscription, setCheckingSubscription] = useState(false)

  // Check for success/cancel params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Betalningen lyckades! Ditt konto uppdateras inom kort.')
      checkSubscription()
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Betalningen avbröts.')
    }
  }, [searchParams])

  // Check subscription status on load
  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    setCheckingSubscription(true)
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription')
      if (error) throw error
      if (data) {
        setSubscription(data)
        if (data.subscribed) {
          await refreshProfile()
        }
      }
    } catch (e) {
      // Silently fail – user might not have a Stripe customer yet
    } finally {
      setCheckingSubscription(false)
    }
  }

  const handleCheckout = async (planId: string) => {
    const product = planId === 'monthly' ? STRIPE_PRODUCTS.monthly : STRIPE_PRODUCTS.lead
    setLoading(planId)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: product.price_id, mode: product.mode },
      })
      if (error) throw error
      if (data?.url) {
        window.open(data.url, '_blank')
      }
    } catch (e: any) {
      toast.error(e.message || 'Något gick fel vid checkout')
    } finally {
      setLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    setLoading('portal')
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal')
      if (error) throw error
      if (data?.url) {
        window.open(data.url, '_blank')
      }
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte öppna kundportalen')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-4xl">
      <TrialBanner />

      <h1 className="font-display text-2xl font-bold mb-6">Abonnemang & betalning</h1>

      {/* Active subscription banner */}
      {subscription.subscribed && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold">Månadskort aktivt</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Du har obegränsade leads. Nästa fakturadatum: {subscription.subscription_end ? new Date(subscription.subscription_end).toLocaleDateString('sv-SE') : '–'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleManageSubscription}
            disabled={loading === 'portal'}
          >
            {loading === 'portal' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
            Hantera abonnemang
          </Button>
        </div>
      )}

      {/* Trial banner */}
      {isOnTrial && !subscription.subscribed && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h3 className="font-display font-semibold">Provperiod aktiv</h3>
          </div>
          <p className="text-sm text-muted-foreground">{numWord(trialLeadsLeft)} av {numWord(TRIAL_LEADS)} gratis leads kvar · {numWord(trialDaysLeft)} dagar kvar</p>
          <div className="flex gap-1 mt-3">
            {Array.from({ length: TRIAL_LEADS }).map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < (TRIAL_LEADS - trialLeadsLeft) ? 'bg-accent' : 'bg-muted'}`} />
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-6">
        {PLANS.map(plan => {
          const isActive = subscription.subscribed && plan.id === 'monthly'
          return (
            <div key={plan.id} className={`bg-card rounded-2xl border p-6 relative ${plan.highlighted ? 'border-primary shadow-md ring-2 ring-primary/20' : ''} ${isActive ? 'ring-2 ring-accent' : ''}`}>
              {plan.highlighted && !isActive && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold rounded-full px-3 py-1">
                  {plan.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold rounded-full px-3 py-1">
                  Din plan
                </span>
              )}
              <h3 className="font-display font-bold text-lg">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price.toLocaleString('sv-SE')}</span>
                <span className="text-sm text-muted-foreground ml-1">kr {plan.per}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => isActive ? handleManageSubscription() : handleCheckout(plan.id)}
                className={`w-full mt-6 rounded-xl ${plan.highlighted && !isActive ? 'bg-primary hover:bg-primary/90' : ''}`}
                variant={plan.highlighted && !isActive ? 'default' : 'outline'}
                disabled={loading === plan.id}
              >
                {loading === plan.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isActive ? 'Hantera abonnemang' : plan.cta}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BillingPage
