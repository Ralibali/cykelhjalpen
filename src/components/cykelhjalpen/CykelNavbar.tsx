import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import CykelLogo from './CykelLogo'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '@/hooks/useAuth'

const homeSectionLink = '/#sa-fungerar-det'

const CykelNavbar = () => {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated, isAdmin } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-foreground/80 hover:text-foreground'}`

  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-md transition-all ${
        scrolled ? 'bg-background/80 border-b border-border/50 shadow-sm' : 'bg-background/60'
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <CykelLogo />

        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/cykelverkstad-linkoping" className={navLinkClass}>Cykelverkstäder</NavLink>
          <NavLink to={homeSectionLink} className={navLinkClass}>Så fungerar det</NavLink>
          <NavLink to="/for-cykelverkstader" className={navLinkClass}>För verkstäder</NavLink>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button asChild variant="outline" size="sm">
              <Link to={isAdmin ? '/admin' : '/dashboard/verkstad'}>Mitt konto</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/logga-in">Logga in</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link to="/skicka-arende">Beskriv ditt cykelproblem</Link>
          </Button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            className="p-2"
            aria-label={open ? 'Stäng meny' : 'Öppna meny'}
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <NavLink to="/cykelverkstad-linkoping" onClick={() => setOpen(false)} className={navLinkClass}>Cykelverkstäder</NavLink>
            <NavLink to={homeSectionLink} onClick={() => setOpen(false)} className={navLinkClass}>Så fungerar det</NavLink>
            <NavLink to="/for-cykelverkstader" onClick={() => setOpen(false)} className={navLinkClass}>För verkstäder</NavLink>
            <div className="flex flex-col gap-2 pt-3 border-t border-border">
              {isAuthenticated ? (
                <Button asChild variant="outline" size="sm" onClick={() => setOpen(false)}>
                  <Link to={isAdmin ? '/admin' : '/dashboard/verkstad'}>Mitt konto</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" onClick={() => setOpen(false)}>
                  <Link to="/logga-in">Logga in</Link>
                </Button>
              )}
              <Button asChild size="sm" onClick={() => setOpen(false)}>
                <Link to="/skicka-arende">Beskriv ditt cykelproblem</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default CykelNavbar
