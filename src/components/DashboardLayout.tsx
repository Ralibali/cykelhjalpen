import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/Navbar'
import { cn } from '@/lib/utils'
import { useNoindex } from '@/hooks/useNoindex'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface DashboardLayoutProps {
  children: React.ReactNode
  navItems: NavItem[]
  ctaButton?: { label: string; href: string }
}

const DashboardLayout = ({ children, navItems, ctaButton }: DashboardLayoutProps) => {
  useNoindex()
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex w-60 bg-sidebar text-sidebar-foreground flex-col p-3 gap-0.5">
          <div className="px-3 py-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">Dashboard</span>
          </div>
          {navItems.map(item => {
            const active = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">{item.badge}</span>
                )}
              </Link>
            )
          })}
          {ctaButton && (
            <Link to={ctaButton.href} className="mt-auto pt-4">
              <button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg px-3 py-2.5 text-sm font-semibold transition-all">
                {ctaButton.label}
              </button>
            </Link>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 bg-background overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex justify-around py-2 z-50">
        {navItems.slice(0, 4).map(item => {
          const active = location.pathname === item.href
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
      </nav>
    </div>
  )
}

export default DashboardLayout
