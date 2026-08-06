import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Bike, ListChecks, Receipt, Settings, LogOut, Loader2, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelLogo from './CykelLogo'
import NotificationBell from '@/components/NotificationBell'
import { LowBalanceAlert } from '@/components/workshop/LowBalanceAlert'
import { CYKEL_CITIES, DEFAULT_CYKEL_CITY, isCykelCity, type CykelCityName } from '@/lib/cykelCities'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'

const PENDING_CITY_KEY = 'cykelhjalpen_pending_workshop_city'
const confirmedCityKey = (userId: string) => `cykelhjalpen_workshop_city_confirmed_${userId}`

export interface WorkshopContext {
  id: string
  company_name: string
  email: string
  phone: string | null
  address: string | null
  website: string | null
  city: string
  approved: boolean
  sms_notifications: boolean
  free_leads_remaining: number
  logo_url: string | null
  description: string | null
  opening_hours: string | null
  org_number: string | null
  founded_year: number | null
  facebook_url: string | null
  instagram_url: string | null
  price_info: string | null
  booking_url: string | null
  services: string[] | null
}

const WorkshopLayout = () => {
  const t = useT()
  const { user, loading: authLoading, signOut } = useAuth()
  const [workshop, setWorkshop] = useState<WorkshopContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsCityConfirmation, setNeedsCityConfirmation] = useState(false)
  const [cityChoice, setCityChoice] = useState<CykelCityName>(DEFAULT_CYKEL_CITY)
  const [savingCity, setSavingCity] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('workshops')
        .select('id, company_name, email, phone, address, website, city, approved, sms_notifications, free_leads_remaining, logo_url, description, opening_hours, org_number, founded_year, facebook_url, instagram_url, price_info, booking_url, services')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        toast.error(t('Kunde inte läsa verkstadsprofilen.'))
        setLoading(false)
        return
      }

      let nextWorkshop = data as WorkshopContext | null
      const pendingCity = localStorage.getItem(PENDING_CITY_KEY)
      const confirmationKey = confirmedCityKey(user.id)

      if (nextWorkshop && isCykelCity(pendingCity)) {
        const [{ error: workshopError }, { error: profileError }] = await Promise.all([
          supabase.from('workshops').update({ city: pendingCity }).eq('id', nextWorkshop.id),
          supabase.from('profiles').update({ city: pendingCity }).eq('id', user.id),
        ])

        if (!workshopError && !profileError) {
          nextWorkshop = { ...nextWorkshop, city: pendingCity }
          localStorage.removeItem(PENDING_CITY_KEY)
          localStorage.setItem(confirmationKey, '1')
        } else {
          console.error('Could not sync workshop city', workshopError || profileError)
          toast.error(t('Staden kunde inte sparas automatiskt. Bekräfta den innan du fortsätter.'))
        }
      }

      if (nextWorkshop) {
        const currentCity = isCykelCity(nextWorkshop.city) ? nextWorkshop.city : DEFAULT_CYKEL_CITY
        setCityChoice(currentCity)
        setNeedsCityConfirmation(localStorage.getItem(confirmationKey) !== '1')
      }

      setWorkshop(nextWorkshop)
      setLoading(false)
    }

    if (!authLoading && user) load()
  }, [user, authLoading])

  const confirmCity = async () => {
    if (!user || !workshop) return
    setSavingCity(true)
    const [{ error: workshopError }, { error: profileError }] = await Promise.all([
      supabase.from('workshops').update({ city: cityChoice }).eq('id', workshop.id),
      supabase.from('profiles').update({ city: cityChoice }).eq('id', user.id),
    ])
    setSavingCity(false)

    if (workshopError || profileError) {
      toast.error(workshopError?.message || profileError?.message || t('Kunde inte spara staden.'))
      return
    }

    setWorkshop({ ...workshop, city: cityChoice })
    localStorage.setItem(confirmedCityKey(user.id), '1')
    localStorage.removeItem(PENDING_CITY_KEY)
    setNeedsCityConfirmation(false)
    toast.success(t('Verkstaden är kopplad till {city}.', { city: cityChoice }))
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="sticker bg-card p-8 max-w-md text-center">
          <h1 className="font-display text-xl font-bold mb-2">{t('Inget verkstadskonto kopplat')}</h1>
          <p className="text-muted-foreground mb-4">{t('Registrera din verkstad för att komma igång.')}</p>
          <Button asChild><Link to="/registrera/verkstad">{t('Registrera verkstad')}</Link></Button>
        </div>
      </div>
    )
  }

  if (needsCityConfirmation) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <CykelLogo size="sm" />
            <Button variant="ghost" size="sm" onClick={() => signOut()}><LogOut className="h-4 w-4 mr-2" /> {t('Logga ut')}</Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-xl">
          <div className="sticker bg-card p-7 md:p-9">
            <MapPin className="h-8 w-8 text-primary mb-4" />
            <h1 className="font-display text-3xl font-bold">{t('Bekräfta verkstadens stad')}</h1>
            <p className="text-muted-foreground mt-3 mb-6">{t('Detta avgör vilka lokala cykelärenden {name} får se och notifieras om.', { name: workshop.company_name })}</p>
            <div className="grid grid-cols-2 gap-3">
              {CYKEL_CITIES.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => setCityChoice(city.name)}
                  aria-pressed={cityChoice === city.name}
                  className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 font-medium ${cityChoice === city.name ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground hover:bg-muted'}`}
                >
                  <MapPin className="h-4 w-4" /> {city.name}
                </button>
              ))}
            </div>
            <Button onClick={confirmCity} disabled={savingCity} className="w-full mt-6 h-12">
              {savingCity && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {savingCity ? t('Sparar…') : t('Fortsätt med {city}', { city: cityChoice })}
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const disabledNavCls = workshop.approved ? '' : 'pointer-events-none opacity-50'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <CykelLogo size="sm" />
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:inline text-muted-foreground">{workshop.company_name}</span>
            <span className="hidden md:inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{workshop.city}</span>
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={() => signOut()} aria-label={t('Logga ut')}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      {!workshop.approved && (
        <div className="bg-brand-sun/40 border-b border-foreground/10 text-sm">
          <div className="container mx-auto px-4 py-3 flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{t('Ditt konto i {city} väntar på godkännande. Du kan inte se ärenden eller skicka offerter än.', { city: workshop.city })}</span>
          </div>
        </div>
      )}

      {workshop.approved && <LowBalanceAlert />}

      <div className="container mx-auto px-4 py-6 md:py-8 grid md:grid-cols-[230px_1fr] gap-6 md:gap-8">
        <aside className="overflow-x-auto">
          <nav className="flex md:block gap-2 md:space-y-2 text-sm min-w-max md:min-w-0 md:sticky md:top-24 md:rounded-3xl md:border-2 md:border-foreground md:bg-card md:p-3 md:shadow-[4px_4px_0_hsl(var(--ink))]">
            <NavItem to="/dashboard/verkstad" end icon={<Bike className="h-4 w-4" />} className={disabledNavCls}>{t('Översikt')}</NavItem>
            <NavItem to="/dashboard/verkstad/arenden" icon={<ListChecks className="h-4 w-4" />} className={disabledNavCls}>{t('Ärenden')}</NavItem>
            <NavItem to="/dashboard/verkstad/betalningar" icon={<Receipt className="h-4 w-4" />} className={disabledNavCls}>{t('Betalningar')}</NavItem>
            <NavItem to="/dashboard/verkstad/installningar" icon={<Settings className="h-4 w-4" />} className={disabledNavCls}>{t('Inställningar')}</NavItem>
          </nav>
        </aside>
        <main>
          {workshop.approved ? (
            <Outlet context={{ workshop }} />
          ) : (
            <div className="sticker bg-card p-8 max-w-xl">
              <Clock className="h-8 w-8 text-primary mb-4" />
              <h1 className="font-display text-2xl font-bold mb-3">{t('Väntar på godkännande')}</h1>
              <p className="text-muted-foreground mb-2">{t('Tack för att du registrerat')} <strong>{workshop.company_name}</strong> {t('i {city}. Vi granskar verkstaden manuellt för att hålla nätverket tryggt.', { city: workshop.city })}</p>
              <p className="text-muted-foreground">{t('Vi mejlar dig när kontot aktiverats. Då får du tillgång till lokala ärenden, offerter och betalningar.')}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const NavItem = ({ to, end, icon, children, className = '' }: any) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-2.5 px-4 py-2.5 rounded-2xl whitespace-nowrap font-medium transition-all ${
        isActive
          ? 'bg-primary text-primary-foreground border-2 border-foreground shadow-[3px_3px_0_hsl(var(--ink))]'
          : 'border-2 border-transparent hover:bg-muted'
      } ${className}`
    }
  >
    {icon} {children}
  </NavLink>
)

export default WorkshopLayout
