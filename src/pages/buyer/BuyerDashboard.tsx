import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Plus, ArrowRight, Hand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORY_STYLES, BUDGET_LABELS } from '@/lib/constants'
import { timeAgo } from '@/lib/dateUtils'
import ProjectStepper from '@/components/shared/ProjectStepper'

const BuyerDashboard = () => {
  const { profile, user } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [offersByProject, setOffersByProject] = useState<Record<string, any[]>>({})
  const [stats, setStats] = useState({ active: 0, interested: 0 })

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)
      if (proj) {
        setProjects(proj)
        const totalOffers = proj.reduce((acc: number, p: any) => acc + (p.offer_count || 0), 0)
        setStats({
          active: proj.filter((p: any) => p.status === 'active').length,
          interested: totalOffers,
        })

        const projectIds = proj.map((p: any) => p.id)
        if (projectIds.length > 0) {
          const { data: allOffers } = await supabase
            .from('offers')
            .select('*')
            .in('project_id', projectIds)
          if (allOffers) {
            const grouped: Record<string, any[]> = {}
            allOffers.forEach((o: any) => {
              if (!grouped[o.project_id]) grouped[o.project_id] = []
              grouped[o.project_id].push(o)
            })
            setOffersByProject(grouped)
          }
        }
      }
    }
    fetchData()
  }, [user])

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-bold mb-6">Hej {profile?.full_name?.split(' ')[0]}! 👋</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Aktiva uppdrag</p>
          <p className="text-2xl font-bold font-display">{stats.active}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Intresserade byråer</p>
          <p className="text-2xl font-bold font-display">{stats.interested}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 col-span-2 md:col-span-1">
          <Link to="/publicera">
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Nytt uppdrag
            </Button>
          </Link>
        </div>
      </div>

      {/* Projects */}
      <h2 className="font-display text-lg font-semibold mb-3">Dina uppdrag</h2>
      {projects.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground mb-4">Du har inga uppdrag ännu.</p>
          <Link to="/publicera">
            <Button className="bg-primary hover:bg-primary/90">Publicera ditt första uppdrag</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const projectOffers = offersByProject[p.id] || []
            return (
              <Link key={p.id} to={`/dashboard/buyer/uppdrag/${p.id}`} className="block">
                <div className="bg-card rounded-xl border p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${CATEGORY_STYLES[p.category] || ''}`}>
                        {p.category}
                      </span>
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {BUDGET_LABELS[p.budget_range] || ''} · {p.city} · {timeAgo(p.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold rounded-full px-2 py-1 ${p.status === 'active' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                        {p.status === 'active' ? 'Aktiv' : p.status === 'closed' ? 'Stängd' : p.status}
                      </span>
                      {(p.offer_count || 0) > 0 && (
                        <p className="text-sm font-medium text-primary mt-1 flex items-center gap-1 justify-end">
                          <Hand className="h-3.5 w-3.5" />
                          {p.offer_count} intresserade {p.offer_count === 1 ? 'byrå' : 'byråer'}
                        </p>
                      )}
                    </div>
                  </div>
                  {p.status === 'active' && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <ProjectStepper project={p} offers={projectOffers} compact />
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
          <Link to="/dashboard/buyer/uppdrag" className="text-sm text-primary hover:underline flex items-center gap-1">
            Se alla uppdrag <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default BuyerDashboard
