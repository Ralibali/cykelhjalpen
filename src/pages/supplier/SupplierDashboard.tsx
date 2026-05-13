import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import TrialBanner from '@/components/TrialBanner'
import SupplierNotificationsList from '@/components/supplier/SupplierNotificationsList'
import { ArrowRight } from 'lucide-react'
import { CATEGORY_STYLES, BUDGET_LABELS } from '@/lib/constants'
import { timeAgo } from '@/lib/dateUtils'

const SupplierDashboard = () => {
  const { profile, supplierProfile, user } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [offerCount, setOfferCount] = useState(0)

  useEffect(() => {
    if (!user || !supplierProfile) return
    const cats = supplierProfile.categories || []
    const fetchData = async () => {
      let query = supabase.from('projects').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(3)
      if (cats.length > 0) {
        query = query.in('category', cats)
      }
      const { data: proj } = await query
      if (proj) setProjects(proj)

      const { count } = await supabase.from('offers').select('*', { count: 'exact', head: true }).eq('supplier_id', user.id)
      setOfferCount(count || 0)
    }
    fetchData()
  }, [user, supplierProfile])

  return (
    <div className="max-w-4xl">
      <TrialBanner />

      <h1 className="font-display text-2xl font-bold mb-6">Välkommen {profile?.full_name?.split(' ')[0]}! 👋</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Tillgängliga leads</p>
          <p className="text-2xl font-bold font-display text-primary">{supplierProfile?.lead_credits || 0}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Offerter skickade</p>
          <p className="text-2xl font-bold font-display">{offerCount}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Betyg</p>
          <p className="text-2xl font-bold font-display">⭐ {supplierProfile?.avg_rating?.toFixed(1) || '–'}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Genomförda projekt</p>
          <p className="text-2xl font-bold font-display">{supplierProfile?.completed_projects || 0}</p>
        </div>
      </div>

      {/* Notiser */}
      <div className="mb-8">
        <SupplierNotificationsList />
      </div>

      {/* Matched projects */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">Matchade uppdrag</h2>
        <Link to="/dashboard/supplier/uppdrag" className="text-sm text-primary hover:underline flex items-center gap-1">
          Se alla <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-card rounded-xl border p-6 text-center">
          <p className="text-muted-foreground">Inga matchade uppdrag just nu. Kom tillbaka snart!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <Link key={p.id} to={`/dashboard/supplier/uppdrag/${p.id}`} className="block">
              <div className="bg-card rounded-xl border p-4 hover:shadow-md transition-all">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${CATEGORY_STYLES[p.category] || ''}`}>{p.category}</span>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                <p className="text-xs text-muted-foreground mt-2">{BUDGET_LABELS[p.budget_range] || ''} · {p.city} · {timeAgo(p.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default SupplierDashboard
