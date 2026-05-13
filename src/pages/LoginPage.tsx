import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { toast } from 'sonner'
import { Mail, Lock } from 'lucide-react'
import { setSEOMeta } from '@/lib/seoHelpers'

const LoginPage = () => {
  const { signIn, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSEOMeta({
      title: 'Logga in | Updro',
      description: 'Logga in på ditt Updro-konto för att hantera uppdrag, offerter och meddelanden.',
      canonical: 'https://updro.se/logga-in',
      noindex: true,
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast.error('Kunde inte logga in. Kontrollera uppgifterna.')
    } else {
      toast.success('Inloggad!')
    }
  }

  useEffect(() => {
    if (profile) {
      if (profile.role === 'admin') navigate('/admin', { replace: true })
      else if (profile.role === 'supplier') navigate('/dashboard/supplier', { replace: true })
      else if (profile.role === 'buyer') navigate('/dashboard/buyer', { replace: true })
      else navigate('/', { replace: true })
    }
  }, [profile, navigate])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold">Logga in</h1>
            <p className="text-muted-foreground mt-2">Välkommen tillbaka till Updro</p>
          </div>

          <div className="bg-card rounded-2xl border p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-post</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 rounded-xl"
                    placeholder="din@email.se"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Lösenord</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 rounded-xl"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-blue hover:bg-brand-blue-hover text-primary-foreground rounded-xl py-5"
              >
                {loading ? 'Loggar in...' : 'Logga in'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <Link to="/aterstall-losenord" className="text-brand-blue hover:underline">
                Glömt lösenord?
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Inget konto?{' '}
            <Link to="/registrera" className="text-brand-blue hover:underline font-medium">
              Registrera dig
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default LoginPage
