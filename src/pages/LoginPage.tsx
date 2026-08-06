import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { toast } from 'sonner'
import { Mail, Lock } from 'lucide-react'
import { setSEOMeta } from '@/lib/seoHelpers'
import { getCurrentHost } from '@/lib/hostConfig'
import { useT } from '@/lib/i18n'

const LoginPage = () => {
  const t = useT()
  const { signIn, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const host = getCurrentHost()
  const isCykel = host === 'cykelhjalpen'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const copy = useMemo(() => ({
    title: t('Logga in | Cykelhjälpen'),
    description: t('Logga in på din verkstadssida hos Cykelhjälpen.'),
    canonical: 'https://cykelhjalpen.se/logga-in',
    welcome: t('Välkommen tillbaka till Cykelhjälpen'),
  }), [t])

  useEffect(() => {
    setSEOMeta({
      title: copy.title,
      description: copy.description,
      canonical: copy.canonical,
      noindex: true,
    })
  }, [copy])

  useEffect(() => {
    if (searchParams.get('registrerad') === 'verkstad') {
      toast.success(t('Kontot är skapat. Bekräfta e-postadressen och logga sedan in.'))
    }
  }, [searchParams])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)

    if (error) {
      toast.error(t('Kunde inte logga in. Kontrollera e-post, lösenord och att kontot är bekräftat.'))
    } else {
      toast.success(t('Inloggad!'))
    }
  }

  useEffect(() => {
    if (!profile) return

    if (profile.role === 'admin') {
      navigate('/admin', { replace: true })
      return
    }

    if (isCykel) {
      if (profile.role === 'supplier') navigate('/dashboard/verkstad', { replace: true })
      else navigate('/', { replace: true })
      return
    }

    if (profile.role === 'supplier') navigate('/dashboard/supplier', { replace: true })
    else if (profile.role === 'buyer') navigate('/dashboard/buyer', { replace: true })
    else navigate('/', { replace: true })
  }, [profile, navigate, isCykel])

  const Header = isCykel ? CykelNavbar : Navbar
  const PageFooter = isCykel ? CykelFooter : Footer

  return (
    <div className="min-h-screen flex flex-col bg-hero-gradient">
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center rounded-2xl bg-brand-sun p-3 sticker mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="font-display text-4xl">{t('Logga in')}</h1>
            <p className="text-muted-foreground mt-2">{copy.welcome}</p>
          </div>

          <div className="bg-card rounded-3xl border-2 border-foreground p-7 sticker">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">{t('E-post')}</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-10 rounded-xl"
                    placeholder={t('din@epost.se')}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">{t('Lösenord')}</Label>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  wrapperClassName="mt-1"
                  className="rounded-xl"
                  placeholder="••••••••"
                  required
                  leftIcon={<Lock className="h-4 w-4" />}
                  showLabel={t('Visa lösenord')}
                  hideLabel={t('Dölj lösenord')}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full rounded-full py-6 text-base shadow-brand cta-playful">
                {loading ? t('Loggar in…') : t('Logga in')}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <Link to="/aterstall-losenord" className="text-primary hover:underline">
                {t('Glömt lösenord?')}
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('Inget konto?')}{' '}
            <Link to={isCykel ? '/registrera/verkstad' : '/registrera'} className="text-primary hover:underline font-medium">
              {isCykel ? t('Registrera din verkstad') : t('Registrera dig')}
            </Link>
          </p>
        </div>
      </main>
      <PageFooter />
    </div>
  )
}

export default LoginPage
