import { useState } from 'react'
import { BuyLeadsButton } from './BuyLeadsButton'
import { LEAD_FEE_KR } from '@/lib/pricing'
import { useT } from '@/lib/i18n'

const QUANTITIES = [1, 2, 5, 10, 20]

interface BuyLeadsPickerProps {
  onSuccess?: () => void
}

export function BuyLeadsPicker({ onSuccess }: BuyLeadsPickerProps) {
  const t = useT()
  const [quantity, setQuantity] = useState(10)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {QUANTITIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setQuantity(q)}
            aria-pressed={quantity === q}
            className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors ${
              quantity === q
                ? 'border-foreground bg-primary text-primary-foreground'
                : 'border-border hover:bg-muted'
            }`}
          >
            {t('{count} st', { count: q })}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('Totalt {total} kr exkl. moms', { total: (quantity * LEAD_FEE_KR).toLocaleString('sv-SE') })}
      </p>
      <BuyLeadsButton quantity={quantity} onSuccess={onSuccess} />
    </div>
  )
}
