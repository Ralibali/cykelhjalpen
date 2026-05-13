import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Sparkles, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { getCategoryNavLinks } from '@/lib/seoData'

const categoryLinks = getCategoryNavLinks()

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const { isAuthenticated, profile, isBuyer, isSupplier, isAdmin, signOut, isOnTrial, trialLeadsLeft } = useAuth()

  const dashboardLink = isAdmin ? '/admin' : isSupplier ? '/dashboard/supplier' : '/dashboard/buyer'
  const initials = (profile?.full_name || 'U').slice(0, 2).toUpperCase()

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', mobileOpen)
    return () => document.body.classList.remove('overflow-hidden')
  }, [mobileOpen])

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="container flex min-h-16 items-center justify-between gap-3 py-2">
          <Logo />

          <nav className="hidden md:flex items-center gap-6" aria-label="Huvudnavigation">
            <Link to="/byraer" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Hitta byrå
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <button
                type="button"
                className="flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded={servicesOpen}
              >
                Kategorier <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {servicesOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                  <div className="bg-white dark:bg-card border rounded-xl shadow-lg p-4 w-[520px] grid grid-cols-2 gap-1">
                    {categoryLinks.map(link => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setServicesOpen(false)}
                        className="text-sm px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link to="/registrera/byra" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              För byråer
            </Link>

            <Link to="/om-oss" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Om Updro
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                {isSupplier && isOnTrial && (
                  <span className="text-xs font-semibold bg-primary/10 text-primary rounded-full px-3 py-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Trial: {trialLeadsLeft} leads
                  </span>
                )}
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full min-h-11 min-w-11">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isAdmin && <DropdownMenuItem asChild><Link to="/admin">Admin</Link></DropdownMenuItem>}
                    {isAdmin && <DropdownMenuItem asChild><Link to="/admin/uppdrag">Sök uppdrag</Link></DropdownMenuItem>}
                    {!isAdmin && <DropdownMenuItem asChild><Link to={dashboardLink}>Dashboard</Link></DropdownMenuItem>}
                    <DropdownMenuItem asChild><Link to={isAdmin ? '/admin/installningar' : isBuyer ? '/dashboard/buyer/profil' : '/dashboard/supplier/profil'}>Min profil</Link></DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut} className="text-destructive">Logga ut</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/logga-in"><Button variant="ghost" size="sm" className="min-h-11">Logga in</Button></Link>
                <Link to="/publicera">
                  <Button size="sm" className="min-h-11 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl px-5 shadow-md">
                    Starta förfrågan
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="md:hidden min-h-12 min-w-12 inline-flex items-center justify-center rounded-xl text-foreground relative z-[60] active:bg-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Stäng meny' : 'Öppna meny'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden fixed inset-x-0 top-16 bottom-0 z-[9999] bg-background overflow-y-auto overscroll-contain border-t">
          <nav className="flex flex-col p-4 gap-2 pb-[calc(2rem+env(safe-area-inset-bottom))]" aria-label="Mobilnavigation">
            <Link to="/byraer" className="min-h-12 flex items-center rounded-xl px-3 text-lg font-medium text-foreground active:bg-muted" onClick={closeMobile}>
              Hitta byrå
            </Link>
            <Link to="/registrera/byra" className="min-h-12 flex items-center rounded-xl px-3 text-lg font-medium text-foreground active:bg-muted" onClick={closeMobile}>
              För byråer
            </Link>
            <Link to="/om-oss" className="min-h-12 flex items-center rounded-xl px-3 text-lg font-medium text-foreground active:bg-muted" onClick={closeMobile}>
              Om Updro
            </Link>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 px-3">Kategorier</p>
            <div className="grid grid-cols-1 gap-1">
              {categoryLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="min-h-11 flex items-center rounded-xl px-3 text-base text-foreground active:bg-muted"
                  onClick={closeMobile}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t pt-4 mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between px-3 min-h-12">
                <span className="text-sm text-muted-foreground">Tema</span>
                <ThemeToggle />
              </div>
              {isAuthenticated ? (
                <>
                  <Link to={dashboardLink} onClick={closeMobile}>
                    <Button variant="outline" className="w-full min-h-12 rounded-xl">Dashboard</Button>
                  </Link>
                  <Button variant="ghost" className="w-full min-h-12 rounded-xl text-destructive" onClick={() => { signOut(); closeMobile() }}>Logga ut</Button>
                </>
              ) : (
                <>
                  <Link to="/logga-in" onClick={closeMobile}>
                    <Button variant="outline" className="w-full min-h-12 rounded-xl">Logga in</Button>
                  </Link>
                  <Link to="/publicera" onClick={closeMobile}>
                    <Button className="w-full min-h-12 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white">
                      Starta förfrågan
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}

export default Navbar
