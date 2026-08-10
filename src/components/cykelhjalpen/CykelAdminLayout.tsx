import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Search, MoreHorizontal } from 'lucide-react'
import CykelNavbar from './CykelNavbar'
import AdminCommandPalette from './AdminCommandPalette'
import { ADMIN_NAV, ADMIN_NAV_FLAT, ADMIN_MOBILE_PRIMARY } from './adminNav'
import type { AdminNavItem } from './adminNav'
import { useAdminCounts } from '@/hooks/useAdminCounts'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const isActivePath = (pathname: string, href: string) => (
  href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
)

const Badge = ({ value, danger }: { value: number; danger?: boolean }) => (
  value > 0 ? (
    <span
      className={cn(
        'ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold',
        danger ? 'bg-destructive text-destructive-foreground' : 'bg-primary/15 text-primary',
      )}
    >
      {value > 99 ? '99+' : value}
    </span>
  ) : null
)

const CykelAdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation()
  const { counts } = useAdminCounts()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => { setMobileMenu(false) }, [location.pathname])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const badgeFor = (item: AdminNavItem) => (item.badge ? counts[item.badge] : 0)

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {ADMIN_NAV.map((group) => (
        <div key={group.title} className="mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">{group.title}</p>
          {group.items.map((item) => {
            const active = isActivePath(location.pathname, item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                <Badge value={badgeFor(item)} danger={item.danger} />
              </Link>
            )
          })}
        </div>
      ))}
    </>
  )

  const activeItem = ADMIN_NAV_FLAT.find((item) => isActivePath(location.pathname, item.href))
  const mobilePrimary = ADMIN_MOBILE_PRIMARY
    .map((href) => ADMIN_NAV_FLAT.find((item) => item.href === href))
    .filter(Boolean) as AdminNavItem[]

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <CykelNavbar />
      <div className="flex-1 flex">
        <aside className="hidden md:flex w-60 border-r bg-card flex-col p-3 shrink-0 sticky top-0 h-[calc(100vh)] overflow-y-auto">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 w-full rounded-xl border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors mb-4"
          >
            <Search className="h-4 w-4" />
            <span>Sök…</span>
            <kbd className="ml-auto text-[10px] rounded border px-1.5 py-0.5 bg-background">⌘K</kbd>
          </button>
          <NavLinks />
        </aside>

        <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8">
          <div className="md:hidden flex items-center gap-2 mb-4">
            <Sheet open={mobileMenu} onOpenChange={setMobileMenu}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Öppna adminmeny">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto p-3">
                <SheetTitle className="px-3 py-2 text-sm">Cykelhjälpen Admin</SheetTitle>
                <NavLinks onNavigate={() => setMobileMenu(false)} />
              </SheetContent>
            </Sheet>
            <Button variant="outline" className="flex-1 justify-start text-muted-foreground" onClick={() => setPaletteOpen(true)}>
              <Search className="h-4 w-4 mr-2" /> Sök kund, verkstad eller sida
            </Button>
          </div>

          {activeItem && activeItem.href !== '/admin' && (
            <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              ← Tillbaka till översikt
            </Link>
          )}
          <div className="overflow-x-auto">{children}</div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t grid grid-cols-5 z-50">
        {mobilePrimary.map((item) => {
          const active = isActivePath(location.pathname, item.href)
          const badge = badgeFor(item)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn('relative flex flex-col items-center justify-center gap-0.5 text-[11px] min-h-14 px-1', active ? 'text-primary' : 'text-muted-foreground')}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate max-w-full">{item.label.split(' ')[0]}</span>
              {badge > 0 && (
                <span className="absolute top-1.5 right-1/4 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMobileMenu(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] min-h-14 text-muted-foreground"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Mer</span>
        </button>
      </nav>

      <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

export default CykelAdminLayout
