import { useState } from 'react'
import { Loader2, ShoppingCart } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'
import { LEAD_FEE_KR } from '@/lib/pricing'

export const LEAD_PACKS = [1, 2, 3, 4, 5, 10] as const

interface BuyLeadsPickerProps {
  /** Förvald mängd */
  defaultQuantity?: number
  className?: string
}

export function BuyLeadsPicker({ defaultQuantity = 5, className = '' }: BuyLeadsPickerProps) {
  const t = useT()
  const [quantity, setQuantity] = useState<number>(defaultQuantity)
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.access_token) {
        toast.error(t('Du måste logga in först'))
        return
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-lead-credits-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ quantity }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || t('Kunde inte skapa betalning'))
      if (data.url) window.location.href = data.url
    } catch (error: any) {
      toast.error(error.message || t('Något gick fel'))
    } finally {
      setLoading(false)
    }
  }

  const total = quantity * LEAD_FEE_KR

  return (
    <div className={`w-full sm:w-auto ${className}`}>
      <p className="text-xs text-muted-foreground mb-2">{t('Välj antal leads')}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {LEAD_PACKS.map((pack) => (
          <button
            key={pack}
            type="button"
            onClick={() => setQuantity(pack)}
            aria-pressed={quantity === pack}
            className={`min-w-[3rem] rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              quantity === pack
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted'
            }`}
          >
            {pack}
          </button>
        ))}
      </div>
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        {t('Köp {quantity} leads – {price} kr', { quantity, price: total })}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">{t('Priser exkl. moms. {price} kr per lead.', { price: LEAD_FEE_KR })}</p>
    </div>
  )
}
