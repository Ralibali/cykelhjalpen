import { useState } from 'react'
import { Loader2, ShoppingCart } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface BuyLeadsButtonProps {
  quantity: number
  onSuccess?: () => void
  variant?: 'default' | 'outline'
}

export function BuyLeadsButton({ quantity, onSuccess, variant = 'default' }: BuyLeadsButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.access_token) {
        toast.error('Du måste logga in först')
        return
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-lead-credits-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ quantity }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Kunde inte skapa betalning')

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      toast.error(error.message || 'Något gick fel')
    } finally {
      setLoading(false)
    }
  }

  const totalPrice = quantity * 50
  const baseClasses = "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
  const variantClasses = variant === 'outline'
    ? "border border-amber-300 text-amber-800 hover:bg-amber-100 bg-white"
    : "bg-amber-600 text-white hover:bg-amber-700"

  return (
    <button
      onClick={handlePurchase}
      disabled={loading}
      className={`${baseClasses} ${variantClasses} disabled:opacity-50`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
      {quantity} leads – {totalPrice} kr
    </button>
  )
}
