import type { ChangeEvent, ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Baby,
  BatteryCharging,
  Bike,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  CircleDot,
  Cog,
  Disc3,
  Flame,
  HelpCircle,
  LifeBuoy,
  Lightbulb,
  MapPin,
  Mountain,
  Package,
  Route,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Turnstile from './Turnstile'
import { CYKEL_CITIES, getCykelCity } from '@/lib/cykelCities'
import { BIKE_TYPES, REPAIR_CATEGORIES, URGENCY_OPTIONS, type BikeRequestFormState } from '@/lib/bikeRequestForm'

export const BIKE_TYPE_ICONS: Record<string, LucideIcon> = {
  'Vanlig cykel': Bike,
  'Elcykel': Zap,
  'Mountainbike': Mountain,
  'Racercykel': Route,
  'Lådcykel': Package,
  'Barncykel': Baby,
  'Annat': HelpCircle,
}

export const REPAIR_CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Punktering / däckbyte': CircleDot,
  'Bromsar': Disc3,
  'Växlar / kedja': Cog,
  'Service / genomgång': Wrench,
  'Elcykel-problem': BatteryCharging,
  'Hjul / ekrar': LifeBuoy,
  'Lyse / elektronik': Lightbulb,
  'Annat': HelpCircle,
}

export const URGENCY_ICONS: Record<string, LucideIcon> = {
  asap: Flame,
  this_week: CalendarDays,
  flexible: CalendarCheck,
}

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
  onBikeTypeSelect?: (type: string) => void
}

const ChoiceCard = ({
  selected,
  onClick,
  icon: Icon,
  children,
  compact = false,
}: {
  selected: boolean
  onClick: () => void
  icon?: LucideIcon
  children: ReactNode
  compact?: boolean
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    whileTap={{ scale: 0.97 }}
    className={`group relative text-left rounded-2xl border-2 transition-all duration-200 ${
      compact ? 'px-4 py-3' : 'px-4 py-4'
    } ${
      selected
        ? 'border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_hsl(var(--ink))] -translate-y-0.5'
        : 'border-border bg-background hover:border-foreground hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--ink)/0.25)]'
    }`}
  >
    <span className="flex items-center gap-3">
      {Icon && (
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-xl p-2 transition-colors ${
            selected ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-muted text-primary group-hover:bg-primary/10'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span className={`font-medium leading-snug ${compact ? 'text-sm' : 'text-sm sm:text-base'}`}>{children}</span>
      {selected && (
        <motion.span
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          className="ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </motion.span>
      )}
    </span>
  </motion.button>
)

const StepLabel = ({ children, hint }: { children: ReactNode; hint?: string }) => (
  <div>
    <Label className="font-display text-xl">{children}</Label>
    {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
  </div>
)

const stepTransition = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
}

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
  onBikeTypeSelect,
}: Props) => {
  const selectedCity = getCykelCity(form.city)

  if (step === 0) {
    return (
      <motion.div key="step-0" {...stepTransition} className="space-y-5">
        <StepLabel hint="Välj det alternativ som ligger närmast – verkstaden hjälper dig med resten.">
          Vilken typ av cykel behöver hjälp?
        </StepLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BIKE_TYPES.map((type) => (
            <ChoiceCard
              key={type}
              selected={form.bike_type === type}
              onClick={() => (onBikeTypeSelect ? onBikeTypeSelect(type) : update('bike_type', type))}
              icon={BIKE_TYPE_ICONS[type] || Bike}
            >
              {type}
            </ChoiceCard>
          ))}
        </div>
      </motion.div>
    )
  }

  if (step === 1) {
    return (
      <motion.div key="step-1" {...stepTransition} className="space-y-6">
        <div className="space-y-4">
          <StepLabel hint="Du behöver inte själv veta exakt vad som är fel.">
            Vad behöver du hjälp med?
          </StepLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REPAIR_CATEGORIES.map((category) => (
              <ChoiceCard
                key={category}
                compact
                selected={form.repair_category === category}
                onClick={() => update('repair_category', category)}
                icon={REPAIR_CATEGORY_ICONS[category] || Wrench}
              >
                {category}
              </ChoiceCard>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc" className="font-display text-lg">Beskriv problemet</Label>
          <Textarea
            id="desc"
            rows={4}
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Exempel: Bakhjulet vinglar och bromsen tar dåligt. Problemet började i går."
            maxLength={2000}
            className="rounded-xl border-2 focus-visible:ring-accent"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={form.description.trim().length >= 10 ? 'text-[hsl(var(--brand-mint))]' : ''}>
              {form.description.trim().length >= 10 ? '✓ Tillräckligt beskrivet' : 'Minst tio tecken'}
            </span>
            <span>{form.description.length}/2000</span>
          </div>
        </div>

        <div className="space-y-4 border-t-2 border-dashed border-border pt-6">
          <StepLabel hint="En bild kan ge snabbare och mer träffsäkra prisförslag.">
            Bilder <span className="font-normal text-sm text-muted-foreground">(valfritt)</span>
          </StepLabel>
          <label className="group flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/40 p-6 transition hover:border-foreground hover:bg-muted">
            <span className="inline-flex items-center justify-center rounded-xl bg-background p-2.5 shadow-sm transition group-hover:scale-110">
              <Camera className="h-5 w-5 text-primary" />
            </span>
            <span className="text-sm font-medium">
              {files.length ? `Lägg till fler bilder (${files.length} valda)` : 'Välj upp till fyra bilder'}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onFiles} />
          </label>
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imagePreviews.map(({ file, url }) => (
                <motion.div
                  key={`${file.name}-${file.lastModified}-${file.size}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square overflow-hidden rounded-2xl border-2 border-foreground shadow-[3px_3px_0_hsl(var(--ink))]"
                >
                  <img src={url} alt="Förhandsvisning av vald cykelbild" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveFile(file)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-background/95 p-1.5 shadow transition hover:scale-110 hover:bg-destructive hover:text-destructive-foreground"
                    aria-label={`Ta bort ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (step === 2) {
    return (
      <motion.div key="step-2" {...stepTransition} className="space-y-6">
        <div className="space-y-4">
          <StepLabel hint="Ärendet matchas endast med verkstäder i den valda staden.">
            Vilken stad finns cykeln i?
          </StepLabel>
          <div className="grid grid-cols-2 gap-3">
            {CYKEL_CITIES.map((city) => (
              <ChoiceCard
                key={city.name}
                selected={form.city === city.name}
                onClick={() => update('city', city.name)}
                icon={MapPin}
              >
                {city.name}
              </ChoiceCard>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <StepLabel>När behöver du hjälp?</StepLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {URGENCY_OPTIONS.map((urgency) => (
              <ChoiceCard
                key={urgency.value}
                compact
                selected={form.urgency === urgency.value}
                onClick={() => update('urgency', urgency.value)}
                icon={URGENCY_ICONS[urgency.value]}
              >
                {urgency.label}
              </ChoiceCard>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="area">Område <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
            <Input
              id="area"
              value={form.area}
              onChange={(event) => update('area', event.target.value)}
              placeholder={selectedCity.exampleArea}
              className="rounded-xl border-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postcode">Postnummer <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
            <Input
              id="postcode"
              inputMode="numeric"
              autoComplete="postal-code"
              value={form.postcode}
              onChange={(event) => update('postcode', event.target.value)}
              placeholder="Exempel: 583 30"
              className="rounded-xl border-2"
            />
          </div>
        </div>

        <div className="space-y-3 border-t-2 border-dashed border-border pt-6">
          <StepLabel>Hur får verkstaden tag i cykeln?</StepLabel>
          <button
            type="button"
            onClick={() => update('can_drop_off', !form.can_drop_off)}
            aria-pressed={form.can_drop_off}
            className={`w-full flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
              form.can_drop_off ? 'border-foreground bg-primary/5 shadow-[3px_3px_0_hsl(var(--ink)/0.3)]' : 'border-border hover:border-foreground'
            }`}
          >
            <Checkbox
              id="drop"
              checked={form.can_drop_off}
              onCheckedChange={(value) => update('can_drop_off', value === true)}
              onClick={(event) => event.stopPropagation()}
              className="mt-0.5"
            />
            <Label htmlFor="drop" className="cursor-pointer leading-snug" onClick={(event) => event.stopPropagation()}>
              Jag kan lämna in cykeln på verkstaden
            </Label>
          </button>
          <button
            type="button"
            onClick={() => update('wants_pickup', !form.wants_pickup)}
            aria-pressed={form.wants_pickup}
            className={`w-full flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
              form.wants_pickup ? 'border-foreground bg-primary/5 shadow-[3px_3px_0_hsl(var(--ink)/0.3)]' : 'border-border hover:border-foreground'
            }`}
          >
            <Checkbox
              id="pick"
              checked={form.wants_pickup}
              onCheckedChange={(value) => update('wants_pickup', value === true)}
              onClick={(event) => event.stopPropagation()}
              className="mt-0.5"
            />
            <Label htmlFor="pick" className="cursor-pointer leading-snug" onClick={(event) => event.stopPropagation()}>
              Jag vill helst att verkstaden hämtar cykeln
            </Label>
          </button>
          {!form.can_drop_off && !form.wants_pickup && (
            <p className="text-sm text-destructive font-medium">Välj minst ett av alternativen ovan.</p>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div key="step-3" {...stepTransition} className="space-y-6">
      <div className="rounded-2xl border-2 border-foreground bg-[hsl(var(--brand-dark))] p-5 text-background shadow-[4px_4px_0_hsl(var(--ink)/0.35)]">
        <div className="text-xs uppercase tracking-[0.15em] text-background/60 font-semibold mb-3">Din förfrågan</div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: 'Cykel', value: form.bike_type, icon: BIKE_TYPE_ICONS[form.bike_type] || Bike, step: 0 },
            { label: 'Problem', value: form.repair_category, icon: REPAIR_CATEGORY_ICONS[form.repair_category] || Wrench, step: 1 },
            { label: 'Stad', value: form.city, icon: MapPin, step: 2 },
          ].map(({ label, value, icon: Icon, step: targetStep }) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(targetStep)}
              className="group rounded-xl bg-background/10 p-3 text-left transition hover:bg-background/20"
            >
              <span className="flex items-center gap-2 text-xs text-background/60">
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
              <span className="mt-1 block font-medium leading-snug group-hover:underline">{value}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Namn</Label>
          <Input
            id="name"
            autoComplete="name"
            value={form.customer_name}
            onChange={(event) => update('customer_name', event.target.value)}
            placeholder="Ditt namn"
            className="rounded-xl border-2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.customer_phone}
            onChange={(event) => update('customer_phone', event.target.value)}
            placeholder="070–123 45 67"
            className="rounded-xl border-2"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={form.customer_email}
          onChange={(event) => update('customer_email', event.target.value)}
          placeholder="din@epost.se"
          className="rounded-xl border-2"
        />
        <p className="text-xs text-muted-foreground">Vi mejlar en personlig länk där du ser och jämför svaren.</p>
      </div>

      <button
        type="button"
        onClick={() => update('consent', !form.consent)}
        aria-pressed={form.consent}
        className={`w-full flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
          form.consent ? 'border-foreground bg-primary/5 shadow-[3px_3px_0_hsl(var(--ink)/0.3)]' : 'border-border hover:border-foreground'
        }`}
      >
        <Checkbox
          id="consent"
          checked={form.consent}
          onCheckedChange={(value) => update('consent', value === true)}
          onClick={(event) => event.stopPropagation()}
          className="mt-0.5"
        />
        <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer" onClick={(event) => event.stopPropagation()}>
          Jag godkänner att uppgifterna delas med anslutna cykelverkstäder i {form.city} som vill lämna offert, enligt{' '}
          <a href="/integritetspolicy" target="_blank" rel="noreferrer" className="underline font-medium" onClick={(event) => event.stopPropagation()}>
            integritetspolicyn
          </a>.
        </Label>
      </button>

      <div className="border-t-2 border-dashed border-border pt-6">
        <p className="text-sm font-medium mb-3">Säkerhetskontroll</p>
        <Turnstile onVerify={onTurnstileVerify} onExpire={onTurnstileExpire} resetKey={turnstileResetKey} />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Det kostar ingenting och du förbinder dig inte att välja någon verkstad.
      </p>
    </motion.div>
  )
}

export default BikeRequestStepContent
