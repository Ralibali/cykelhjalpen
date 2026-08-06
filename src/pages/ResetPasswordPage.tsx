import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { toast } from 'sonner'
import { Lock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { setSEOMeta } from '@/lib/seoHelpers'
import { getCurrentHost } from '@/lib/hostConfig'
import { useT } from '@/lib/i18n'
import { parseRecoveryLink, validateNewPassword } from '@/lib/authRecovery'

type Status = 'checking' | 'ready' | 'invalid' | 'done'

const ResetPasswordPage = () => {
  const t = useT()
  const navigate = useNavigate()
  const host = getCurrentHost()
  const isCykel = host === 'cykelhjalpen'
  const [status, setStatus] = useState<Status>('checking')
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)

  const copy = useMemo(() => ({
    title: t('Skapa nytt lösenord | Cykelhjälpen'),
    description: t('Välj ett nytt lösenord till ditt konto hos Cykelhjälpen.'),
  }), [t])

  useEffect(() => {
    setSEOMeta({
      title: copy.title,
      description: copy.description,
      canonical: 'https://cykelhjalpen.se/nytt-losenord',
      noindex: true,
    })
  }, [copy])

  useEffect(() => {
    let active = true

    const link = parseRecoveryLink(window.location.hash, window.location.search)
    if (link.kind !== 'ok') {
      setLinkError(t(link.message))
      setStatus('invalid')
      return
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || session) setStatus('ready')
    })

    const verify = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return
        if (error) {
          setLinkError(t('Länken är ogiltig eller redan använd. Begär en ny återställningslänk.'))
          setStatus('invalid')
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return
      if (data.session) {
        setStatus('ready')
      } else {
        setLinkError(t('Länken är ogiltig eller har gått ut. Begär en ny återställningslänk.'))
        setStatus('invalid')
      }
    }

    // Ge Supabase-klienten en tick att läsa in token från URL:en.
    const timer = window.setTimeout(verify, 400)

    return () => {
      active = false
      window.clearTimeout(timer)
      sub.subscription.unsubscribe()
    }
  }, [t])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return

    const validationError = validateNewPassword(password, confirmation)
    if (validationError) {
      toast.error(t(validationError))
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      const message = /session|jwt|expired/i.test(error.message)
        ? t('Länken har gått ut. Begär en ny återställningslänk.')
        : t('Kunde inte uppdatera lösenordet. Försök igen.')
      toast.error(message)
      return
    }

    setStatus('done')
    toast.success(t('Lösenordet är uppdaterat.'))
    window.setTimeout(() => navigate('/logga-in', { replace: true }), 2500)
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
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="font-display text-4xl">{t('Skapa nytt lösenord')}</h1>
          </div>

          <div className="bg-card rounded-3xl border-2 border-foreground p-7 sticker">
            {status === 'checking' && (
              <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {t('Kontrollerar länken…')}
              </p>
            )}

            {status === 'invalid' && (
              <div className="text-center space-y-3">
                <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
                <p className="text-sm text-muted-foreground">{linkError}</p>
                <Button asChild className="rounded-full">
                  <Link to="/aterstall-losenord">{t('Begär ny länk')}</Link>
                </Button>
              </div>
            )}

            {status === 'done' && (
              <div className="text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
                <p className="font-medium">{t('Lösenordet är uppdaterat.')}</p>
                <p className="text-sm text-muted-foreground">{t('Du skickas vidare till inloggningen.')}</p>
                <Button asChild className="rounded-full">
                  <Link to="/logga-in">{t('Logga in')}</Link>
                </Button>
              </div>
            )}

            {status === 'ready' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="new-password">{t('Nytt lösenord')}</Label>
                  <PasswordInput
                    id="new-password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    wrapperClassName="mt-1"
                    className="rounded-xl"
                    placeholder="••••••••"
                    showLabel={t('Visa lösenord')}
                    hideLabel={t('Dölj lösenord')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('Minst åtta tecken.')}</p>
                </div>

                <div>
                  <Label htmlFor="confirm-password">{t('Bekräfta lösenord')}</Label>
                  <PasswordInput
                    id="confirm-password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    wrapperClassName="mt-1"
                    className="rounded-xl"
                    placeholder="••••••••"
                    showLabel={t('Visa lösenord')}
                    hideLabel={t('Dölj lösenord')}
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full rounded-full py-6 text-base shadow-brand cta-playful">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {saving ? t('Sparar…') : t('Spara nytt lösenord')}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <PageFooter />
    </div>
  )
}

export default ResetPasswordPage
