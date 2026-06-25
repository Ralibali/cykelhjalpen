import { useEffect, useState } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Bike, Receipt, Send, Gift, Loader2 } from 'lucide-react'
import type { WorkshopContext } from '@/components/cykelhjalpen/WorkshopLayout'

const WorkshopDashboard = () => {
  const { workshop } = useOutletContext<{ workshop: WorkshopContext }>()
  const [stats, setStats] = useState({ sent: 0, paidTotal: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: responses }, { data: charges }] = await Promise.all([
        supabase.from('workshop_responses').select('id').eq('workshop_id', workshop.id).eq('paid', true),
        supabase.from('lead_charges').select('amount').eq('workshop_id', workshop.id).eq('status', 'paid'),
      ])
      setStats({
        sent: responses?.length || 0,
        paidTotal: (charges || []).reduce((sum, charge: any) => sum + (charge.amount || 0), 0) / 100,
      })
      setLoading(false)
    }
    load()
  }, [workshop.id])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Hej {workshop.company_name}!</h1>
        <p className="text-muted-foreground mt-1">Din verkstad är ansluten i {workshop.city}.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Stat icon={<Send className="h-5 w-5" />} label="Skickade offerter" value={stats.sent} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Betalat totalt" value={`${stats.paidTotal.toLocaleString('sv-SE')} kr`} link="/dashboard/verkstad/betalningar" />
          <Stat icon={<Gift className="h-5 w-5" />} label="Gratis-leads kvar" value={workshop.free_leads_remaining || 0} />
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_auto] gap-5 items-center sticker bg-card p-6 mb-6">
        <div>
          <h2 className="font-display text-xl font-bold mb-1">Se nya ärenden i {workshop.city}</h2>
          <p className="text-sm text-muted-foreground">Välj bara de jobb som passar er kapacitet och kompetens.</p>
        </div>
        <Link to="/dashboard/verkstad/arenden" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-3 font-medium hover:opacity-90">
          <Bike className="h-4 w-4" /> Öppna ärenden
        </Link>
      </div>

      <div className="sticker bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-2">Så fungerar det</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-foreground/85">
          <li>Välj bland ärenden från cyklister i {workshop.city}.</li>
          <li>Skriv pris, beräknad tid och ett tydligt meddelande.</li>
          <li>Granska offerten och betala via Stripe först när du vill skicka den.</li>
          <li>Max fem verkstäder kan lämna prisförslag per ärende.</li>
        </ol>
      </div>
    </div>
  )
}

const Stat = ({ icon, label, value, link }: any) => {
  const inner = (
    <div className="sticker bg-card p-5 flex items-center gap-4 hover:bg-muted/30 transition h-full">
      <div className="sticker bg-primary text-primary-foreground p-2">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="font-display text-2xl font-bold">{value}</div>
      </div>
    </div>
  )
  return link ? <Link to={link}>{inner}</Link> : inner
}

export default WorkshopDashboard
