import { AlertTriangle, Info } from 'lucide-react'

interface QuoteDisclaimerProps {
  variant?: 'customer' | 'workshop'
}

export function QuoteDisclaimer({ variant = 'customer' }: QuoteDisclaimerProps) {
  if (variant === 'customer') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800 space-y-2">
            <p className="font-medium">Viktigt om offerten</p>
            <p>
              Priset ovan är ett <strong>uppskattat pris (estimat)</strong> baserat på den information 
              du lämnat. Slutpriset kan variera beroende på faktisk skada, dolda fel eller 
              nödvändiga reservdelar.
            </p>
            <p>
              Verkstaden är enligt svensk lag (Konsumenttjänstlagen 32 §) skyldig att informera dig 
              och be om ditt godkännande innan arbetet påbörjas eller utökas om slutpriset väsentligt 
              avviker från offerten.
            </p>
            <p className="text-xs text-amber-700 pt-1 border-t border-amber-200">
              Cykelhjälpen förmedlar endast kontakten och ansvarar inte för verkstadens arbete eller prissättning.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 space-y-2">
          <p className="font-medium">Påminnelse om prisinformation</p>
          <p>
            Kom ihåg att offerten är ett <strong>estimat</strong>. Du måste informera kunden och inhämta 
            godkännande om slutpriset väsentligt avviker från offerten (Konsumenttjänstlagen 32 §).
          </p>
          <ul className="list-disc ml-4 space-y-1 text-xs">
            <li>Ange alltid pris inklusive moms.</li>
            <li>Tydliggör vad som ingår och vad som kan tillkomma.</li>
            <li>Dokumentera eventuella tillägg skriftligt eller via e-post.</li>
            <li>Erbud kunden att avböja om priset blir väsentligt högre.</li>
          </ul>
          <p className="text-xs text-blue-700 pt-1 border-t border-blue-200">
            Vilseledande prisinformation kan leda till avstängning från plattformen.
          </p>
        </div>
      </div>
    </div>
  )
}
