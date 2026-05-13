import { Link } from 'react-router-dom'
import Logo from '@/components/Logo'

declare const __BUILD_TIMESTAMP__: string
const BUILD_ID = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev'

const footerColumns = [
  {
    title: 'För kunder',
    links: [
      { label: 'Starta förfrågan', href: '/publicera' },
      { label: 'Hemsida pris-kalkylator', href: '/hemsida-pris-kalkylator' },
      { label: 'Hitta webbyrå', href: '/hitta-webbyra' },
      { label: 'Hitta SEO-byrå', href: '/hitta-seo-byra' },
      { label: 'Hitta digital byrå', href: '/hitta-digital-byra' },
      { label: 'Hur det fungerar', href: '/#hur-det-fungerar' },
    ],
  },
  {
    title: 'För byråer',
    links: [
      { label: 'Registrera din byrå', href: '/registrera/byra' },
      { label: 'Byrå-dashboard', href: '/dashboard/supplier' },
      { label: 'Priser', href: '/priser' },
      { label: 'Få leads från Updro', href: '/landing/byra' },
    ],
  },
  {
    title: 'SEO & jämförelser',
    links: [
      { label: 'Partna alternativ', href: '/partna-alternativ' },
      { label: 'Bästa webbyrån', href: '/basta-webbyran' },
      { label: 'Bästa SEO-byrån', href: '/basta-seo-byran' },
      { label: 'Webbutveckling pris', href: '/webbutveckling/pris' },
      { label: 'SEO pris', href: '/seo/pris' },
      { label: 'Artiklar', href: '/artiklar' },
    ],
  },
  {
    title: 'Om & legal',
    links: [
      { label: 'Om Updro', href: '/om-oss' },
      { label: 'Vår metod', href: '/metod' },
      { label: 'Redaktionell policy', href: '/redaktionell-policy' },
      { label: 'Användarvillkor', href: '/villkor' },
      { label: 'Integritetspolicy', href: '/integritetspolicy' },
      { label: 'Cookiepolicy', href: '/cookies' },
    ],
  },
]

const cityLinks = [
  { label: 'Stockholm', href: '/byraer/stockholm' },
  { label: 'Göteborg', href: '/byraer/goteborg' },
  { label: 'Malmö', href: '/byraer/malmo' },
  { label: 'Uppsala', href: '/byraer/uppsala' },
  { label: 'Linköping', href: '/byraer/linkoping' },
  { label: 'Västerås', href: '/byraer/vasteras' },
  { label: 'Örebro', href: '/byraer/orebro' },
  { label: 'Norrköping', href: '/byraer/norrkoping' },
  { label: 'Helsingborg', href: '/byraer/helsingborg' },
  { label: 'Jönköping', href: '/byraer/jonkoping' },
  { label: 'Umeå', href: '/byraer/umea' },
  { label: 'Lund', href: '/byraer/lund' },
  { label: 'Gävle', href: '/byraer/gavle' },
  { label: 'Sundsvall', href: '/byraer/sundsvall' },
  { label: 'Eskilstuna', href: '/byraer/eskilstuna' },
  { label: 'Halmstad', href: '/byraer/halmstad' },
  { label: 'Karlstad', href: '/byraer/karlstad' },
  { label: 'Växjö', href: '/byraer/vaxjo' },
  { label: 'Södertälje', href: '/byraer/sodertalje' },
  { label: 'Luleå', href: '/byraer/lulea' },
  { label: 'Borås', href: '/byraer/boras' },
  { label: 'Kristianstad', href: '/byraer/kristianstad' },
  { label: 'Solna', href: '/byraer/solna' },
  { label: 'Skellefteå', href: '/byraer/skelleftea' },
  { label: 'Kalmar', href: '/byraer/kalmar' },
]

const popularCombos = [
  { label: 'Webbyrå Stockholm', href: '/webbyra-stockholm' },
  { label: 'Webbyrå Göteborg', href: '/webbyra-goteborg' },
  { label: 'Webbyrå Malmö', href: '/webbyra-malmo' },
  { label: 'SEO-byrå Stockholm', href: '/seo-byra-stockholm' },
  { label: 'SEO-byrå Göteborg', href: '/seo-byra-goteborg' },
  { label: 'SEO-byrå Malmö', href: '/seo-byra-malmo' },
  { label: 'E-handel Malmö', href: '/byraer/malmo/ehandel' },
  { label: 'Webbyrå Linköping', href: '/byraer/linkoping/webbutveckling' },
  { label: 'Google Ads Uppsala', href: '/byraer/uppsala/google-ads' },
  { label: 'Apputveckling Stockholm', href: '/byraer/stockholm/apputveckling' },
  { label: 'Designbyrå Göteborg', href: '/byraer/goteborg/grafisk-design' },
  { label: 'SEO-byrå Jönköping', href: '/byraer/jonkoping/seo' },
]

const Footer = () => {
  return (
    <footer className="bg-foreground text-background" role="contentinfo">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          <div>
            <Logo size="md" className="[&_span]:text-background" />
            <p className="mt-3 text-sm text-background/60">
              Sveriges marknadsplats för digitala uppdrag
            </p>
            <p className="mt-4 text-xs text-background/50">
              © {new Date().getFullYear()} Updro – Aurora Media AB
            </p>
            <p className="text-xs text-background/50">Org.nr 559272-0220</p>
            <p className="text-xs text-background/50">info@auroramedia.se</p>
          </div>

          {footerColumns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h4 className="font-display text-base mb-4 text-background">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    {link.href.includes('#') ? (
                      <a href={link.href} className="text-sm text-background/60 hover:text-background transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="text-sm text-background/60 hover:text-background transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* City row */}
        <div className="border-t border-background/10 mt-12 pt-8">
          <p className="text-sm text-background/60 flex flex-wrap items-center gap-x-2 gap-y-2">
            <span className="text-background/50">Byråer i:</span>
            {cityLinks.map((c, i) => (
              <span key={c.href} className="flex items-center gap-2">
                <Link to={c.href} className="hover:text-background transition-colors">
                  {c.label}
                </Link>
                {i < cityLinks.length - 1 && <span className="text-background/30">·</span>}
              </span>
            ))}
            <span className="text-background/30">·</span>
            <Link to="/stader" className="hover:text-background transition-colors">
              Se alla städer
            </Link>
          </p>
        </div>

        {/* Popular combos */}
        <div className="border-t border-background/10 mt-8 pt-8">
          <h4 className="font-display text-sm mb-3 text-background/80">Populära sökningar</h4>
          <p className="text-sm text-background/60 flex flex-wrap items-center gap-x-2 gap-y-2">
            {popularCombos.map((c, i) => (
              <span key={c.href} className="flex items-center gap-2">
                <Link to={c.href} className="hover:text-background transition-colors">{c.label}</Link>
                {i < popularCombos.length - 1 && <span className="text-background/30">·</span>}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="mt-8 border-t border-background/10 pt-4 pb-4 text-center">
        <span className="text-[10px] text-background/40 select-all" title="Build ID">v {BUILD_ID}</span>
      </div>
    </footer>
  )
}

export default Footer
