import { AlertTriangle, Info } from 'lucide-react'
import { useT } from '@/lib/i18n'

interface QuoteDisclaimerProps {
  variant?: 'customer' | 'workshop'
}

export function QuoteDisclaimer({ variant = 'customer' }: QuoteDisclaimerProps) {
  const t = useT()
  if (variant === 'customer') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800 space-y-2">
            <p className="font-medium">{t('Offerten gäller det problem du beskrivit')}</p>
            <p>
              {t('Stämmer din beskrivning ska verkstaden hålla priset. Om felet visar sig vara något annat, eller mer omfattande än vad du beskrivit, får verkstaden justera priset – men då ska du alltid informeras och ge ditt godkännande innan arbetet påbörjas eller utökas (Konsumenttjänstlagen 32 §).')}
            </p>
            <p>
              {t('Beskriv därför felet så noggrant du kan redan i din förfrågan. En tydlig beskrivning ger ett pris du kan lita på.')}
            </p>
            <p className="text-xs text-amber-700 pt-1 border-t border-amber-200">
              {t('Cykelhjälpen förmedlar endast kontakten och är inte part i avtalet. Vi ansvarar inte för offerter, priser, verkstadens arbete eller eventuella skador.')}
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
          <p className="font-medium">{t('Din offert ska gälla det problem kunden beskrivit')}</p>
          <p>
            {t('Stämmer kundens beskrivning förväntas du hålla priset. Visar felet sig vara något annat eller mer omfattande måste du informera kunden och inhämta godkännande innan arbetet påbörjas eller utökas (Konsumenttjänstlagen 32 §).')}
          </p>
          <ul className="list-disc ml-4 space-y-1 text-xs">
            <li>{t('Ange alltid pris inklusive moms.')}</li>
            <li>{t('Tydliggör vad som ingår och vad som kan tillkomma.')}</li>
            <li>{t('Dokumentera avvikelser och tillägg skriftligt eller via e-post.')}</li>
            <li>{t('Erbjud kunden att avböja om priset blir väsentligt högre.')}</li>
          </ul>
          <p className="text-xs text-blue-700 pt-1 border-t border-blue-200">
            {t('Lockpriser och vilseledande prisinformation leder till avstängning från plattformen.')}
          </p>
        </div>
      </div>
    </div>
  )
}
