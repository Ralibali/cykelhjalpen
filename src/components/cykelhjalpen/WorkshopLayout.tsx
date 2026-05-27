import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Bike, ListChecks, Receipt, Settings, LogOut, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelLogo from './CykelLogo'

interface Workshop {
  id: string
  company_name: string
  approved: boolean
}

const WorkshopLayout = () => {
  const { user, loading: authLoading, signOut } = useAuth()
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await supabase
        .from('workshops')
        .select('id,company_name,approved')
        .eq('user_id', user.id)
        .maybeSingle()
      setWorkshop(data as any)
      setLoading(false)
    }
    if (!authLoading && user) load()
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="sticker bg-card p-8 max-w-md text-center">
          <h1 className="font-display text-xl font-bold mb-2">Inget verkstadskonto kopplat</h1>
          <p className="text-muted-foreground mb-4">Registrera din verkstad för att komma igång.</p>
          <Button asChild>
            <Link to="/registrera/verkstad">Registrera verkstad</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isApproved = workshop.approved
  const disabledNavCls = isApproved ? '' : 'pointer-events-none opacity-50'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <CykelLogo size="sm" />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden md:inline text-muted-foreground">{workshop.company_name}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {!isApproved && (
        <div className="bg-brand-sun/40 border-b border-foreground/10 text-sm">
          <div className="container mx-auto px-4 py-3">
            ⏳ Ditt konto väntar på godkännande från vår admin. Du kan inte se ärenden eller skicka offerter än.
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 grid md:grid-cols-[220px_1fr] gap-8">
        <aside>
          <nav className="space-y-1 text-sm">
            <NavItem to="/dashboard/verkstad" end icon={<Bike className="h-4 w-4" />} className={disabledNavCls}>
              Översikt
            </NavItem>
            <NavItem to="/dashboard/verkstad/arenden" icon={<ListChecks className="h-4 w-4" />} className={disabledNavCls}>
              Ärenden
            </NavItem>
            <NavItem to="/dashboard/verkstad/betalningar" icon={<Receipt className="h-4 w-4" />} className={disabledNavCls}>
              Betalningar
            </NavItem>
            <NavItem to="/dashboard/verkstad/installningar" icon={<Settings className="h-4 w-4" />} className={disabledNavCls}>
              Inställningar
            </NavItem>
          </nav>
        </aside>
        <main>
          {isApproved ? (
            <Outlet context={{ workshop }} />
          ) : (
            <div className="sticker bg-card p-8 max-w-xl">
              <Clock className="h-8 w-8 text-primary mb-4" />
              <h1 className="font-display text-2xl font-bold mb-3">Väntar på godkännande</h1>
              <p className="text-muted-foreground mb-2">
                Tack för att du registrerat <strong>{workshop.company_name}</strong> hos Cykelhjälpen.
                Vår admin granskar din registrering manuellt för att säkerställa att alla verkstäder
                på plattformen är seriösa.
              </p>
              <p className="text-muted-foreground">
                Vi mejlar dig så fort kontot är aktiverat — då får du tillgång till ärenden,
                offerter och betalningar härifrån.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const NavItem = ({ to, end, icon, children, className = '' }: any) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded-md ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${className}`
    }
  >
    {icon} {children}
  </NavLink>
)

export default WorkshopLayout
