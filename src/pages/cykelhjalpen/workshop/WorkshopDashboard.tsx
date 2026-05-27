import { useEffect, useState } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Bike, Receipt, Send } from 'lucide-react'

const WorkshopDashboard = () => {
  const { workshop }: any = useOutletContext()
  const [stats, setStats] = useState({ open: 0, sent: 0, paid_total: 0 })

  useEffect(() => {
    const load = async () => {
      if (!workshop?.approved) return
      const [{ count: open }, { data: responses }, { data: charges }] = await Promise.all([
        supabase.from('bike_repair_requests').select('*', { head: true, count: 'exact' }).eq('status', 'new'),
        supabase.from('workshop_responses').select('id').eq('workshop_id', workshop.id),
        supabase.from('lead_charges').select('amount').eq('workshop_id', workshop.id).eq('status', 'paid'),
      ])
      setStats({
        open: open || 0,
        sent: responses?.length || 0,
        paid_total: (charges || []).reduce((s, c: any) => s + (c.amount || 0), 0) / 100,
      })
    }
    load()
  }, [workshop])

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-6">Hej {workshop.company_name}!</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Stat icon={<Bike className="h-5 w-5" />} label="Öppna ärenden" value={stats.open} link="/dashboard/verkstad/arenden" />
        <Stat icon={<Send className="h-5 w-5" />} label="Skickade offerter" value={stats.sent} />
        <Stat icon={<Receipt className="h-5 w-5" />} label="Betalat totalt" value={`${stats.paid_total} kr`} />
      </div>
      <div className="sticker bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-2">Så fungerar det</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>Bläddra bland öppna ärenden från cyklister i Linköping.</li>
          <li>Skriv ditt prisförslag och välj “Skicka offert”.</li>
          <li>Du betalar femtio kronor exkl. moms per offert (62,50 kr inkl. moms). Då frigörs kundens kontaktuppgifter.</li>
          <li>Max fem verkstäder svarar per ärende.</li>
        </ol>
      </div>
    </div>
  )
}

const Stat = ({ icon, label, value, link }: any) => {
  const inner = (
    <div className="sticker bg-card p-5 flex items-center gap-4 hover:bg-muted/30 transition">
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
