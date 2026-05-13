import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { CATEGORY_STYLES } from '@/lib/constants'
import { timeAgo, formatPrice } from '@/lib/dateUtils'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function groupByMonth(offers: any[]) {
  const groups: Record<string, any[]> = {}
  offers.forEach(o => {
    const d = new Date(o.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' })
    if (!groups[key]) groups[key] = []
    groups[key].push({ ...o, monthLabel: label })
  })
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({ key, label: items[0].monthLabel, items }))
}

const OfferCard = ({ o }: { o: any }) => (
  <div className="bg-card rounded-xl border p-4">
    <div className="flex items-start justify-between">
      <div>
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold mb-1 ${CATEGORY_STYLES[o.projects?.category] || ''}`}>{o.projects?.category}</span>
        <h3 className="font-semibold">{o.title}</h3>
        <p className="text-xs text-muted-foreground">Till: {o.projects?.title} · {timeAgo(o.created_at)}</p>
      </div>
      <div className="text-right">
        <span className={`text-xs font-semibold rounded-full px-2 py-1 ${
          o.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
          o.status === 'declined' ? 'bg-destructive/10 text-destructive' :
          o.status === 'withdrawn' ? 'bg-muted text-muted-foreground' :
          'bg-primary/10 text-primary'
        }`}>
          {o.status === 'pending' ? 'Väntande' : o.status === 'accepted' ? 'Accepterad' : o.status === 'declined' ? 'Avböjd' : 'Återkallad'}
        </span>
        <p className="text-lg font-bold mt-1">{formatPrice(o.price)}</p>
      </div>
    </div>
  </div>
)

const SupplierOffers = () => {
  const { user } = useAuth()
  const [offers, setOffers] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.from('offers').select('*, projects(title, category, city)').eq('supplier_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setOffers(data) })
  }, [user])

  const activeOffers = offers.filter(o => o.status === 'pending' || o.status === 'accepted')
  const lostOffers = offers.filter(o => o.status === 'declined' || o.status === 'withdrawn')

  const filteredLost = useMemo(() => {
    if (!search.trim()) return lostOffers
    const q = search.toLowerCase()
    return lostOffers.filter(o =>
      o.title?.toLowerCase().includes(q) ||
      o.projects?.title?.toLowerCase().includes(q) ||
      o.projects?.category?.toLowerCase().includes(q)
    )
  }, [lostOffers, search])

  const lostByMonth = groupByMonth(filteredLost)

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-bold mb-6">Mina offerter</h1>

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Aktiva ({activeOffers.length})</TabsTrigger>
          <TabsTrigger value="lost">Ej vunna ({lostOffers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeOffers.length === 0 ? (
            <div className="bg-card rounded-xl border p-8 text-center">
              <p className="text-muted-foreground">Du har inga aktiva offerter just nu.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOffers.map(o => <OfferCard key={o.id} o={o} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lost">
          <Input
            placeholder="Sök bland ej vunna offerter..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-4 rounded-xl"
          />

          {lostByMonth.length === 0 ? (
            <div className="bg-card rounded-xl border p-8 text-center">
              <p className="text-muted-foreground">Inga ej vunna offerter att visa.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {lostByMonth.map(group => (
                <div key={group.key}>
                  <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 capitalize">
                    {group.label}
                  </h3>
                  <div className="space-y-3">
                    {group.items.map(o => <OfferCard key={o.id} o={o} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SupplierOffers
