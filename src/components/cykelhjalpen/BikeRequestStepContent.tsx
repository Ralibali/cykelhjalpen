import type { ChangeEvent } from 'react'
import { Camera, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import Turnstile from './Turnstile'
import { CYKEL_CITIES, getCykelCity } from '@/lib/cykelCities'
import { BIKE_TYPES, REPAIR_CATEGORIES, URGENCY_OPTIONS, type BikeRequestFormState } from '@/lib/bikeRequestForm'

interface Props {
  step: number
  form: BikeRequestFormState
  files: File[]
  imagePreviews: { file: File; url: string }[]
  turnstileResetKey: number
  update: <K extends keyof BikeRequestFormState>(key: K, value: BikeRequestFormState[K]) => void
  setStep: (step: number) => void
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (file: File) => void
  onTurnstileVerify: (token: string) => void
  onTurnstileExpire: () => void
}

const ChoiceButton = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`text-left px-4 py-3 border-2 border-foreground rounded-md transition ${selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
  >
    {children}
  </button>
)

const BikeRequestStepContent = ({
  step,
  form,
  files,
  imagePreviews,
  turnstileResetKey,
  update,
  setStep,
  onFiles,
  onRemoveFile,
  onTurnstileVerify,
  onTurnstileExpire,
}: Props) => {
  const selectedCity = getCykelCity(form.city)

  if (step === 0) {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-base">Vilken typ av cykel behöver hjälp?</Label>
          <p className="text-sm text-muted-foreground mt-1">Välj det alternativ som ligger närmast.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BIKE_TYPES.map((type) => (
            <ChoiceButton key={type} selected={form.bike_type === type} onClick={() => update('bike_type', type)}>{type}</ChoiceButton>
          ))}
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <div>
            <Label className="text-base">Vad behöver du hjälp med?</Label>
            <p className="text-sm text-muted-foreground mt-1">Du behöver inte själv veta exakt vad som är fel.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REPAIR_CATEGORIES.map((category) => (
              <ChoiceButton key={category} selected={form.repair_category === category} onClick={() => update('repair_category', category)}>{category}</ChoiceButton>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="desc">Beskriv problemet</Label>
          <Textarea id="desc" rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Exempel: Bakhjulet vinglar och bromsen tar dåligt. Problemet började i går." maxLength={2000} />
          <p className="text-xs text-muted-foreground mt-1">Minst tio tecken · {form.description.length}/2000</p>
        </div>

        <div className="space-y-3 border-t pt-5">
          <div>
            <Label>Bilder <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
            <p className="text-sm text-muted-foreground mt-1">En bild kan ge snabbare och mer träffsäkra prisförslag.</p>
          </div>
          <label className="sticker bg-muted/50 p-5 flex items-center justify-center gap-3 cursor-pointer hover:bg-muted">
            <Camera className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">{files.length ? 'Lägg till fler bilder' : 'Välj upp till fyra bilder'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onFiles} />
          </label>
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {imagePreviews.map(({ file, url }) => (
                <div key={`${file.name}-${file.lastModified}-${file.size}`} className="relative aspect-square sticker bg-muted overflow-hidden">
                  <img src={url} alt="Förhandsvisning av vald cykelbild" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => onRemoveFile(file)} className="absolute top-1 right-1 rounded-full bg-background/90 p-1 shadow" aria-label={`Ta bort ${file.name}`}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-5">
        <div>
          <Label className="text-base">Vilken stad finns cykeln i?</Label>
          <p className="text-sm text-muted-foreground mt-1">Ärendet visas bara för verkstäder i den valda staden.</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {CYKEL_CITIES.map((city) => (
              <ChoiceButton key={city.name} selected={form.city === city.name} onClick={() => update('city', city.name)}>
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{city.name}</span>
              </ChoiceButton>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base">När behöver du hjälp?</Label>
          <RadioGroup value={form.urgency} onValueChange={(value) => update('urgency', value)} className="mt-3">
            {URGENCY_OPTIONS.map((urgency) => (
              <div key={urgency.value} className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value={urgency.value} id={urgency.value} />
                <Label htmlFor={urgency.value} className="flex-1 cursor-pointer">{urgency.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="area">Område <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
            <Input id="area" value={form.area} onChange={(event) => update('area', event.target.value)} placeholder={selectedCity.exampleArea} />
          </div>
          <div>
            <Label htmlFor="postcode">Postnummer <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
            <Input id="postcode" inputMode="numeric" autoComplete="postal-code" value={form.postcode} onChange={(event) => update('postcode', event.target.value)} placeholder="Exempel: 583 30" />
          </div>
        </div>

        <div className="space-y-3 border-t pt-5">
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox id="drop" checked={form.can_drop_off} onCheckedChange={(value) => update('can_drop_off', value === true)} />
            <Label htmlFor="drop" className="cursor-pointer leading-snug">Jag kan lämna in cykeln på verkstaden</Label>
          </div>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox id="pick" checked={form.wants_pickup} onCheckedChange={(value) => update('wants_pickup', value === true)} />
            <Label htmlFor="pick" className="cursor-pointer leading-snug">Jag vill helst att verkstaden hämtar cykeln</Label>
          </div>
          {!form.can_drop_off && !form.wants_pickup && <p className="text-sm text-destructive">Välj minst ett av alternativen ovan.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-muted/60 p-4 text-sm">
        <div className="font-semibold mb-2">Din förfrågan</div>
        <div className="grid sm:grid-cols-2 gap-2 text-muted-foreground">
          <button type="button" onClick={() => setStep(0)} className="text-left hover:text-foreground">Cykel: <span className="text-foreground font-medium">{form.bike_type}</span></button>
          <button type="button" onClick={() => setStep(1)} className="text-left hover:text-foreground">Problem: <span className="text-foreground font-medium">{form.repair_category}</span></button>
          <button type="button" onClick={() => setStep(2)} className="text-left hover:text-foreground">Stad: <span className="text-foreground font-medium">{form.city}</span></button>
        </div>
      </div>

      <div><Label htmlFor="name">Namn</Label><Input id="name" autoComplete="name" value={form.customer_name} onChange={(event) => update('customer_name', event.target.value)} /></div>
      <div>
        <Label htmlFor="email">E-post</Label>
        <Input id="email" type="email" inputMode="email" autoComplete="email" value={form.customer_email} onChange={(event) => update('customer_email', event.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">Vi mejlar en personlig länk där du ser och jämför svaren.</p>
      </div>
      <div><Label htmlFor="phone">Telefon <span className="font-normal text-muted-foreground">(valfritt)</span></Label><Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.customer_phone} onChange={(event) => update('customer_phone', event.target.value)} /></div>

      <div className="flex items-start gap-3 rounded-md border p-3">
        <Checkbox id="consent" checked={form.consent} onCheckedChange={(value) => update('consent', value === true)} />
        <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
          Jag godkänner att uppgifterna delas med anslutna cykelverkstäder i {form.city} som vill lämna offert, enligt{' '}
          <a href="/integritetspolicy" target="_blank" rel="noreferrer" className="underline">integritetspolicyn</a>.
        </Label>
      </div>

      <div className="border-t pt-5">
        <p className="text-sm font-medium mb-2">Säkerhetskontroll</p>
        <Turnstile onVerify={onTurnstileVerify} onExpire={onTurnstileExpire} resetKey={turnstileResetKey} />
      </div>

      <p className="text-xs text-center text-muted-foreground">Det kostar ingenting och du förbinder dig inte att välja någon verkstad.</p>
    </div>
  )
}

export default BikeRequestStepContent
