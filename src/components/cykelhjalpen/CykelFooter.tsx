import { Link } from 'react-router-dom'
import CykelLogo from './CykelLogo'

const homeSectionLink = '/#sa-fungerar-det'
const requestLink = '/skicka-arende?stad=Link%C3%B6ping'

const CykelFooter = () => (
  <footer className="border-t border-border bg-muted/30 mt-24">
    <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
      <div className="col-span-2 md:col-span-1">
        <CykelLogo />
        <p className="mt-3 text-sm text-muted-foreground max-w-xs">
          Jämför pris och tid från anslutna cykelverkstäder i Linköping. Gratis för dig som cyklist.
        </p>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">För cyklister</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to={requestLink} className="hover:text-primary">Skicka cykelärende</Link></li>
          <li><Link to={homeSectionLink} className="hover:text-primary">Så fungerar det</Link></li>
          <li><Link to="/cykelverkstad-linkoping" className="hover:text-primary">Cykelverkstad Linköping</Link></li>
          <li><Link to="/vad-kostar-cykelreparation-linkoping" className="hover:text-primary">Priser på cykelreparation</Link></li>
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">Vanliga tjänster</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/cykelservice-linkoping" className="hover:text-primary">Cykelservice</Link></li>
          <li><Link to="/punktering-linkoping" className="hover:text-primary">Punktering</Link></li>
          <li><Link to="/elcykel-reparation-linkoping" className="hover:text-primary">Elcykelreparation</Link></li>
          <li><Link to="/bromsservice-linkoping" className="hover:text-primary">Bromsservice</Link></li>
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">För verkstäder</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/for-cykelverkstader" className="hover:text-primary">Få fler lokala kunder</Link></li>
          <li><Link to="/registrera/verkstad" className="hover:text-primary">Registrera verkstaden</Link></li>
          <li><Link to="/logga-in" className="hover:text-primary">Logga in</Link></li>
          <li><a href="mailto:info@cykelhjalpen.se" className="hover:text-primary">Kontakta oss</a></li>
        </ul>
      </div>
    </div>

    <div className="border-t border-border">
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="text-center md:text-left">
          <p className="font-medium text-foreground/80">Cykelhjälpen · Aurora Media AB</p>
          <p>Säte: Linköping · <a href="mailto:info@cykelhjalpen.se" className="hover:text-primary">info@cykelhjalpen.se</a></p>
        </div>
        <div className="text-center md:text-right space-y-1">
          <p>© {new Date().getFullYear()} Cykelhjälpen. Alla rättigheter reserverade.</p>
          <p><Link to="/villkor" className="hover:text-primary">Villkor</Link> · <Link to="/integritetspolicy" className="hover:text-primary">Integritet</Link> · <Link to="/cookies" className="hover:text-primary">Cookies</Link></p>
        </div>
      </div>
    </div>
  </footer>
)

export default CykelFooter
