import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { numWord } from '@/lib/numberWords'

const TrialBanner = () => {
  const { isOnTrial, trialLeadsLeft, trialDaysLeft, trialExpired, isSupplier } = useAuth()

  if (!isSupplier) return null

  if (trialExpired) {
    return (
      <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-8 max-w-lg w-full shadow-lg text-center">
          <h2 className="font-display text-2xl font-bold mb-2">Din provperiod är slut</h2>
          <p className="text-muted-foreground mb-6">Välj en plan för att fortsätta ta emot uppdrag.</p>
          <div className="flex flex-col gap-3">
            <Link to="/dashboard/supplier/fakturering">
              <Button className="w-full bg-primary hover:bg-primary/90">Välj plan – från 119 kr/lead</Button>
            </Link>
            <Link to="/" className="text-xs text-muted-foreground hover:underline">
              Fortsätt utan plan
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isOnTrial) return null

  const urgent = trialLeadsLeft <= 1 || trialDaysLeft <= 3

  return (
    <div className={`rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4 flex-wrap ${urgent ? 'bg-orange-50 border border-orange-200' : 'bg-accent/10 border border-accent/20'}`}>
      <div className="flex items-center gap-2">
        {urgent ? <AlertTriangle className="h-4 w-4 text-orange-600" /> : <Sparkles className="h-4 w-4 text-accent" />}
        <span className={`text-sm font-medium ${urgent ? 'text-orange-800' : 'text-foreground'}`}>
          {urgent ? '⚠️ Nästan slut!' : '🎉 Provperiod aktiv'} · {numWord(trialLeadsLeft)} gratis {trialLeadsLeft === 1 ? 'lead' : 'leads'} kvar · {numWord(trialDaysLeft)} dagar kvar
        </span>
      </div>
      {urgent && (
        <Link to="/dashboard/supplier/fakturering">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs">Uppgradera nu</Button>
        </Link>
      )}
    </div>
  )
}

export default TrialBanner
