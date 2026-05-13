import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface BuyerDecisionCardProps {
  project: any
  offers: any[]
  onScrollToOffers: () => void
  onProjectClosed: () => void
}

function getDaysSince(dateStr: string | null) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

const BuyerDecisionCard = ({ project, offers, onScrollToOffers, onProjectClosed }: BuyerDecisionCardProps) => {
  const pendingOffers = offers.filter(o => o.status === 'pending')
  const hasAccepted = offers.some(o => o.status === 'accepted')
  const firstOfferDate = offers.length > 0 ? offers[offers.length - 1]?.created_at : null
  const daysSinceFirstOffer = getDaysSince(firstOfferDate)

  if (pendingOffers.length === 0 || hasAccepted || daysSinceFirstOffer < 3) return null

  const handleClose = async (reason: 'external' | 'cancelled') => {
    const { error: projErr } = await supabase
      .from('projects')
      .update({ status: 'closed' })
      .eq('id', project.id)

    if (projErr) {
      toast.error('Kunde inte stänga uppdraget')
      return
    }

    await supabase
      .from('offers')
      .update({ status: 'declined' })
      .eq('project_id', project.id)
      .eq('status', 'pending')

    // Notify suppliers
    const supplierIds = offers.map(o => o.supplier_id).filter(Boolean)
    for (const sid of supplierIds) {
      await supabase.from('notifications').insert({
        user_id: sid,
        type: 'project_closed',
        title: 'Uppdrag stängt',
        message: `Beställaren har stängt uppdraget "${project.title}". Tack för din offert.`,
        link: null,
      })
    }

    toast.success(reason === 'external' ? 'Uppdraget markerat som avslutat' : 'Uppdraget har avslutats')
    onProjectClosed()
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
      <h4 className="font-bold text-foreground mb-1">
        Har du bestämt dig? 🤔
      </h4>
      <p className="text-sm text-muted-foreground mb-4">
        Du har fått {offers.length} {offers.length === 1 ? 'intresserad byrå' : 'intresserade byråer'}. Meddela byråerna ditt beslut
        så slipper de vänta i onödan.
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={onScrollToOffers}
          className="text-left text-sm font-semibold text-primary hover:underline flex items-center gap-2"
        >
          ✅ Välj en byrå att gå vidare med
        </button>
        <button
          onClick={() => handleClose('external')}
          className="text-left text-sm font-semibold text-primary hover:underline flex items-center gap-2"
        >
          🔄 Jag valde ett företag utanför Updro
        </button>
        <button
          onClick={() => handleClose('cancelled')}
          className="text-left text-sm font-semibold text-muted-foreground hover:underline flex items-center gap-2"
        >
          ❌ Uppdraget kommer inte att utföras
        </button>
      </div>
    </div>
  )
}

export default BuyerDecisionCard
