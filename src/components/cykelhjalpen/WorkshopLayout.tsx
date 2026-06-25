import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Bike, ListChecks, Receipt, Settings, LogOut, Loader2, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelLogo from './CykelLogo'
import { isCykelCity } from '@/lib/cykelCities'
import { toast } from 'sonner'

const PENDING_CITY_KEY = 'cykelhjalpen_pending_workshop_city'

export interface WorkshopContext {
  id: string
  company_name: string
  email: string
  phone: string | null
  address: string | null
  website: string | null
  city: string
  approved: boolean
  sms_notifications: boolean
  free_leads_remaining: number
}

const WorkshopLayout = () => {
  const { user, loading: authLoading, signOut } = useAuth()
  const [workshop, setWorkshop] = useState<WorkshopContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('workshops')
        .select('id, company_name, email, phone, address, website, city, approved, sms_notifications, free_leads_remaining')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        toast.error('Kunde inte läsa verkstadsprofilen.')
        setLoading(false)
        return
      }

      let nextWorkshop = data as WorkshopContext | null
      const pendingCity = localStorage.getItem(PENDING_CITY_KEY)
      if (nextWorkshop && isCykelCity(pendingCity) && nextWorkshop.city !== pendingCity) {
        const [{ error: workshopError }, { error: profileError }] = await Promise.all([
          supabase.from('workshops').update({ city: pendingCity }).eq('id', nextWorkshop.id),
          supabase.from('profiles').update({ city: pendingCity }).eq('id', user.id),
        ])

        if (!workshopError) {
          nextWorkshop = { ...nextWorkshop, city: pendingCity }
          localStorage.removeItem(PENDING_CITY_KEY)
        }
        if (workshopError || profileError) {
          console.error('Could not sync workshop city', workshopError || profileError)
          toast.error('Staden kunde inte sparas automatiskt. Kontrollera den under inställningar.')
        }
      } else if (nextWorkshop && pendingCity === nextWorkshop.city) {
        localStorage.removeItem(PENDING_CITY_KEY)
      }

      setWorkshop(nextWorkshop)
      setLoading(false)
    }

    if (!authLoading && user) load()
  }, [user, authLoading])

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="sticker bg-card p-8 max-w-md text-center">
          <h1 className="font-display text-xl font-bold mb-2">Inget verkstadskonto kopplat</h1>
          <p className="text-muted-foreground mb-4">Registrera din verkstad för att komma igång.</p>
          <Button asChild><Link to="/registrera/verkstad">Registrera verkstad</Link></Button>
        </div>
      </div>
    )
  }

  const disabledNavCls = workshop.approved ? '' : 'pointer-events-none opacity-50'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <CykelLogo size="sm" />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-muted-foreground">{workshop.company_name}</span>
            <span className="hidden md:inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{workshop.city}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()} aria-label="Logga ut"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      {!workshop.approved && (
        <div className="bg-brand-sun/40 border-b border-foreground/10 text-sm">
          <div className="container mx-auto px-4 py-3">⏳ Ditt konto i {workshop.city} väntar på godkännande. Du kan inte se ärenden eller skicka offerter än.</div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 md:py-8 grid md:grid-cols-[220px_1fr] gap-6 md:gap-8">
        <aside className="overflow-x-auto">
          <nav className="flex md:block gap-1 md:space-y-1 text-sm min-w-max">
            <NavItem to="/dashboard/verkstad" end icon={<Bike className="h-4 w-4" />} className={disabledNavCls}>Översikt</NavItem>
            <NavItem to="/dashboard/verkstad/arenden" icon={<ListChecks className="h-4 w-4" />} className={disabledNavCls}>Ärenden</NavItem>
            <NavItem to="/dashboard/verkstad/betalningar" icon={<Receipt className="h-4 w-4" />} className={disabledNavCls}>Betalningar</NavItem>
            <NavItem to="/dashboard/verkstad/installningar" icon={<Settings className="h-4 w-4" />} className={disabledNavCls}>Inställningar</NavItem>
          </nav>
        </aside>
        <main>
          {workshop.approved ? (
            <Outlet context={{ workshop }} />
          ) : (
            <div className="sticker bg-card p-8 max-w-xl">
              <Clock className="h-8 w-8 text-primary mb-4" />
              <h1 className="font-display text-2xl font-bold mb-3">Väntar på godkännande</h1>
              <p className="text-muted-foreground mb-2">Tack för att du registrerat <strong>{workshop.company_name}</strong> i {workshop.city}. Vi granskar verkstaden manuellt för att hålla nätverket tryggt.</p>
              <p className="text-muted-foreground">Vi mejlar dig när kontot aktiverats. Då får du tillgång till lokala ärenden, offerter och betalningar.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const NavItem = ({ to, end, icon, children, className = '' }: any) => (
  <NavLink to={to} end={end} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${className}`}>
    {icon} {children}
  </NavLink>
)

export default WorkshopLayout
