import { Link } from 'react-router-dom'
import CykelLogo from './CykelLogo'

const homeSectionLink = '/#sa-fungerar-det'

const CykelFooter = () => (
  <footer className="border-t border-border bg-muted/30 mt-24">
    <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
      <div className="col-span-2 md:col-span-1">
        <CykelLogo />
        <p className="mt-3 text-sm text-muted-foreground max-w-xs">
          Lokal leadplattform för cykelreparation i Linköping.
        </p>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">För cyklister</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/skicka-arende" className="hover:text-primary">Skicka cykelärende</Link></li>
          <li><Link to="/cykelverkstad-linkoping" className="hover:text-primary">Cykelverkstäder Linköping</Link></li>
          <li><Link to={homeSectionLink} className="hover:text-primary">Så fungerar det</Link></li>
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">För verkstäder</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/for-cykelverkstader" className="hover:text-primary">Anslut din verkstad</Link></li>
          <li><Link to="/registrera/verkstad" className="hover:text-primary">Registrera</Link></li>
          <li><Link to="/logga-in" className="hover:text-primary">Logga in</Link></li>
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold mb-3">Information</h3>
        <ul className="space-y-2 text-sm">
          <li><Link to="/villkor" className="hover:text-primary">Allmänna villkor</Link></li>
          <li><Link to="/integritetspolicy" className="hover:text-primary">Integritetspolicy</Link></li>
          <li><Link to="/cookies" className="hover:text-primary">Cookies</Link></li>
        </ul>
      </div>
    </div>

    <div className="border-t border-border">
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="text-center md:text-left">
          <p className="font-medium text-foreground/80">Cykelhjälpen</p>
          <p>Säte: Linköping · <a href="mailto:info@auroramedia.se" className="hover:text-primary">info@auroramedia.se</a></p>
        </div>
        <p>© {new Date().getFullYear()} Cykelhjälpen. Alla rättigheter reserverade.</p>
      </div>
    </div>
  </footer>
)

export default CykelFooter
