import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { toast } from 'sonner'
import { Mail, KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import { setSEOMeta } from '@/lib/seoHelpers'
import { getCurrentHost } from '@/lib/hostConfig'
import { useT, useLanguage, localizedHref } from '@/lib/i18n'

const ForgotPasswordPage = () => {
  const t = useT()
  const { lang } = useLanguage()
  const host = getCurrentHost()
  const isCykel = host === 'cykelhjalpen'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const copy = useMemo(() => ({
    title: t('Glömt lösenord | Cykelhjälpen'),
    description: t('Återställ lösenordet till ditt konto hos Cykelhjälpen.'),
  }), [t])

  useEffect(() => {
    setSEOMeta({
      title: copy.title,
      description: copy.description,
      canonical: 'https://cykelhjalpen.se/aterstall-losenord',
      noindex: true,
    })
  }, [copy])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      toast.error(t('Ange din e-postadress'))
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}${localizedHref('/nytt-losenord', lang)}`,
    })
    setLoading(false)

    if (error) {
      const message = /rate|429|limit/i.test(error.message)
        ? t('För många försök. Vänta en stund och prova igen.')
        : t('Kunde inte skicka återställningsmailet. Försök igen om en stund.')
      toast.error(message)
      return
    }

    setSent(true)
    toast.success(t('Vi har skickat ett mejl med en återställningslänk.'))
  }

  const Header = isCykel ? CykelNavbar : Navbar
  const PageFooter = isCykel ? CykelFooter : Footer

  return (
    <div className="min-h-screen flex flex-col bg-hero-gradient">
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center rounded-2xl bg-brand-sun p-3 sticker mb-4">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="font-display text-4xl">{t('Glömt lösenord')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('Ange din e-postadress så skickar vi en länk för att skapa ett nytt lösenord.')}
            </p>
          </div>

          <div className="bg-card rounded-3xl border-2 border-foreground p-7 sticker">
            {sent ? (
              <div className="text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
                <p className="font-medium">{t('Kolla din inkorg')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('Om det finns ett konto kopplat till {email} har vi skickat en återställningslänk. Länken gäller i en timme.', { email: email.trim().toLowerCase() })}
                </p>
                <Button variant="outline" className="rounded-full" onClick={() => setSent(false)} disabled={loading}>
                  {t('Skicka igen')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">{t('E-post')}</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
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

                <Button type="submit" disabled={loading} className="w-full rounded-full py-6 text-base shadow-brand cta-playful">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {loading ? t('Skickar…') : t('Skicka återställningslänk')}
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/logga-in" className="text-primary hover:underline font-medium">{t('Tillbaka till inloggning')}</Link>
          </p>
        </div>
      </main>
      <PageFooter />
    </div>
  )
}

export default ForgotPasswordPage
