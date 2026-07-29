import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Briefcase, Scale, AlertTriangle, FileText } from 'lucide-react'

interface WorkshopTermsProps {
  onAccept: (accepted: boolean) => void
  accepted: boolean
}

export function WorkshopTerms({ onAccept, accepted }: WorkshopTermsProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <Briefcase className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-800">
          <p className="font-medium">Plattformsavtal för verkstäder</p>
          <p className="mt-1">
            Genom att registrera dig godkänner du att följa svensk lag, inklusive konsumentskyddslagen, 
            marknadsföringslagen och prisinformationslagen. Cykelhjälpen är en förmedlare.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox 
          id="workshop-terms" 
          checked={accepted}
          onCheckedChange={(checked) => onAccept(checked === true)}
        />
        <label htmlFor="workshop-terms" className="text-sm text-gray-700 cursor-pointer">
          Jag godkänner{' '}
          <button 
            type="button"
            onClick={() => setOpen(true)}
            className="text-indigo-600 underline hover:text-indigo-800 font-medium"
          >
            plattformsavtalet och åtar mig att följa svensk lag
          </button>
        </label>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Plattformsavtal för verkstäder</h2>
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
                    1. Parter och plattformens roll
                  </h3>
                  <p className="mt-2">
                    Detta avtal sluts mellan Aurora Media AB (org.nr 559272-0220), som driver Cykelhjälpen 
                    ("Plattformen"), och din verkstad 
                    ("Verkstaden"). Plattformen tillhandahåller en digital marknadsplats där Verkstaden 
                    kan ta emot förfrågningar från cykelägare ("Kunden"). Plattformen är 
                    <strong> inte part i det avtal</strong> som sluts mellan Verkstaden och Kunden.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    2. Prisinformation och offertvillkor
                  </h3>
                  <p className="mt-2">
                    Verkstaden åtar sig att:
                  </p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Ange priser inklusive moms i alla offerter.</li>
                    <li>Tydligt informera Kunden om att offerten är ett <strong>uppskattat pris</strong> och att slutpriset kan variera.</li>
                    <li>Innan arbetet påbörjas eller utökas, informera Kunden och inhämta godkännande om slutpriset väsentligt avviker från offerten (Konsumenttjänstlagen 32 §).</li>
                    <li>Inte ta ut dolda avgifter eller påslag som inte kommunicerats tydligt.</li>
                    <li>Erbjuda Kunden att avböja fortsatt arbete om priset väsentligt överstiger offerten.</li>
                  </ul>
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">
                      <strong>Oacceptabelt:</strong> Att ge en låg offert för att locka kunden och sedan 
                      ta ut ett väsentligt högre pris utan förvarning. Detta kan utgöra vilseledande 
                      marknadsföring enligt marknadsföringslagen (ML 8 §, 10 §).
                    </p>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">3. Konsumentskydd och reklamationer</h3>
                  <p className="mt-2">
                    Verkstaden ska följa svensk konsumentskyddslagstiftning, inklusive:
                  </p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Konsumenttjänstlagen:</strong> Verkstaden ansvarar för att arbetet utförs fackmannamässigt och att material av god kvalitet används.</li>
                    <li><strong>Reklamationsrätt:</strong> Kunden har rätt att reklamera fel inom 3 år för tjänster (2 år för varor).</li>
                    <li><strong>Garanti:</strong> Verkstaden ska tydligt ange vilken garanti som gäller på utfört arbete och reservdelar.</li>
                    <li><strong>Kvitto/faktura:</strong> Verkstaden ska alltid tillhandahålla kvitto eller faktura på utfört arbete.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">4. Förbjudet beteende</h3>
                  <p className="mt-2">Följande är strikt förbjudet på plattformen:</p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Vilseledande prisinformation eller "lockpriser" utan avsikt att utföra arbetet till det priset.</li>
                    <li>Att kontakta Kunden utanför plattformen för att undvika lead-avgiften (cirkumvention).</li>
                    <li>Att sälja vidare Kundens personuppgifter till tredje part.</li>
                    <li>Att diskriminera kunder eller vägra service på olagliga grunder.</li>
                    <li>Att utföra arbete utan Kundens godkännande (s.k. påtvingade tillval).</li>
                  </ul>
                  <p className="mt-2">
                    Vid brott mot dessa regler förbehåller sig Plattformen rätten att stänga av Verkstaden 
                    permanent och kräva ersättning för skada.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">5. Lead-credits och betalning</h3>
                  <p className="mt-2">
                    Verkstaden betalar en förmedlingsavgift (lead-credit) för varje svar på en kundförfrågan. 
                    Nya verkstäder får 2 gratis leads. Därefter kostar varje lead 50 kr exklusive moms (62,50 kr inklusive moms). 
                    Verkstaden kan köpa credits i förväg. Credits som inte förbrukas sparas på kontot.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">6. Ansvarsbegränsning</h3>
                  <p className="mt-2">
                    Plattformen ansvarar inte för:
                  </p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Verkstadens arbete, kvalitet eller utförande.</li>
                    <li>Tvister mellan Verkstaden och Kunden.</li>
                    <li>Förlust av data eller avbrott i tjänsten som ligger utanför Plattformens rimliga kontroll.</li>
                  </ul>
                  <p className="mt-2">
                    Plattformens totala ansvar är begränsat till det belopp Verkstaden betalat i 
                    lead-credits under de senaste 12 månaderna.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">7. Dataskydd (GDPR)</h3>
                  <p className="mt-2">
                    Verkstaden är personuppgiftsbiträde i förhållande till Kundens uppgifter som förmedlas 
                    via plattformen. Verkstaden får endast använda uppgifterna för att fullfölja reparationen 
                    och ska radera dem när de inte längre behövs. Se vår DPA (Data Processing Agreement) 
                    för fullständiga villkor.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">8. Avtalets löptid och uppsägning</h3>
                  <p className="mt-2">
                    Avtalet gäller tills vidare. Båda parter kan säga upp avtalet med 30 dagars uppsägningstid. 
                    Plattformen kan omedelbart stänga av Verkstaden vid allvarligt avtalsbrott. Vid avslut 
                    återbetalas ej förbrukade credits inte, om inte annat avtalats.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900">9. Tillämplig lag och tvistlösning</h3>
                  <p className="mt-2">
                    Detta avtal ska tolkas och tillämpas i enlighet med svensk lag. Tvist ska i första hand 
                    lösas genom förhandling. Kan tvist inte lösas genom förhandling, ska den avgöras av 
                    allmän domstol med Stockholms tingsrätt som första instans.
                  </p>
                </section>

                <p className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                  Senast uppdaterad: 2026-07-28. Verkstaden meddelas om väsentliga ändringar via e-post 
                  minst 30 dagar innan ändringarna träder i kraft.
                </p>
              </div>
            </ScrollArea>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Jag har läst avtalet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
