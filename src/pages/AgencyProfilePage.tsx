import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CATEGORY_STYLES } from '@/lib/constants'
import { Star, MapPin, CheckCircle, Globe, ArrowRight } from 'lucide-react'
import { timeAgo } from '@/lib/dateUtils'
import RatingDisplay from '@/components/shared/RatingDisplay'
import VerificationChecklist from '@/components/shared/VerificationChecklist'
import { setSEOMeta, setJsonLd } from '@/lib/seoHelpers'

const AgencyProfilePage = () => {
  const { slug } = useParams()
  const [agency, setAgency] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])

  useEffect(() => {
    if (!slug) return
    const fetchAgency = async () => {
      const { data: sp } = await supabase.from('supplier_profiles').select('*, profiles!supplier_profiles_id_fkey(*)').eq('slug', slug).single()
      if (sp) {
        setAgency(sp)
        setProfile(sp.profiles)
        // Fetch reviews
        const { data: revs } = await supabase.from('reviews').select('*, profiles!reviews_buyer_id_fkey(full_name, company_name)').eq('supplier_id', sp.id).order('created_at', { ascending: false })
        if (revs) setReviews(revs)
      }
    }
    fetchAgency()
  }, [slug])

  useEffect(() => {
    if (agency && profile) {
      const name = profile.company_name || profile.full_name || 'Byrå'
      const url = `https://updro.se/byra/${slug}`
      setSEOMeta({
        title: `${name} – Byråprofil | Updro`,
        description: `Se ${name}s profil på Updro. Betyg, tjänster, portfölj och kontaktuppgifter.`,
        canonical: url,
        ogType: 'profile',
      })

      const schema: any = {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        '@id': url,
        name,
        url,
        description: agency.bio || `${name} – byrå på Updro.`,
        areaServed: profile.city || 'Sverige',
        address: profile.city
          ? { '@type': 'PostalAddress', addressLocality: profile.city, addressCountry: 'SE' }
          : undefined,
        image: agency.logo_url || undefined,
        sameAs: agency.website_url ? [agency.website_url] : undefined,
      }
      if (agency.review_count > 0 && agency.avg_rating > 0) {
        schema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: Number(agency.avg_rating).toFixed(1),
          reviewCount: agency.review_count,
          bestRating: 5,
          worstRating: 1,
        }
      }
      setJsonLd('agency-jsonld', schema)
    }
  }, [agency, profile, slug])

  if (!agency) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></main>
      <Footer />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Cover */}
        <div className="h-48 md:h-60 bg-hero-gradient" />

        <div className="container -mt-12 mb-16">
          {/* Header */}
          <div className="flex items-end gap-4 mb-6">
            <div className="h-24 w-24 rounded-full bg-card border-4 border-card shadow-lg flex items-center justify-center text-3xl font-bold text-primary overflow-hidden">
              {agency.logo_url ? (
                <img src={agency.logo_url} alt={profile?.company_name || 'Logo'} className="h-full w-full object-contain" />
              ) : (
                (profile?.company_name || profile?.full_name || '?')[0]
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold">{profile?.company_name || profile?.full_name}</h1>
                {agency.is_verified && <CheckCircle className="h-5 w-5 text-primary" />}
              </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile?.city || 'Sverige'}</span>
                </div>
                <div className="mt-2">
                  <RatingDisplay avgRating={agency.avg_rating || 0} reviewCount={agency.review_count || 0} size="md" />
                </div>
                <VerificationChecklist
                  isVerified={agency.is_verified}
                  hasFskatt={agency.has_fskatt}
                  creditCheckPassed={agency.credit_check_passed}
                  completedProjects={agency.completed_projects}
                />
            </div>
            <div className="flex gap-2">
              <Link to={`/publicera?kategori=${(agency.categories || [])[0] || ''}`}>
                <Button className="bg-accent hover:bg-brand-mint-hover text-accent-foreground rounded-xl">
                  Skicka förfrågan <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              {agency.website_url && (
                <a href={agency.website_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="rounded-xl"><Globe className="mr-1 h-4 w-4" /> Hemsida</Button>
                </a>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(agency.categories || []).map((cat: string) => (
              <span key={cat} className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_STYLES[cat] || ''}`}>{cat}</span>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Översikt</TabsTrigger>
              <TabsTrigger value="reviews">Omdömen ({reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              {agency.bio && (
                <div className="bg-card rounded-xl border p-5 mb-6">
                  <h3 className="font-semibold mb-2">Om byrån</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{agency.bio}</p>
                </div>
              )}
              {(agency.services || []).length > 0 && (
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-2">Tjänster</h3>
                  <div className="flex flex-wrap gap-2">
                    {agency.services.map((s: string) => (
                      <span key={s} className="bg-muted rounded-full px-3 py-1 text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Inga omdömen ännu.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-card rounded-xl border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                      </div>
                      {r.comment && <p className="text-sm">{r.comment}</p>}
                      <p className="text-xs text-muted-foreground mt-2">– {r.profiles?.company_name || r.profiles?.full_name || 'Anonym'}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AgencyProfilePage
