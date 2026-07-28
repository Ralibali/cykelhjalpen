import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Shield, FileText, Scale } from 'lucide-react'

interface CustomerTermsProps {
  onAccept: (accepted: boolean) => void
  accepted: boolean
}

export function CustomerTerms({ onAccept, accepted }: CustomerTermsProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Dina rättigheter som kund</p>
          <p className="mt-1">
            Cykelhjälpen förmedlar kontakt mellan dig och verkstäder. Vi är inte part i det avtal 
            som sedan sluts mellan dig och verkstaden. Allt enligt svensk konsumentskyddslag.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox 
          id="customer-terms" 
          checked={accepted}
          onCheckedChange={(checked) => onAccept(checked === true)}
        />
        <label htmlFor="customer-terms" className="text-sm text-gray-700 cursor-pointer">
          Jag har läst och godkänner{' '}
          <button 
            type="button"
            onClick={() => setOpen(true)}
            className="text-blue-600 underline hover:text-blue-800 font-medium"
          >
            användarvillkoren och offertvillkoren
          </button>
        </label>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Användarvillkor för kunder</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6 text-sm text-gray-700">
                <section>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    1. Om Cykelhjälpen
                  </h3>
                  <p className="mt-2">
                    Cykelhjälpen Sverige AB (org.nr 559XXX-XXXX) är en digital plattform som förmedlar 
                    kontakt mellan cykelägare ("Kunden") och cykelverkstäder ("Verkstaden"). 
                    Vi är <strong>inte part i det avtal</strong> som sluts mellan Kunden och Verkstaden. 
                    Vår roll är enbart att förmedla kontakten och hantera betalning för lead-credits.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    2. Offerten är ett estimat – inte ett slutpris
                  </h3>
                  <p className="mt-2">
                    Den offert du får via Cykelhjälpen är baserad på den beskrivning du lämnat om 
                    skadan/felet. Offerten är ett <strong>uppskattat pris</strong> och inte ett bindande 
                    slutpris. Slutpriset kan variera beroende på:
                  </p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Faktisk omfattning av skada när verkstaden undersökt cykeln</li>
                    <li>Eventuella dolda fel som inte kunde förutses</li>
                    <li>Extra arbetstid eller reservdelar utöver det ursprungliga estimatet</li>
                    <li>Prisändringar hos leverantörer av reservdelar</li>
                  </ul>
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800">
                      <strong>Viktigt:</strong> Verkstaden är enligt svensk lag skyldig att informera dig 
                      och be om ditt godkännande innan arbetet påbörjas eller utökas om slutpriset 
                      väsentligt avviker från offerten (Konsumenttjänstlagen 32 §).
                    </p>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">3. Dina rättigheter enligt svensk lag</h3>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Rätt till tydlig prisinformation:</strong> Verkstaden ska ange pris inklusive moms.</li>
                    <li><strong>Rätt att avböja:</strong> Om slutpriset väsentligt överstiger offerten har du rätt att avböja reparationen.</li>
                    <li><strong>Reklamationsrätt:</strong> Du har rätt att reklamera felaktigt arbete inom 3 år (2 år för privatpersoner vid köp av vara, 3 år för tjänster).</li>
                    <li><strong>Ångerrätt:</strong> Vid distansavtal (t.ex. om verkstaden hämtar cykeln) har du 14 dagars ångerrätt enligt distans- och hemförsäljningslagen, med vissa undantag för snabbt utförda tjänster.</li>
                    <li><strong>GDPR:</strong> Dina personuppgifter hanteras enligt dataskyddsförordningen. Se vår integritetspolicy.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">4. Betalning till verkstaden</h3>
                  <p className="mt-2">
                    All betalning för reparationer sker direkt till verkstaden, inte till Cykelhjälpen. 
                    Cykelhjälpen tar endast betalt av verkstaden för lead-credits (förmedlingsavgift). 
                    Vi ansvarar inte för verkstadens arbete, garantier eller återbetalningar.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">5. Tvister</h3>
                  <p className="mt-2">
                    Vid tvist med verkstaden rekommenderar vi först att kontakta verkstaden direkt. 
                    Lyckas inte det kan du vända dig till Allmänna reklamationsnämnden (ARN) eller 
                    Konsumentverket. Tvist med Cykelhjälpen ska i första hand lösas genom förhandling, 
                    i andra hand vid allmän domstol enligt svensk rätt.
                  </p>
                </section>

                <p className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                  Senast uppdaterad: 2026-07-28. Vid ändringar meddelas du via e-post.
                </p>
              </div>
            </ScrollArea>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Jag har läst villkoren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
