import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Wrench, Loader2 } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Helmet } from 'react-helmet-async'

const SERVICES = ['Punktering', 'Bromsservice', 'Växelservice', 'Komplett service', 'Elcykelservice', 'Hjulbygge', 'Mobil reparation']

const RegisterWorkshopPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    company_name: '', email: '', password: '', phone: '', address: '', website: '', notes: '',
    services: [] as string[],
  })

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const toggleService = (s: string) =>
    update('services', form.services.includes(s) ? form.services.filter((x) => x !== s) : [...form.services, s])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) return toast.error('Lösenord minst åtta tecken')
    setLoading(true)
    try {
      const { data: signUp, error: signErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/verkstad`,
          data: { full_name: form.company_name, role: 'supplier' },
        },
      })
      if (signErr) throw signErr
      const userId = signUp.user?.id
      if (!userId) throw new Error('Något gick fel vid registreringen')

      // Create profile (supplier role piggyback for auth gating)
      await supabase.from('profiles').upsert({
        id: userId,
        role: 'supplier',
        full_name: form.company_name,
        email: form.email,
        company_name: form.company_name,
        city: 'Linköping',
        phone: form.phone || null,
      })

      // Create workshop row (approved=false)
      const { error: wErr } = await supabase.from('workshops').insert({
        user_id: userId,
        company_name: form.company_name,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        website: form.website || null,
        services: form.services,
        city: 'Linköping',
      })
      if (wErr) throw wErr

      toast.success('Tack! Vi granskar din ansökan och hör av oss inom ett dygn.')
      navigate('/dashboard/verkstad')
    } catch (e: any) {
      toast.error(e.message || 'Registreringen misslyckades')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Anslut din cykelverkstad — Linköping | Cykelhjälpen</title>
        <meta name="description" content="Få fler kunder till din cykelverkstad i Linköping. Registrera dig gratis och betala bara för svaren du faktiskt skickar — femtio kronor per offert." />
        <link rel="canonical" href="/registrera/verkstad" />
      </Helmet>
      <CykelNavbar />
      <main className="container mx-auto px-4 py-12 max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="sticker bg-accent p-2"><Wrench className="h-5 w-5 text-accent-foreground" /></div>
          <h1 className="font-display text-3xl font-bold">Anslut din verkstad</h1>
        </div>
        <p className="text-muted-foreground mb-8">Gratis att gå med. Du betalar bara femtio kronor per offert du skickar.</p>

        <form onSubmit={submit} className="sticker bg-card p-6 space-y-4">
          <div>
            <Label htmlFor="cn">Verkstadens namn</Label>
            <Input id="cn" required value={form.company_name} onChange={(e) => update('company_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="em">E-post (inloggning)</Label>
              <Input id="em" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pw">Lösenord</Label>
              <Input id="pw" type="password" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ph">Telefon</Label>
              <Input id="ph" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ws">Webbplats</Label>
              <Input id="ws" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
            </div>
          </div>
          <div>
            <Label htmlFor="ad">Adress i Linköping</Label>
            <Input id="ad" value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
          <div>
            <Label>Tjänster ni erbjuder</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`px-3 py-1 rounded-full border-2 border-foreground text-sm ${form.services.includes(s) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Skicka ansökan
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Har du redan ett konto? <Link to="/logga-in" className="underline">Logga in</Link>
          </p>
        </form>
      </main>
      <CykelFooter />
    </div>
  )
}

export default RegisterWorkshopPage
