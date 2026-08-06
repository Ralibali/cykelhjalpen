import { Link } from 'react-router-dom'
import CykelLogo from './CykelLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { CYKEL_CITIES, cityLandingPath } from '@/lib/cykelCities'
import { useT } from '@/lib/i18n'

const CykelFooter = () => {
  const t = useT()
  return (
  <footer className="border-t border-border bg-muted/30 mt-24">
    <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
      <div className="col-span-2 md:col-span-1">
        <CykelLogo />
        <p className="mt-3 text-sm text-muted-foreground max-w-xs">
          {t('Jämför pris och tid från anslutna cykelverkstäder i Linköping, Norrköping, Uppsala och Lund.')}
        </p>
        <div className="mt-4"><LanguageSwitcher /></div>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">{t('Välj stad')}</h3>
        <ul className="space-y-2 text-sm">
          {CYKEL_CITIES.map((city) => (
            <li key={city.name}><Link to={cityLandingPath(city.name)} className="hover:text-primary">{t('Cykelverkstad {city}', { city: city.name })}</Link></li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">{t('För cyklister')}</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/skicka-arende" className="hover:text-primary">{t('Skicka cykelärende')}</Link></li>
          <li><Link to="/#sa-fungerar-det" className="hover:text-primary">{t('Så fungerar det')}</Link></li>
          <li><Link to="/vad-kostar-cykelreparation-linkoping" className="hover:text-primary">{t('Priser på cykelreparation')}</Link></li>
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">{t('För verkstäder')}</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/for-cykelverkstader" className="hover:text-primary">{t('Få fler lokala kunder')}</Link></li>
          <li><Link to="/registrera/verkstad" className="hover:text-primary">{t('Registrera verkstaden')}</Link></li>
          <li><Link to="/logga-in" className="hover:text-primary">{t('Logga in')}</Link></li>
          <li><a href="mailto:info@cykelhjalpen.se" className="hover:text-primary">{t('Kontakta oss')}</a></li>
        </ul>
      </div>
    </div>

    <div className="border-t border-border">
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="text-center md:text-left">
          <p className="font-medium text-foreground/80">Cykelhjälpen · Aurora Media AB</p>
          <p>{t('Säte: Linköping')} · <a href="mailto:info@cykelhjalpen.se" className="hover:text-primary">info@cykelhjalpen.se</a></p>
        </div>
        <div className="text-center md:text-right space-y-1">
          <p>{t('© {year} Cykelhjälpen. Alla rättigheter reserverade.', { year: new Date().getFullYear() })}</p>
          <p><Link to="/villkor" className="hover:text-primary">{t('Villkor')}</Link> · <Link to="/integritetspolicy" className="hover:text-primary">{t('Integritet')}</Link> · <Link to="/cookies" className="hover:text-primary">{t('Cookies')}</Link></p>
        </div>
      </div>
    </div>
  </footer>
  )
}

export default CykelFooter
