import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES, CATEGORY_STYLES } from '@/lib/constants'
import { Search, MapPin, CheckCircle } from 'lucide-react'
import RatingDisplay from '@/components/shared/RatingDisplay'
import VerificationChecklist from '@/components/shared/VerificationChecklist'
import { setSEOMeta } from '@/lib/seoHelpers'

const BrowseAgenciesPage = () => {
  const [agencies, setAgencies] = useState<any[]>([])
  const [filterCat, setFilterCat] = useState('all')
  const [searchCity, setSearchCity] = useState('')

  useEffect(() => {
    setSEOMeta({
      title: 'Hitta byråer i Sverige – Jämför och välj rätt byrå | Updro',
      description: 'Sök bland kvalificerade digitala byråer i Sverige. Filtrera på kategori och stad. Jämför betyg och kompetenser.',
      canonical: 'https://updro.se/byraer',
    })
  }, [])

  useEffect(() => {
    const fetchAgencies = async () => {
      const { data } = await supabase
        .from('supplier_profiles')
        .select('*, profiles!supplier_profiles_id_fkey(full_name, company_name, city, avatar_url)')
        .order('avg_rating', { ascending: false })
        .limit(50)
      if (data) setAgencies(data)
    }
    fetchAgencies()
  }, [])

  const filtered = agencies.filter(a => {
    const profile = a.profiles
    if (filterCat !== 'all' && !(a.categories || []).includes(filterCat)) return false
    if (searchCity && !(profile?.city || '').toLowerCase().includes(searchCity.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-12">
          <div className="container">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Hitta byråer</h1>
            <p className="text-muted-foreground mb-8">Sök bland kvalificerade byråer i Sverige</p>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök stad..."
                  value={searchCity}
                  onChange={e => setSearchCity(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Alla kategorier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kategorier</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Inga byråer matchar din sökning.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(a => {
                  const profile = a.profiles
                  return (
                    <Link key={a.id} to={`/byraer/${a.slug}`} className="block">
                      <div className="bg-card rounded-2xl border p-5 hover:shadow-md transition-all h-full">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                            {(profile?.company_name || profile?.full_name || '?')[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <h3 className="font-semibold">{profile?.company_name || profile?.full_name}</h3>
                              {a.is_verified && <CheckCircle className="h-4 w-4 text-primary" />}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {profile?.city || 'Sverige'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {(a.categories || []).slice(0, 3).map((cat: string) => (
                            <span key={cat} className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLES[cat] || ''}`}>{cat}</span>
                          ))}
                        </div>

                        {a.bio && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.bio}</p>}

                        <RatingDisplay avgRating={a.avg_rating || 0} reviewCount={a.review_count || 0} />

                        <VerificationChecklist
                          isVerified={a.is_verified}
                          hasFskatt={a.has_fskatt}
                          creditCheckPassed={a.credit_check_passed}
                          completedProjects={a.completed_projects}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default BrowseAgenciesPage
