import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Bike, ListChecks, Receipt, Settings, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelLogo from './CykelLogo'

interface Workshop {
  id: string
  company_name: string
  approved: boolean
}

const WorkshopLayout = () => {
  const { user, loading: authLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await supabase.from('workshops').select('id,company_name,approved').eq('user_id', user.id).maybeSingle()
      setWorkshop(data as any)
      setLoading(false)
    }
    if (!authLoading) {
      if (!user) navigate('/logga-in')
      else load()
    }
  }, [user, authLoading, navigate])

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <CykelLogo size="sm" />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden md:inline text-muted-foreground">{workshop.company_name}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      {!workshop.approved && (
        <div className="bg-brand-sun/40 border-b border-foreground/10 text-sm">
          <div className="container mx-auto px-4 py-3">
            ⏳ Ditt konto väntar på godkännande från vår admin. Du kan inte se ärenden eller skicka offerter än.
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 grid md:grid-cols-[220px_1fr] gap-8">
        <aside>
          <nav className="space-y-1 text-sm">
            <NavItem to="/dashboard/verkstad" end icon={<Bike className="h-4 w-4" />}>Översikt</NavItem>
            <NavItem to="/dashboard/verkstad/arenden" icon={<ListChecks className="h-4 w-4" />}>Ärenden</NavItem>
            <NavItem to="/dashboard/verkstad/betalningar" icon={<Receipt className="h-4 w-4" />}>Betalningar</NavItem>
            <NavItem to="/dashboard/verkstad/installningar" icon={<Settings className="h-4 w-4" />}>Inställningar</NavItem>
          </nav>
        </aside>
        <main>
          <Outlet context={{ workshop }} />
        </main>
      </div>
    </div>
  )
}

const NavItem = ({ to, end, icon, children }: any) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded-md ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`
    }
  >
    {icon} {children}
  </NavLink>
)

export default WorkshopLayout
