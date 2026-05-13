import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { toast } from 'sonner'
import { CATEGORIES, CATEGORY_ICONS, TRIAL_LEADS, TRIAL_DAYS } from '@/lib/constants'
import { Check, Gift, Shield, MessageCircle, CreditCard, Star, ArrowRight } from 'lucide-react'
import { setSEOMeta } from '@/lib/seoHelpers'

const RegisterSupplierPage = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    company_name: '',
    full_name: '',
    email: '',
    password: '',
    phone: '',
    org_number: '',
    categories: [] as string[],
    accepted: false,
    newsletter: false,
  })

  useEffect(() => {
    setSEOMeta({
      title: 'Registrera din byrå – Få fler kunder gratis | Updro',
      description: 'Registrera din byrå på Updro och få fem gratis leads. Kvalificerade uppdrag, ingen bindningstid.',
      canonical: 'https://updro.se/registrera/byra',
      noindex: true,
    })
  }, [])

  const toggleCategory = (cat: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.accepted) {
      toast.error('Du måste godkänna villkoren.')
      return
    }
    if (form.categories.length === 0) {
      toast.error('Välj minst en kategori.')
      return
    }

    setLoading(true)
    const { error } = await signUp({
      email: form.email,
      password: form.password,
      role: 'supplier',
      full_name: form.full_name,
      company_name: form.company_name,
      phone: form.phone || undefined,
      categories: form.categories,
      org_number: form.org_number || undefined,
    })
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Något gick fel vid registrering.')
    } else {
      toast.success('Konto skapat! Kolla din inkorg (och skräpposten) för att bekräfta din e-post.', {
        duration: 8000,
      })
      navigate('/')
    }
  }

  const benefits = [
    { icon: Gift, text: `${TRIAL_LEADS} gratis lead-krediter (värde 1 495 kr)` },
    { icon: Shield, text: `${TRIAL_DAYS} dagars fri provperiod` },
    { icon: MessageCircle, text: 'Inbyggd chatt med beställare' },
    { icon: CreditCard, text: 'Inget kreditkort krävs' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="grid lg:grid-cols-2 min-h-[calc(100vh-4rem)]">
          {/* Left - Campaign */}
          <div
            className="relative p-8 lg:p-16 flex flex-col justify-center text-white overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, hsl(245 62% 38%), hsl(245 58% 48%), hsl(260 50% 42%))',
            }}
          >
            {/* Subtle radial accent */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 blur-3xl -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 blur-3xl translate-y-1/3 -translate-x-1/4" />

            <div className="relative z-10">
              <span className="text-5xl mb-6 block">🎁</span>
              <h2 className="font-display text-3xl lg:text-4xl font-bold mb-2">
                Prova Updro gratis
              </h2>
              <p className="text-white/70 mb-8 text-lg">
                Vad du får direkt:
              </p>

              <div className="space-y-4 mb-10">
                {benefits.map((b) => (
                  <div key={b.text} className="flex items-center gap-3">
                    <div className="rounded-lg bg-white/10 p-2">
                      <b.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white/90">{b.text}</span>
                  </div>
                ))}
              </div>

              {/* Testimonial */}
              <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/15">
                <div className="flex gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-white/90 italic mb-3">
                  "Vi fick vår första kund via Updro redan dag 3. Äntligen en plattform där beställarna faktiskt svarar!"
                </p>
                <p className="text-xs text-white/50">
                  — Fredrik L., VD på Webbninja AB
                </p>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className="p-8 lg:p-16 flex items-center">
            <div className="w-full max-w-lg mx-auto">
              <h2 className="font-display text-2xl font-bold mb-6">Skapa byråkonto</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Byrånamn *</Label>
                    <Input
                      value={form.company_name}
                      onChange={(e) => setForm(prev => ({ ...prev, company_name: e.target.value }))}
                      className="rounded-xl mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label>Ditt namn *</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="rounded-xl mt-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>E-post *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="rounded-xl mt-1"
                    required
                  />
                </div>

                <div>
                  <Label>Lösenord *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    className="rounded-xl mt-1"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <Label>Telefon</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="rounded-xl mt-1"
                  />
                </div>

                <div>
                  <Label>Org-nummer</Label>
                  <Input
                    value={form.org_number}
                    onChange={(e) => setForm(prev => ({ ...prev, org_number: e.target.value }))}
                    placeholder="XXXXXX-XXXX"
                    className="rounded-xl mt-1"
                  />
                </div>

                {/* Category chips */}
                <div>
                  <Label>Kategorier (välj minst 1) *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                          form.categories.includes(cat)
                            ? 'bg-brand-blue text-primary-foreground border-brand-blue'
                            : 'bg-card text-foreground/70 border-border hover:border-brand-blue/50'
                        }`}
                      >
                        <span>{CATEGORY_ICONS[cat]}</span>
                        {cat}
                        {form.categories.includes(cat) && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <Checkbox
                    id="terms"
                    checked={form.accepted}
                    onCheckedChange={(v) => setForm(prev => ({ ...prev, accepted: v === true }))}
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                    Jag godkänner <Link to="/villkor" className="text-brand-blue hover:underline">villkoren</Link> och{' '}
                    <Link to="/integritetspolicy" className="text-brand-blue hover:underline">integritetspolicyn</Link> *
                  </label>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="newsletter"
                    checked={form.newsletter || false}
                    onCheckedChange={(v) => setForm(prev => ({ ...prev, newsletter: v === true }))}
                  />
                  <label htmlFor="newsletter" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                    Ja, jag vill ta emot nyheter och tips via e-post
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent hover:bg-brand-mint-hover text-accent-foreground rounded-xl py-6 text-base font-semibold transition-all active:scale-95"
                >
                  {loading ? 'Skapar konto...' : (
                    <>
                      Skapa konto & aktivera {TRIAL_LEADS} gratis leads
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-2">
                🔒 Säker registrering · Inga kortuppgifter · Avbryt när som helst
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default RegisterSupplierPage
