import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import Navbar from '@/components/Navbar'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import { getCurrentHost } from '@/lib/hostConfig'
import { Home, Users, Bike, Wrench, CreditCard, Settings, TrendingUp, BookOpen, Receipt, Shield, Eye, MoreHorizontal, Sparkles, Building2, ClipboardList, BarChart3, ArrowLeft, Mail } from 'lucide-react'
import MarketplaceHealthPanel from '@/components/admin/MarketplaceHealthPanel'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useT } from '@/lib/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher'

// Tables not present in generated types yet (inbound_emails / sent_emails).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const looseDb = supabase as any


const useNavItems = () => {
  const t = useT()
  return [
    { label: t('Översikt'), href: '/admin', icon: Home },
    { label: t('Mejl'), href: '/admin/mejl', icon: Mail },
    { label: t('Cykelärenden'), href: '/admin/cykelarenden', icon: Bike },
    { label: t('Verkstäder'), href: '/admin/verkstader', icon: Wrench },
    { label: t('Betalningar'), href: '/admin/cykelbetalningar', icon: CreditCard },
    { label: t('Användare'), href: '/admin/anvandare', icon: Users },
    { label: t('Besökare'), href: '/admin/besokare', icon: Eye },
    { label: t('Redirects'), href: '/admin/redirects', icon: ArrowLeft },
    { label: t('Statistik'), href: '/admin/statistik', icon: TrendingUp },
    { label: t('Guider'), href: '/admin/guider', icon: BookOpen },
    { label: t('Artikelgenerator'), href: '/admin/artikelgenerator', icon: Sparkles },
    { label: t('Stripe-logg'), href: '/admin/stripe', icon: Receipt },
    { label: t('Audit-logg'), href: '/admin/audit', icon: Shield },
    { label: t('Inställningar'), href: '/admin/installningar', icon: Settings },
  ]
}

// Antal olästa mejl i inkorgen – uppdateras var 60:e sekund.
const useUnreadMailCount = (): number => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { count: unread } = await looseDb
        .from('inbound_emails')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .is('archived_at', null)
      if (!cancelled && typeof unread === 'number') setCount(unread)
    }
    load()
    const interval = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])
  return count
}

const UpdroAdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const unreadMail = useUnreadMailCount()
  const t = useT()
  const navItems = useNavItems()
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {getCurrentHost() === 'updro' ? <Navbar /> : <CykelNavbar />}
      <div className="flex justify-end px-4 pt-2 md:px-8">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex">
        <aside className="hidden md:flex w-64 border-r bg-card flex-col p-4 gap-1 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">{t('Admin')}</p>
          {navItems.map(item => (
            <Link key={item.href} to={item.href}
              className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                location.pathname === item.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}>
              <item.icon className="h-4 w-4" />{item.label}
              {item.href === '/admin/mejl' && unreadMail > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-5 text-center">
                  {unreadMail}
                </span>
              )}
            </Link>
          ))}
        </aside>
        <main className="flex-1 p-4 md:p-8 overflow-x-auto pb-24 md:pb-8">
          {location.pathname !== '/admin' && (
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" /> {t('Tillbaka till översikt')}
            </Link>
          )}
          {children}
        </main>
      </div>
      {/* Mobile bottom nav for admin */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex justify-around py-2 z-50">
        {navItems.slice(0, 4).map(item => {
          const active = location.pathname === item.href
          return (
            <Link key={item.href} to={item.href}
              className={cn('flex flex-col items-center gap-0.5 text-xs p-1', active ? 'text-primary' : 'text-muted-foreground')}>
              <item.icon className="h-5 w-5" />
              <span>{item.label.split(' ')[0]}</span>
              {item.href === '/admin/mejl' && unreadMail > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full px-1 min-w-4 text-center leading-tight">
                  {unreadMail}
                </span>
              )}
            </Link>
          )
        })}
        <Sheet>
          <SheetTrigger asChild>
            <button className={cn('flex flex-col items-center gap-0.5 text-xs p-1',
              navItems.slice(4).some(i => location.pathname === i.href) ? 'text-primary' : 'text-muted-foreground'
            )}>
              <MoreHorizontal className="h-5 w-5" />
              <span>{t('Mer')}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <div className="grid grid-cols-3 gap-2 pt-4">
              {navItems.slice(4).map(item => {
                const active = location.pathname === item.href
                return (
                  <Link key={item.href} to={item.href}
                    className={cn('flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors',
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                    )}>
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

/** På Cykelhjälpen används den nya adminmenyn, på Updro den gamla. */
export const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  getCurrentHost() === 'updro'
    ? <UpdroAdminLayout>{children}</UpdroAdminLayout>
    : <CykelAdminLayout>{children}</CykelAdminLayout>
)



const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
  <div className="bg-card rounded-xl border p-5 flex items-center gap-4">
    <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', color)}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold font-display">{value}</p>
    </div>
  </div>
)

const ContentStatusWidget = () => {
  const t = useT()
  const [stats, setStats] = useState({ published: 0, queued: 0, ready: 0, weakCats: [] as string[], weakCities: [] as string[] })

  useEffect(() => {
    const load = async () => {
      const [{ data: arts }, { data: q }] = await Promise.all([
        supabase.from('articles').select('category, city, status'),
        (supabase as any).from('article_queue').select('status'),
      ])
      const byCat: Record<string, number> = {}
      const byCity: Record<string, number> = {}
      ;(arts || []).forEach((a: any) => {
        byCat[a.category] = (byCat[a.category] || 0) + 1
        if (a.city) byCity[a.city] = (byCity[a.city] || 0) + 1
      })
      const allCats = ['Webbutveckling', 'SEO', 'E-handel', 'Apputveckling', 'Digital marknadsföring', 'Grafisk design', 'Google Ads', 'E-post']
      setStats({
        published: (arts || []).filter((a: any) => a.status === 'published').length,
        queued: (q || []).filter((r: any) => r.status === 'queued').length,
        ready: (q || []).filter((r: any) => r.status === 'ready_for_review').length,
        weakCats: allCats.filter(c => (byCat[c] || 0) < 3),
        weakCities: [],
      })
    }
    load()
  }, [])

  return (
    <div className="bg-card rounded-xl border p-5 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="font-display font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {t('Innehållsstatus')}</h2>
        <Link to="/admin/innehallsplan" className="text-xs text-primary hover:underline font-medium">{t('Öppna planeraren →')}</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-muted/40 rounded-lg p-3"><p className="text-xs text-muted-foreground">{t('Publicerade')}</p><p className="text-2xl font-display font-bold mt-1">{stats.published}</p></div>
        <div className="bg-muted/40 rounded-lg p-3"><p className="text-xs text-muted-foreground">{t('I kö')}</p><p className="text-2xl font-display font-bold mt-1">{stats.queued}</p></div>
        <div className="bg-muted/40 rounded-lg p-3"><p className="text-xs text-muted-foreground">{t('Klara att granska')}</p><p className="text-2xl font-display font-bold mt-1">{stats.ready}</p></div>
        <div className="bg-muted/40 rounded-lg p-3"><p className="text-xs text-muted-foreground">{t('Svaga kategorier')}</p><p className="text-2xl font-display font-bold mt-1">{stats.weakCats.length}</p></div>
      </div>
      {stats.weakCats.length > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">{t('Behöver fler artiklar:')} <span className="text-foreground font-medium">{stats.weakCats.join(', ')}</span></div>
      )}
    </div>
  )
}

const AdminDashboard = () => {
  const t = useT()
  const [stats, setStats] = useState({ users: 0, projects: 0, suppliers: 0, offers: 0, activeProjects: 0, totalLeads: 0 })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>([])

  useEffect(() => {
    const fetch = async () => {
      const [
        { count: users },
        { count: projects },
        { count: suppliers },
        { count: offers },
        { count: activeProjects },
        { count: totalLeads },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('supplier_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('offers').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('unlocked_leads').select('*', { count: 'exact', head: true }),
      ])
      setStats({
        users: users || 0, projects: projects || 0, suppliers: suppliers || 0,
        offers: offers || 0, activeProjects: activeProjects || 0, totalLeads: totalLeads || 0,
      })

      const { data: ru } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5)
      if (ru) setRecentUsers(ru)

      const { data: rp } = await supabase.from('projects').select('*, profiles!projects_buyer_id_fkey(full_name, company_name)').order('created_at', { ascending: false }).limit(5)
      if (rp) setRecentProjects(rp)
    }
    fetch()
  }, [])

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">{t('Admin Dashboard')}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label={t('Användare')} value={stats.users} icon={Users} color="bg-primary/10 text-primary" />
        <StatCard label={t('Byråer')} value={stats.suppliers} icon={Building2} color="bg-brand-amber/10 text-brand-amber" />
        <StatCard label={t('Uppdrag')} value={stats.projects} icon={ClipboardList} color="bg-accent/10 text-accent" />
        <StatCard label={t('Aktiva uppdrag')} value={stats.activeProjects} icon={BarChart3} color="bg-emerald-100 text-emerald-700" />
        <StatCard label={t('Offerter')} value={stats.offers} icon={CreditCard} color="bg-violet-100 text-violet-700" />
        <StatCard label={t('Upplåsta leads')} value={stats.totalLeads} icon={BarChart3} color="bg-rose-100 text-rose-700" />
      </div>

      <ContentStatusWidget />

      <div className="mb-8">
        <MarketplaceHealthPanel />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">{t('Senaste användare')}</h2>
            <Link to="/admin/anvandare" className="text-xs text-primary hover:underline">{t('Visa alla →')}</Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map(u => (
              <Link key={u.id} to={`/admin/anvandare/${u.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{u.full_name || '–'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5',
                  u.role === 'supplier' ? 'bg-primary/10 text-primary' : u.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
                )}>{u.role}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">{t('Senaste uppdrag')}</h2>
            <Link to="/admin/uppdrag" className="text-xs text-primary hover:underline">{t('Visa alla →')}</Link>
          </div>
          <div className="space-y-3">
            {recentProjects.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.profiles?.company_name || p.profiles?.full_name || '–'}</p>
                </div>
                <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5',
                  p.status === 'active' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                )}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
