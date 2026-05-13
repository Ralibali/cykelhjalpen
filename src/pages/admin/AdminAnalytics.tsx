import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AdminLayout } from './AdminDashboard'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList } from 'recharts'
import { TrendingUp, Users, ClipboardList, CreditCard, Eye, ArrowUpRight, ArrowDownRight, DollarSign, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeSeriesPoint { date: string; count: number }
interface CategoryCount { name: string; value: number }

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#ec4899']

const StatCard = ({ label, value, icon: Icon, color, changePercent, suffix }: any) => (
  <div className="bg-card rounded-xl border p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', color)}>
        <Icon className="h-5 w-5" />
      </div>
      {changePercent !== undefined && (
        <span className={cn('text-xs font-semibold flex items-center gap-0.5 rounded-full px-2 py-0.5',
          changePercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        )}>
          {changePercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(changePercent)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold font-display">{value}{suffix}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
)

const groupByDay = (dates: string[]): TimeSeriesPoint[] => {
  const map = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    map.set(d.toISOString().slice(0, 10), 0)
  }
  dates.forEach(d => {
    const key = d.slice(0, 10)
    if (map.has(key)) map.set(key, map.get(key)! + 1)
  })
  return Array.from(map.entries()).map(([date, count]) => ({ date: date.slice(5), count }))
}

const growth = (current: number, prev: number) => {
  const newItems = current - prev
  if (prev === 0) return newItems > 0 ? 100 : 0
  return Math.round((newItems / prev) * 100)
}

const AdminAnalytics = () => {
  const [registrations, setRegistrations] = useState<TimeSeriesPoint[]>([])
  const [projectsByDay, setProjectsByDay] = useState<TimeSeriesPoint[]>([])
  const [categoryDist, setCategoryDist] = useState<CategoryCount[]>([])
  const [budgetDist, setBudgetDist] = useState<CategoryCount[]>([])
  const [planDist, setPlanDist] = useState<CategoryCount[]>([])
  const [conversionStats, setConversionStats] = useState({ totalProjects: 0, withOffers: 0, avgOffers: 0, avgViewCount: 0 })
  const [topSuppliers, setTopSuppliers] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [totals, setTotals] = useState({ users: 0, suppliers: 0, projects: 0, offers: 0, leads: 0, reviews: 0 })
  const [prevTotals, setPrevTotals] = useState({ users: 0, suppliers: 0, projects: 0, offers: 0 })
  const [revenue, setRevenue] = useState({ totalRevenue: 0, monthlyRevenue: 0, subscriptions: 0, leadPurchases: 0 })
  const [funnelData, setFunnelData] = useState<{ name: string; value: number; fill: string }[]>([])
  const [revenueByDay, setRevenueByDay] = useState<{ date: string; amount: number }[]>([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

    // All parallel fetches
    const [
      { count: users }, { count: suppliers }, { count: projects }, { count: offers },
      { count: leads }, { count: reviews },
      { count: prevUsers }, { count: prevSuppliers }, { count: prevProjects }, { count: prevOffers },
      { data: allProfiles }, { data: allProjects }, { data: catData }, { data: budgetData },
      { data: planData }, { data: projWithOffers }, { data: topSup },
      { data: recentNotifs }, { data: stripeEvents }, { data: totalViews }, { data: totalUnlocks },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('supplier_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('offers').select('*', { count: 'exact', head: true }),
      supabase.from('unlocked_leads').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).lt('created_at', thirtyDaysAgo),
      supabase.from('supplier_profiles').select('*', { count: 'exact', head: true }).lt('created_at', thirtyDaysAgo),
      supabase.from('projects').select('*', { count: 'exact', head: true }).lt('created_at', thirtyDaysAgo),
      supabase.from('offers').select('*', { count: 'exact', head: true }).lt('created_at', thirtyDaysAgo),
      supabase.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo).order('created_at'),
      supabase.from('projects').select('created_at').gte('created_at', thirtyDaysAgo).order('created_at'),
      supabase.from('projects').select('category'),
      supabase.from('projects').select('budget_range'),
      supabase.from('supplier_profiles').select('plan'),
      supabase.from('projects').select('id, offer_count, view_count'),
      supabase.from('supplier_profiles').select('id, slug, avg_rating, completed_projects, lead_credits, plan, is_verified').order('completed_projects', { ascending: false }).limit(10),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(15),
      supabase.from('stripe_events').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('view_count'),
      supabase.from('unlocked_leads').select('id'),
    ])

    setTotals({ users: users || 0, suppliers: suppliers || 0, projects: projects || 0, offers: offers || 0, leads: leads || 0, reviews: reviews || 0 })
    setPrevTotals({ users: prevUsers || 0, suppliers: prevSuppliers || 0, projects: prevProjects || 0, offers: prevOffers || 0 })

    if (allProfiles) setRegistrations(groupByDay(allProfiles.map(p => p.created_at!)))
    if (allProjects) setProjectsByDay(groupByDay(allProjects.map(p => p.created_at!)))

    // Category distribution
    if (catData) {
      const catMap = new Map<string, number>()
      catData.forEach(p => catMap.set(p.category, (catMap.get(p.category) || 0) + 1))
      setCategoryDist(Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value))
    }

    // Budget distribution
    if (budgetData) {
      const budgetMap = new Map<string, number>()
      budgetData.forEach(p => { const key = p.budget_range || 'Ej angiven'; budgetMap.set(key, (budgetMap.get(key) || 0) + 1) })
      setBudgetDist(Array.from(budgetMap.entries()).map(([name, value]) => ({ name, value })))
    }

    // Plan distribution
    if (planData) {
      const planMap = new Map<string, number>()
      planData.forEach(p => planMap.set(p.plan || 'none', (planMap.get(p.plan || 'none') || 0) + 1))
      setPlanDist(Array.from(planMap.entries()).map(([name, value]) => ({ name, value })))
    }

    // Conversion stats
    if (projWithOffers) {
      const withOff = projWithOffers.filter(p => (p.offer_count || 0) > 0).length
      const avgOff = projWithOffers.length > 0 ? projWithOffers.reduce((s, p) => s + (p.offer_count || 0), 0) / projWithOffers.length : 0
      const avgViews = projWithOffers.length > 0 ? projWithOffers.reduce((s, p) => s + (p.view_count || 0), 0) / projWithOffers.length : 0
      setConversionStats({ totalProjects: projWithOffers.length, withOffers: withOff, avgOffers: Math.round(avgOff * 10) / 10, avgViewCount: Math.round(avgViews) })
    }

    // Top suppliers
    if (topSup) {
      const ids = topSup.map(s => s.id)
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, company_name').in('id', ids)
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
      setTopSuppliers(topSup.map(s => ({ ...s, name: profileMap.get(s.id)?.company_name || profileMap.get(s.id)?.full_name || 'Okänd' })))
    }

    if (recentNotifs) setRecentActivity(recentNotifs)

    // Revenue from stripe_events
    if (stripeEvents) {
      const totalRev = stripeEvents.reduce((s, e) => s + (e.amount_sek || 0), 0)
      const monthlyEvents = stripeEvents.filter(e => new Date(e.created_at!).getTime() > Date.now() - 30 * 86400000)
      const monthlyRev = monthlyEvents.reduce((s, e) => s + (e.amount_sek || 0), 0)
      const subs = stripeEvents.filter(e => e.event_type === 'checkout.session.completed' && e.plan === 'monthly').length
      const leadPurchases = stripeEvents.filter(e => e.event_type === 'checkout.session.completed' && e.plan === 'lead').length
      setRevenue({ totalRevenue: totalRev, monthlyRevenue: monthlyRev, subscriptions: subs, leadPurchases })

      // Revenue by day (last 30 days)
      const revMap = new Map<string, number>()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        revMap.set(d.toISOString().slice(0, 10), 0)
      }
      monthlyEvents.forEach(e => {
        const key = e.created_at!.slice(0, 10)
        if (revMap.has(key)) revMap.set(key, revMap.get(key)! + (e.amount_sek || 0))
      })
      setRevenueByDay(Array.from(revMap.entries()).map(([date, amount]) => ({ date: date.slice(5), amount: Math.round(amount / 100) })))
    }

    // Lead funnel
    const totalViewCount = totalViews?.reduce((s, p) => s + (p.view_count || 0), 0) || 0
    const totalUnlockCount = totalUnlocks?.length || 0
    setFunnelData([
      { name: 'Visningar', value: totalViewCount, fill: 'hsl(var(--primary))' },
      { name: 'Upplåsningar', value: totalUnlockCount, fill: '#8b5cf6' },
      { name: 'Offerter', value: offers || 0, fill: 'hsl(var(--accent))' },
    ])
  }

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold mb-6">Statistik & Analys</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
        <StatCard label="Användare" value={totals.users} icon={Users} color="bg-primary/10 text-primary" changePercent={growth(totals.users, prevTotals.users)} />
        <StatCard label="Byråer" value={totals.suppliers} icon={Users} color="bg-violet-100 text-violet-700" changePercent={growth(totals.suppliers, prevTotals.suppliers)} />
        <StatCard label="Uppdrag" value={totals.projects} icon={ClipboardList} color="bg-accent/10 text-accent-foreground" changePercent={growth(totals.projects, prevTotals.projects)} />
        <StatCard label="Offerter" value={totals.offers} icon={CreditCard} color="bg-amber-100 text-amber-700" changePercent={growth(totals.offers, prevTotals.offers)} />
        <StatCard label="Upplåsta leads" value={totals.leads} icon={Eye} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="Omdömen" value={totals.reviews} icon={TrendingUp} color="bg-rose-100 text-rose-700" />
        <StatCard label="Intäkter (30d)" value={`${Math.round(revenue.monthlyRevenue / 100).toLocaleString('sv-SE')}`} suffix=" kr" icon={DollarSign} color="bg-primary/10 text-primary" />
        <StatCard label="Aktiva prenumerationer" value={revenue.subscriptions} icon={Zap} color="bg-violet-100 text-violet-700" />
      </div>

      {/* Revenue Chart */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold mb-4">Intäkter per dag (30 dagar, SEK)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [`${v} kr`, 'Intäkt']} />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Intäkt" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Funnel */}
        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold mb-4">Lead-funnel (totalt)</h2>
          <div className="space-y-4 mt-4">
            {funnelData.map((step, i) => {
              const maxVal = funnelData[0]?.value || 1
              const pct = maxVal > 0 ? Math.round((step.value / maxVal) * 100) : 0
              return (
                <div key={step.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{step.name}</span>
                    <span className="text-sm font-bold">{step.value.toLocaleString('sv-SE')} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-8 bg-muted rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, backgroundColor: step.fill }} />
                  </div>
                  {i < funnelData.length - 1 && funnelData[i + 1] && step.value > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">
                      → {Math.round((funnelData[i + 1].value / step.value) * 100)}% konvertering
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold mb-4">Nya registreringar (30 dagar)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={registrations}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Registreringar" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold mb-4">Nya uppdrag (30 dagar)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={projectsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Uppdrag" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold mb-4">Kategorier</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}>
                {categoryDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold mb-4">Budgetfördelning</h2>
          <div className="space-y-3 mt-4">
            {budgetDist.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-sm flex-1 truncate">{b.name}</span>
                <span className="font-semibold text-sm">{b.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold mb-4">Planer (byråer)</h2>
          <div className="space-y-3 mt-4">
            {planDist.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-sm flex-1 capitalize">{p.name}</span>
                <span className="font-semibold text-sm">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion & Top Suppliers */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold mb-4">Konverteringsdata</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Uppdrag med offerter</p>
              <p className="text-2xl font-bold">{conversionStats.withOffers}<span className="text-sm font-normal text-muted-foreground">/{conversionStats.totalProjects}</span></p>
              <p className="text-xs text-muted-foreground mt-1">
                {conversionStats.totalProjects > 0 ? Math.round((conversionStats.withOffers / conversionStats.totalProjects) * 100) : 0}% konvertering
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Snitt offerter/uppdrag</p>
              <p className="text-2xl font-bold">{conversionStats.avgOffers}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Snitt visningar/uppdrag</p>
              <p className="text-2xl font-bold">{conversionStats.avgViewCount}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Lead-köp (totalt)</p>
              <p className="text-2xl font-bold">{revenue.leadPurchases}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h2 className="font-display font-semibold mb-4">Topp byråer</h2>
          <div className="space-y-2">
            {topSuppliers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.completed_projects} projekt · {s.avg_rating} ★ · {s.plan}
                    {s.is_verified && ' ✓'}
                  </p>
                </div>
                <span className="text-xs font-semibold">{s.lead_credits} credits</span>
              </div>
            ))}
            {topSuppliers.length === 0 && <p className="text-sm text-muted-foreground">Inga byråer ännu</p>}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-display font-semibold mb-4">Senaste aktivitet (systemnotifikationer)</h2>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {recentActivity.map(n => (
            <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
              <div className={cn('mt-1 h-2 w-2 rounded-full shrink-0', n.is_read ? 'bg-muted-foreground/30' : 'bg-primary')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground truncate">{n.message}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{n.created_at ? new Date(n.created_at).toLocaleDateString('sv-SE') : ''}</span>
            </div>
          ))}
          {recentActivity.length === 0 && <p className="text-sm text-muted-foreground">Ingen aktivitet ännu</p>}
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminAnalytics
