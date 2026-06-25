import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bike, CreditCard, Eye, Home, MoreHorizontal, Settings, Shield, Wrench } from 'lucide-react'
import CykelNavbar from './CykelNavbar'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

const navItems = [
  { label: 'Översikt', href: '/admin', icon: Home },
  { label: 'Cykelärenden', href: '/admin/cykelarenden', icon: Bike },
  { label: 'Verkstäder', href: '/admin/verkstader', icon: Wrench },
  { label: 'Betalningar', href: '/admin/cykelbetalningar', icon: CreditCard },
  { label: 'Besökare', href: '/admin/besokare', icon: Eye },
  { label: 'Audit-logg', href: '/admin/audit', icon: Shield },
  { label: 'Inställningar', href: '/admin/installningar', icon: Settings },
]

const isActivePath = (pathname: string, href: string) => (
  href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
)

const CykelAdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <CykelNavbar />
      <div className="flex-1 flex">
        <aside className="hidden md:flex w-64 border-r bg-card flex-col p-4 gap-1 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Cykelhjälpen Admin</p>
          {navItems.map((item) => {
            const active = isActivePath(location.pathname, item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </aside>

        <main className="flex-1 p-4 md:p-8 overflow-x-auto pb-24 md:pb-8">
          {location.pathname !== '/admin' && (
            <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              ← Tillbaka till översikt
            </Link>
          )}
          {children}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex justify-around py-2 z-50">
        {navItems.slice(0, 4).map((item) => {
          const active = isActivePath(location.pathname, item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn('flex flex-col items-center gap-0.5 text-xs p-1', active ? 'text-primary' : 'text-muted-foreground')}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex flex-col items-center gap-0.5 text-xs p-1',
                navItems.slice(4).some((item) => isActivePath(location.pathname, item.href)) ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>Mer</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <div className="grid grid-cols-3 gap-2 pt-4">
              {navItems.slice(4).map((item) => {
                const active = isActivePath(location.pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium',
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  )
}

export default CykelAdminLayout
