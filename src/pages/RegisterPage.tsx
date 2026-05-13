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
import { Building2, User } from 'lucide-react'

import { setSEOMeta } from '@/lib/seoHelpers'

const RegisterPage = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    acceptedTerms: false,
    newsletter: false,
  })

  useEffect(() => {
    setSEOMeta({
      title: 'Registrera dig – Skapa gratis konto | Updro',
      description: 'Skapa ett gratis konto på Updro och börja publicera uppdrag eller registrera din byrå.',
      canonical: 'https://updro.se/registrera',
      noindex: true,
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.acceptedTerms) {
      toast.error('Du måste godkänna villkoren.')
      return
    }
    setLoading(true)
    const { error } = await signUp({
      email: form.email,
      password: form.password,
      role: 'buyer',
      full_name: form.full_name,
    })
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Något gick fel.')
    } else {
      toast.success('Konto skapat! Kolla din inkorg (och skräpposten) för att bekräfta din e-post.', {
        duration: 8000,
      })
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold">Skapa konto</h1>
            <p className="text-muted-foreground mt-2">Välj kontotyp</p>
          </div>

          {/* Role selection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-card rounded-2xl border-2 border-brand-blue p-5 text-center">
              <User className="h-8 w-8 mx-auto mb-2 text-brand-blue" />
              <h3 className="font-display font-semibold text-sm">Beställare</h3>
              <p className="text-xs text-muted-foreground mt-1">Publicera uppdrag gratis</p>
            </div>
            <Link to="/registrera/byra" className="bg-card rounded-2xl border p-5 text-center hover:border-brand-blue transition-colors">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h3 className="font-display font-semibold text-sm">Byrå</h3>
              <p className="text-xs text-muted-foreground mt-1">Fem gratis leads</p>
            </Link>
          </div>

          <div className="bg-card rounded-2xl border p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Namn *</Label>
                <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="rounded-xl mt-1" required />
              </div>
              <div>
                <Label>E-post *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="rounded-xl mt-1" required />
              </div>
              <div>
                <Label>Lösenord *</Label>
                <Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="rounded-xl mt-1" minLength={6} required />
              </div>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="buyer-terms"
                  checked={form.acceptedTerms}
                  onCheckedChange={(v) => setForm(p => ({ ...p, acceptedTerms: v === true }))}
                />
                <label htmlFor="buyer-terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                  Jag godkänner <Link to="/villkor" className="text-brand-blue hover:underline">villkoren</Link> och{' '}
                  <Link to="/integritetspolicy" className="text-brand-blue hover:underline">integritetspolicyn</Link> *
                </label>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="buyer-newsletter"
                  checked={form.newsletter}
                  onCheckedChange={(v) => setForm(p => ({ ...p, newsletter: v === true }))}
                />
                <label htmlFor="buyer-newsletter" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                  Ja, jag vill ta emot nyheter och tips via e-post
                </label>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-brand-blue hover:bg-brand-blue-hover text-primary-foreground rounded-xl py-5">
                {loading ? 'Skapar konto...' : 'Skapa beställarkonto'}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Har du konto?{' '}
            <Link to="/logga-in" className="text-brand-blue hover:underline font-medium">Logga in</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default RegisterPage
